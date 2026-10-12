import { IsNotEmpty, IsEmail, Matches, MinLength } from 'class-validator';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
  PASSWORD_UPPERCASE_REGEX,
  PASSWORD_UPPERCASE_MESSAGE,
} from '../../../common/validators/password-policy';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Email không được để trống!' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email!: string;

  @IsNotEmpty({ message: 'OTP không được để trống!' })
  otp!: string;

  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống!' })
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MIN_LENGTH_MESSAGE })
  @Matches(PASSWORD_UPPERCASE_REGEX, { message: PASSWORD_UPPERCASE_MESSAGE })
  newPassword!: string;

  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống!' })
  confirmNewPassword!: string;
}
