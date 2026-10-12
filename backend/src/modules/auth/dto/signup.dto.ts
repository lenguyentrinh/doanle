import {
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsDateString,
  Matches,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
  PASSWORD_UPPERCASE_REGEX,
  PASSWORD_UPPERCASE_MESSAGE,
} from '../../../common/validators/password-policy';

export class SignupDto {
  @IsNotEmpty({ message: 'Tên người dùng không được để trống!' })
  userName!: string;

  @IsNotEmpty({ message: 'Email không được để trống!' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email!: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống!' })
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MIN_LENGTH_MESSAGE })
  @Matches(PASSWORD_UPPERCASE_REGEX, { message: PASSWORD_UPPERCASE_MESSAGE })
  password!: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Ngày sinh không đúng định dạng (dùng ISO 8601)' },
  )
  birthDate?: string;

  @IsOptional()
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, {
    message: 'Số điện thoại không đúng định dạng',
  })
  phoneNumber?: string;
}
