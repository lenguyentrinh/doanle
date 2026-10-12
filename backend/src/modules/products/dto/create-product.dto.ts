import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Multipart/form-data fields arrive as strings — @Type(() => Number) coerces
// price/stockQuantity, the boolean Transform mirrors ProductQueryDto.inStock.
export class CreateProductDto {
  @IsString({ message: 'Tên sản phẩm phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @MaxLength(200, { message: 'Tên sản phẩm tối đa 200 ký tự' })
  name!: string;

  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @MaxLength(5000, { message: 'Mô tả tối đa 5000 ký tự' })
  description!: string;

  @IsMongoId({ message: 'Danh mục không hợp lệ' })
  categoryId!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Giá phải là số' })
  @Min(0.01, { message: 'Giá phải lớn hơn 0' })
  @Max(1_000_000, { message: 'Giá tối đa là 1.000.000' })
  price!: number;

  @Type(() => Number)
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Số lượng tồn kho không được là số âm' })
  stockQuantity!: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isActive phải là kiểu boolean' })
  isActive?: boolean = true;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Phần trăm giảm giá phải là số' })
  @Min(0, { message: 'Phần trăm giảm giá không được âm' })
  @Max(100, { message: 'Phần trăm giảm giá tối đa 100' })
  discountPercentage?: number;
}
