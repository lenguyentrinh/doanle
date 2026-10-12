import { IsNotEmpty, IsEmail } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email!: string;

  @IsNotEmpty({ message: 'Mã xác thực không được để trống' })
  code!: string;
}
