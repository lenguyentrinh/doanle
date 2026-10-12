import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Partial update — every field optional. `existingImageKeys` must be
// declared here even though it isn't a Product column: main.ts's global
// ValidationPipe has `whitelist: true, forbidNonWhitelisted: true`, so any
// multipart field not declared on this DTO class is silently stripped/
// rejected, breaking every PATCH that touches images.
export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'Tên sản phẩm phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @MaxLength(200, { message: 'Tên sản phẩm tối đa 200 ký tự' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @MaxLength(5000, { message: 'Mô tả tối đa 5000 ký tự' })
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Danh mục không hợp lệ' })
  @Min(1, { message: 'Danh mục không hợp lệ' })
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá phải là số' })
  @Min(0.01, { message: 'Giá phải lớn hơn 0' })
  @Max(1_000_000, { message: 'Giá tối đa là 1.000.000' })
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Số lượng tồn kho không được là số âm' })
  stockQuantity?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isActive phải là kiểu boolean' })
  isActive?: boolean;

  // Raw JSON-stringified string[] of image keys the admin chose to keep;
  // parsed in ProductsService.updateProduct, not here.
  @IsOptional()
  @IsString({ message: 'existingImageKeys phải là chuỗi ký tự' })
  existingImageKeys?: string;

  // Clear-vs-omit convention (multipart fields are all strings, so `null`
  // itself never arrives on the wire): the field being OMITTED entirely
  // means "no change" (ProductsService keeps the existing value); the field
  // being present as an EMPTY STRING means "explicitly clear the discount"
  // (ProductsService sets it back to null). Sending "0" is a real 0%
  // discount, not a clear — it is not the same thing as no discount
  // configured. The Transform below turns '' into `null` before validation
  // so IsOptional lets it through untouched (IsOptional skips further
  // validators for both `undefined` and `null`), while any other string is
  // coerced to a number and validated normally.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return Number(value);
  })
  @IsNumber({}, { message: 'Phần trăm giảm giá phải là số' })
  @Min(0, { message: 'Phần trăm giảm giá không được âm' })
  @Max(100, { message: 'Phần trăm giảm giá tối đa 100' })
  discountPercentage?: number | null;
}
