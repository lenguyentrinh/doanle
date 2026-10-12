import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { SignupDto } from '../auth/dto/signup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    private dataSource: DataSource,
  ) {}

  create(dto: SignupDto): Promise<User> {
    const user = this.userRepository.create(dto);
    return this.userRepository.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async setEmailOTP(id: number, otp: string, expires: Date) {
    return this.userRepository.update(id, {
      emailOtpCode: otp,
      emailOtpExpires: expires,
      emailOtpAttempts: 0,
    });
  }

  // Consumes the OTP (single-use) on success. Only for flows where this is
  // the terminal step and nothing downstream needs to check the code again —
  // e.g. signup email verification (`/verify-email`). The forgot-password
  // flow has a second server-side check in AuthService#resetPassword, so it
  // must use the non-consuming `checkEmailOtp` below instead, or that second
  // check would always fail against an already-cleared code.
  async verifyEmailOtp(email: string, otp: string): Promise<User | null> {
    const user = await this.checkEmailOtp(email, otp);
    if (!user) return null;

    await this.userRepository.update(user.id, {
      emailOtpCode: null as unknown as string,
      emailOtpExpires: null,
      emailOtpAttempts: 0,
    });
    return user;
  }

  // Validates the OTP (tracking failed attempts / lockout the same as
  // verifyEmailOtp) but leaves it in place for a later step to consume.
  async checkEmailOtp(email: string, otp: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return null;
    if (!user.emailOtpCode || !user.emailOtpExpires) return null;
    if (user.emailOtpExpires < new Date()) return null;

    const isValid = user.emailOtpCode === otp;
    if (!isValid) {
      const attempts = (user.emailOtpAttempts ?? 0) + 1;
      if (attempts >= 5) {
        await this.userRepository.update(user.id, {
          emailOtpCode: null as unknown as string,
          emailOtpExpires: null,
          emailOtpAttempts: 0,
        });
      } else {
        await this.userRepository.update(user.id, {
          emailOtpAttempts: attempts,
        });
      }
      return null;
    }

    return user;
  }

  async updatePassword(id: number, newPassword: string) {
    return this.userRepository.update(id, { password: newPassword });
  }

  async markEmailVerified(id: number) {
    return this.userRepository.update(id, { emailVerified: true });
  }

  // Null out the email OTP so it cannot be reused (single-use after a
  // successful password reset).
  async clearEmailOtp(id: number) {
    return this.userRepository.update(id, {
      emailOtpCode: null as unknown as string,
      emailOtpExpires: null,
      emailOtpAttempts: 0,
    });
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  // Returns a sanitized user (the same shape as GET /auth/me's allow-list) so
  // sensitive fields (password, OTP/reset tokens) never leak to the client.
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (dto.userName !== undefined) user.userName = dto.userName;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;

    const saved = await this.userRepository.save(user);
    return {
      id: saved.id,
      userName: saved.userName,
      email: saved.email,
      phoneNumber: saved.phoneNumber ?? null,
      role: saved.role,
    };
  }

  // ── Addresses ───────────────────────────────────────────────────────────────

  getAddresses(userId: number): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });
  }

  // Wrapped in a transaction: the read-then-write on `isDefault` must be
  // atomic, otherwise concurrent requests can leave 0 or 2 default addresses.
  async addAddress(userId: number, dto: CreateAddressDto): Promise<Address> {
    return this.dataSource.transaction(async (manager) => {
      // Lock all existing address rows for this user (pessimistic_write) to
      // prevent a concurrent request from inserting a 3rd address between the
      // count-then-insert window. Without this lock, REPEATABLE READ allows
      // two concurrent transactions to both see count < 2 and both insert.
      const existing = await manager.find(Address, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing.length >= 2) {
        throw new ConflictException('Chỉ được lưu tối đa 2 địa chỉ');
      }

      // The first address is default; an explicit isDefault also wins.
      const makeDefault = dto.isDefault === true || existing.length === 0;
      if (makeDefault) {
        await manager.update(Address, { userId }, { isDefault: false });
      }

      const address = manager.create(Address, {
        firstName: dto.firstName,
        lastName: dto.lastName,
        street: dto.street,
        city: dto.city,
        isDefault: makeDefault,
        userId,
      });
      return manager.save(address);
    });
  }

  async editAddress(
    userId: number,
    addressId: number,
    dto: CreateAddressDto,
  ): Promise<Address> {
    return this.dataSource.transaction(async (manager) => {
      const address = await this.findOwnedAddress(userId, addressId, manager);
      const wasDefault = address.isDefault;

      if (dto.isDefault === true) {
        await manager.update(Address, { userId }, { isDefault: false });
      }

      address.firstName = dto.firstName;
      address.lastName = dto.lastName;
      address.street = dto.street;
      address.city = dto.city;
      if (dto.isDefault !== undefined) address.isDefault = dto.isDefault;

      const saved = await manager.save(address);

      // Never leave the user with zero default addresses: if this address
      // was the default and no longer is, promote the oldest remaining one.
      if (wasDefault && !saved.isDefault) {
        await this.promoteFallbackDefault(manager, userId, addressId);
      }

      return saved;
    });
  }

  async setDefaultAddress(
    userId: number,
    addressId: number,
  ): Promise<Address[]> {
    return this.dataSource.transaction(async (manager) => {
      const address = await this.findOwnedAddress(userId, addressId, manager);

      await manager.update(Address, { userId }, { isDefault: false });
      address.isDefault = true;
      await manager.save(address);

      return manager.find(Address, {
        where: { userId },
        order: { id: 'ASC' },
      });
    });
  }

  async removeAddress(
    userId: number,
    addressId: number,
  ): Promise<{ message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const address = await this.findOwnedAddress(userId, addressId, manager);
      const wasDefault = address.isDefault;
      await manager.remove(address);

      // Never leave the user with zero default addresses: if the removed
      // address was the default and another remains, promote the oldest one.
      if (wasDefault) {
        await this.promoteFallbackDefault(manager, userId, addressId);
      }

      return { message: 'Đã xóa địa chỉ' };
    });
  }

  // Promotes the oldest remaining address (excluding the one just edited/
  // removed) to default. No-op if the user has no other addresses.
  private async promoteFallbackDefault(
    manager: EntityManager,
    userId: number,
    excludeAddressId: number,
  ): Promise<void> {
    const fallback = await manager.findOne(Address, {
      where: { userId, id: Not(excludeAddressId) },
      order: { id: 'ASC' },
    });
    if (fallback) {
      fallback.isDefault = true;
      await manager.save(fallback);
    }
  }

  // Public owned-address getter for other modules (e.g. Orders building the
  // shipping snapshot). Reuses the ownership check — generic 404 on miss.
  getOwnedAddress(userId: number, addressId: number): Promise<Address> {
    return this.findOwnedAddress(userId, addressId);
  }

  // Ownership check — never leak another user's rows. Accepts an optional
  // transactional EntityManager so callers running inside a transaction read
  // (and later write) through the same connection.
  private async findOwnedAddress(
    userId: number,
    addressId: number,
    manager: EntityManager = this.addressRepository.manager,
  ): Promise<Address> {
    const address = await manager.findOne(Address, {
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }
    return address;
  }
}
