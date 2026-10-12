import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Trims surrounding whitespace before validation/persistence so
// whitespace-only input is rejected and stored values stay clean.
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Reused by both add (POST) and edit (PATCH) — both send the full address body.
export class CreateAddressDto {
  @Transform(trim)
  @IsNotEmpty({ message: 'Họ không được để trống!' })
  @IsString({ message: 'Họ phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Họ không được để trống!' })
  @MaxLength(255, { message: 'Họ tối đa 255 ký tự' })
  firstName!: string;

  @Transform(trim)
  @IsNotEmpty({ message: 'Tên không được để trống!' })
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tên không được để trống!' })
  @MaxLength(255, { message: 'Tên tối đa 255 ký tự' })
  lastName!: string;

  @Transform(trim)
  @IsNotEmpty({ message: 'Địa chỉ không được để trống!' })
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Địa chỉ không được để trống!' })
  @MaxLength(255, { message: 'Địa chỉ tối đa 255 ký tự' })
  street!: string;

  @Transform(trim)
  @IsNotEmpty({ message: 'Thành phố không được để trống!' })
  @IsString({ message: 'Thành phố phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Thành phố không được để trống!' })
  @MaxLength(255, { message: 'Thành phố tối đa 255 ký tự' })
  city!: string;

  @IsOptional()
  @IsBoolean({ message: 'isDefault phải là kiểu boolean' })
  isDefault?: boolean;
}
