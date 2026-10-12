import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

// Plain JSON body (not multipart, unlike create/update product) — arrives
// already correctly typed, so no @Type(() => Number) coercion is needed
// here. `discountPercentage: null` (or the field omitted) both mean "clear
// the discount on every selected product" — class-validator's @IsOptional
// already treats `null` the same as `undefined` and skips the numeric
// validators below, so no extra handling is required to accept it.
export class BulkDiscountDto {
  @IsArray({ message: 'productIds phải là một mảng' })
  @ArrayNotEmpty({ message: 'Cần chọn ít nhất một sản phẩm' })
  @IsInt({ each: true, message: 'productIds phải là mảng số nguyên' })
  productIds!: number[];

  @IsOptional()
  @IsNumber({}, { message: 'Phần trăm giảm giá phải là số' })
  @Min(0, { message: 'Phần trăm giảm giá không được âm' })
  @Max(100, { message: 'Phần trăm giảm giá tối đa 100' })
  discountPercentage?: number | null;
}
