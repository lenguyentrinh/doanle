import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Trims surrounding whitespace before validation/persistence so
// whitespace-only input is rejected and stored values stay clean.
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// `email` is intentionally absent — it is read-only and must never be editable.
export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsNotEmpty({ message: 'Tên người dùng không được để trống!' })
  @IsString({ message: 'Tên người dùng phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tên người dùng không được để trống!' })
  @MaxLength(255, { message: 'Tên người dùng tối đa 255 ký tự' })
  userName?: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, {
    message: 'Số điện thoại không đúng định dạng',
  })
  phoneNumber?: string;
}
