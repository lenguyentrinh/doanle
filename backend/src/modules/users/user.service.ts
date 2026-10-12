import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { Types } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Address, AddressDocument } from './entities/address.entity';
import { SignupDto } from '../auth/dto/signup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { runInTransaction } from '../../common/database/transaction';
import { isObjectIdString } from '../../common/pipes/parse-object-id.pipe';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Address.name)
    private addressModel: Model<Address>,
    @InjectConnection()
    private connection: Connection,
  ) {}

  create(dto: SignupDto): Promise<UserDocument> {
    // `birthDate` was a MySQL DATE column — keep the YYYY-MM-DD shape.
    const birthDate = dto.birthDate ? dto.birthDate.slice(0, 10) : null;
    // Model.create() (not `new`) so the unique email index violation surfaces
    // as an E11000 error the auth service maps to a 409 / resume-OTP flow.
    return this.userModel.create({
      userName: dto.userName,
      email: dto.email,
      password: dto.password,
      birthDate,
      phoneNumber: dto.phoneNumber ?? null,
    });
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() });
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!isObjectIdString(id)) return null;
    return this.userModel.findById(id);
  }

  async setEmailOTP(id: string, otp: string, expires: Date) {
    return this.userModel.updateOne(
      { _id: id },
      {
        $set: {
          emailOtpCode: otp,
          emailOtpExpires: expires,
          emailOtpAttempts: 0,
        },
      },
    );
  }

  // Consumes the OTP (single-use) on success. Only for flows where this is
  // the terminal step and nothing downstream needs to check the code again —
  // e.g. signup email verification (`/verify-email`). The forgot-password
  // flow has a second server-side check in AuthService#resetPassword, so it
  // must use the non-consuming `checkEmailOtp` below instead, or that second
  // check would always fail against an already-cleared code.
  async verifyEmailOtp(
    email: string,
    otp: string,
  ): Promise<UserDocument | null> {
    const user = await this.checkEmailOtp(email, otp);
    if (!user) return null;

    await this.clearEmailOtp(user.id);
    return user;
  }

  // Validates the OTP (tracking failed attempts / lockout the same as
  // verifyEmailOtp) but leaves it in place for a later step to consume.
  async checkEmailOtp(
    email: string,
    otp: string,
  ): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    if (!user.emailOtpCode || !user.emailOtpExpires) return null;
    if (user.emailOtpExpires < new Date()) return null;

    const isValid = user.emailOtpCode === otp;
    if (!isValid) {
      // Atomic increment so concurrent wrong guesses can't undercount.
      const updated = await this.userModel.findOneAndUpdate(
        { _id: user._id },
        { $inc: { emailOtpAttempts: 1 } },
        { returnDocument: 'after' },
      );
      if ((updated?.emailOtpAttempts ?? 0) >= 5) {
        await this.clearEmailOtp(user.id);
      }
      return null;
    }

    return user;
  }

  async updatePassword(id: string, newPassword: string) {
    return this.userModel.updateOne(
      { _id: id },
      { $set: { password: newPassword } },
    );
  }

  async markEmailVerified(id: string) {
    return this.userModel.updateOne(
      { _id: id },
      { $set: { emailVerified: true } },
    );
  }

  // Null out the email OTP so it cannot be reused (single-use after a
  // successful password reset).
  async clearEmailOtp(id: string) {
    return this.userModel.updateOne(
      { _id: id },
      {
        $set: {
          emailOtpCode: null,
          emailOtpExpires: null,
          emailOtpAttempts: 0,
        },
      },
    );
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  // Returns a sanitized user (the same shape as GET /auth/me's allow-list) so
  // sensitive fields (password, OTP/reset tokens) never leak to the client.
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (dto.userName !== undefined) user.userName = dto.userName;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;

    const saved = await user.save();
    return {
      id: saved.id,
      userName: saved.userName,
      email: saved.email,
      phoneNumber: saved.phoneNumber ?? null,
      role: saved.role,
    };
  }

  // ── Addresses ───────────────────────────────────────────────────────────────

  getAddresses(userId: string): Promise<AddressDocument[]> {
    return this.addressModel.find({ userId }).sort({ _id: 1 });
  }

  // Wrapped in a transaction: the read-then-write on `isDefault` must be
  // atomic, otherwise concurrent requests can leave 0 or 2 default addresses.
  async addAddress(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressDocument> {
    return runInTransaction(this.connection, async (session) => {
      // Serialize concurrent address writes for this user (see
      // lockUserAddresses) so two requests can't both see count < 2 and both
      // insert, nor both promote themselves to default.
      await this.lockUserAddresses(userId, session);

      const existingCount = await this.addressModel
        .countDocuments({ userId })
        .session(session);
      if (existingCount >= 2) {
        throw new ConflictException('Chỉ được lưu tối đa 2 địa chỉ');
      }

      // The first address is default; an explicit isDefault also wins.
      const makeDefault = dto.isDefault === true || existingCount === 0;
      if (makeDefault) {
        await this.addressModel.updateMany(
          { userId },
          { $set: { isDefault: false } },
          { session },
        );
      }

      const [address] = await this.addressModel.create(
        [
          {
            firstName: dto.firstName,
            lastName: dto.lastName,
            street: dto.street,
            city: dto.city,
            isDefault: makeDefault,
            userId: new Types.ObjectId(userId),
          },
        ],
        { session },
      );
      return address;
    });
  }

  async editAddress(
    userId: string,
    addressId: string,
    dto: CreateAddressDto,
  ): Promise<AddressDocument> {
    return runInTransaction(this.connection, async (session) => {
      await this.lockUserAddresses(userId, session);
      const address = await this.findOwnedAddress(userId, addressId, session);
      const wasDefault = address.isDefault;

      if (dto.isDefault === true) {
        await this.addressModel.updateMany(
          { userId },
          { $set: { isDefault: false } },
          { session },
        );
      }

      // Written with an explicit update (not doc.save()): the loaded document
      // still carries its pre-reset isDefault, so a change-tracked save would
      // skip the write and leave the user with no default.
      const update: Partial<Address> = {
        firstName: dto.firstName,
        lastName: dto.lastName,
        street: dto.street,
        city: dto.city,
      };
      if (dto.isDefault !== undefined) update.isDefault = dto.isDefault;

      const saved = await this.addressModel.findOneAndUpdate(
        { _id: address._id },
        { $set: update },
        { returnDocument: 'after', session },
      );
      if (!saved) throw new NotFoundException('Không tìm thấy địa chỉ');

      // Never leave the user with zero default addresses: if this address
      // was the default and no longer is, promote the oldest remaining one.
      if (wasDefault && !saved.isDefault) {
        await this.promoteFallbackDefault(userId, addressId, session);
      }

      return saved;
    });
  }

  async setDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<AddressDocument[]> {
    return runInTransaction(this.connection, async (session) => {
      await this.lockUserAddresses(userId, session);
      const address = await this.findOwnedAddress(userId, addressId, session);

      await this.addressModel.updateMany(
        { userId },
        { $set: { isDefault: false } },
        { session },
      );
      await this.addressModel.updateOne(
        { _id: address._id },
        { $set: { isDefault: true } },
        { session },
      );

      return this.addressModel
        .find({ userId })
        .sort({ _id: 1 })
        .session(session);
    });
  }

  async removeAddress(
    userId: string,
    addressId: string,
  ): Promise<{ message: string }> {
    return runInTransaction(this.connection, async (session) => {
      await this.lockUserAddresses(userId, session);
      const address = await this.findOwnedAddress(userId, addressId, session);
      const wasDefault = address.isDefault;
      await address.deleteOne({ session });

      // Never leave the user with zero default addresses: if the removed
      // address was the default and another remains, promote the oldest one.
      if (wasDefault) {
        await this.promoteFallbackDefault(userId, addressId, session);
      }

      return { message: 'Đã xóa địa chỉ' };
    });
  }

  // Promotes the oldest remaining address (excluding the one just edited/
  // removed) to default. No-op if the user has no other addresses.
  private async promoteFallbackDefault(
    userId: string,
    excludeAddressId: string,
    session: ClientSession,
  ): Promise<void> {
    const fallback = await this.addressModel
      .findOne({ userId, _id: { $ne: excludeAddressId } })
      .sort({ _id: 1 })
      .session(session);
    if (fallback) {
      await this.addressModel.updateOne(
        { _id: fallback._id },
        { $set: { isDefault: true } },
        { session },
      );
    }
  }

  // MongoDB has no SELECT ... FOR UPDATE. Writing to the owning user document
  // inside the transaction makes two concurrent address mutations for the
  // same user conflict (WriteConflict, retried by the driver), which restores
  // the serialization the old pessimistic lock on the address rows provided.
  private async lockUserAddresses(
    userId: string,
    session: ClientSession,
  ): Promise<void> {
    const res = await this.userModel.updateOne(
      { _id: userId },
      { $inc: { addressLockSeq: 1 } },
      { session },
    );
    if (res.matchedCount === 0) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
  }

  // Public owned-address getter for other modules (e.g. Orders building the
  // shipping snapshot). Reuses the ownership check — generic 404 on miss.
  getOwnedAddress(userId: string, addressId: string): Promise<AddressDocument> {
    return this.findOwnedAddress(userId, addressId);
  }

  // Ownership check — never leak another user's rows. Accepts an optional
  // session so callers running inside a transaction read (and later write)
  // through the same transaction.
  private async findOwnedAddress(
    userId: string,
    addressId: string,
    session?: ClientSession,
  ): Promise<AddressDocument> {
    if (!isObjectIdString(addressId)) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }
    const address = await this.addressModel
      .findById(addressId)
      .session(session ?? null);
    if (!address || address.userId.toString() !== String(userId)) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }
    return address;
  }
}
