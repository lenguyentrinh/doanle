import { IsNotEmpty, IsEmail } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty({ message: 'Email không được để trống!' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email!: string;
}
