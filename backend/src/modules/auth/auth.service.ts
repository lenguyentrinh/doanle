import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { isDuplicateKeyError } from '../../common/database/transaction';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MailService } from '../mail/mail.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailService: MailService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async signup(dto: SignupDto) {
    try {
      const password = await bcrypt.hash(dto.password, 10);
      const user = await this.userService.create({ ...dto, password });
      await this.resendOtpForUser(user.email);
      return {
        message: 'Đăng ký thành công, mã OTP đã được gửi đến email của bạn.',
        email: user.email,
      };
    } catch (error) {
      // MongoDB duplicate-key (E11000) on the unique email index.
      if (isDuplicateKeyError(error)) {
        // Email exists — check if already verified
        const existing = await this.userService.findByEmail(dto.email);
        if (existing && !existing.emailVerified) {
          // Resume flow: resend OTP to unverified user
          this.logger.log(
            `Email ${dto.email} exists but not verified, resending OTP`,
          );
          await this.resendOtpForUser(dto.email);
          return {
            message:
              'Mã OTP đã được gửi đến email của bạn. Dùng mã này để xác thực tài khoản.',
            email: dto.email,
          };
        }
        throw new ConflictException('Email đã tồn tại');
      }
      throw error;
    }
  }

  private async resendOtpForUser(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user)
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');

    const code = this.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.userService.setEmailOTP(user.id, code, expiresAt);

    try {
      await this.sendEmailOtp(email, code, expiresAt);
    } catch (mailError) {
      this.logger.error(
        `Failed to send OTP email to ${email}: ${(mailError as Error).message}`,
        (mailError as Error).stack,
      );
      throw new ServiceUnavailableException(
        'Gửi email OTP thất bại. Vui lòng thử lại.',
      );
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user)
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');

    // Password checked BEFORE emailVerified: 'Email not verified' must only
    // ever be reachable by someone who already knows the correct password,
    // otherwise it lets an attacker enumerate registered emails without
    // knowing any password at all.
    const match = await bcrypt.compare(dto.password, user.password);
    if (!match)
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');

    if (!user.emailVerified)
      throw new UnauthorizedException('Email chưa được xác thực');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      user.id,
    );
    return { token, refreshToken };
  }

  async refresh(refreshToken: string) {
    // The refresh token is an opaque secret (not a JWT) — rotateRefreshToken
    // looks it up by the row id embedded in it and returns the owning user.
    const { userId, raw: newRefreshToken } =
      await this.refreshTokenService.rotateRefreshToken(refreshToken);

    const user = await this.userService.findById(userId);
    if (!user) throw new UnauthorizedException('Không tìm thấy người dùng');

    const newAccessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async revokeUserTokens(userId: string) {
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }

  async revokeByRawToken(rawToken: string | undefined) {
    await this.refreshTokenService.revokeByRawToken(rawToken);
  }

  private generateOTP(): string {
    return randomInt(100000, 1000000).toString();
  }

  private async sendEmailOtp(email: string, code: string, expiresAt: Date) {
    return this.mailService.sendOtpEmail(email, code, expiresAt);
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const user = await this.userService.verifyEmailOtp(
      verifyEmailDto.email,
      verifyEmailDto.code,
    );
    if (!user) throw new UnauthorizedException('OTP không hợp lệ');
    await this.userService.markEmailVerified(user.id);
    return {
      message: 'Xác thực email thành công',
      email: user.email,
    };
  }

  // Public endpoint (forgot-password entry point) — must respond identically
  // whether or not the email is registered, or the response becomes an
  // oracle for enumerating accounts. Only swallow "no such user"; a real
  // mail-delivery failure (ServiceUnavailableException) still surfaces.
  async sendOtp(sendOtpDto: SendOtpDto) {
    try {
      await this.resendOtpForUser(sendOtpDto.email);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
    }
    return {
      message: 'Nếu email này đã đăng ký, một mã OTP đã được gửi đến đó.',
      email: sendOtpDto.email,
    };
  }

  // Does not consume the OTP: resetPassword() below re-checks and consumes
  // it, so consuming here would make a correct code always fail there.
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const user = await this.userService.checkEmailOtp(
      verifyOtpDto.email,
      verifyOtpDto.otp,
    );
    if (!user) throw new UnauthorizedException('OTP không hợp lệ');
    return { message: 'Xác thực OTP thành công', email: user.email };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.userService.findByEmail(resetPasswordDto.email);
    if (!user)
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');

    // Re-verify the OTP server-side (do not trust the /verify-otp gate the
    // frontend already passed through — that step uses the non-consuming
    // checkEmailOtp, so the code is still present here) and clear it on
    // success to make it single-use. emailOtpCode is stored in plain text.
    const otpMatches =
      !!user.emailOtpCode && user.emailOtpCode === resetPasswordDto.otp;
    if (
      !user.emailOtpCode ||
      !user.emailOtpExpires ||
      user.emailOtpExpires < new Date() ||
      !otpMatches
    ) {
      throw new UnauthorizedException('Mã không hợp lệ hoặc đã hết hạn');
    }

    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmNewPassword) {
      throw new BadRequestException(
        'Mật khẩu mới và mật khẩu xác nhận không khớp',
      );
    }

    const isSamePassword = await bcrypt.compare(
      resetPasswordDto.newPassword,
      user.password,
    );
    if (isSamePassword) {
      throw new BadRequestException(
        'Mật khẩu mới phải khác với mật khẩu hiện tại',
      );
    }

    const newPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.userService.updatePassword(user.id, newPassword);
    await this.userService.clearEmailOtp(user.id);
    await this.revokeUserTokens(user.id);
    return { message: 'Đặt lại mật khẩu thành công', email: user.email };
  }
}
