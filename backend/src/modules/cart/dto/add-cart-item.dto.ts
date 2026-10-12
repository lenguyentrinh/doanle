import { IsInt, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @Type(() => Number)
  @IsInt({ message: 'productId phải là số nguyên' })
  @IsPositive({ message: 'productId phải là số nguyên dương' })
  productId!: number;

  @Type(() => Number)
  @IsInt({ message: 'quantity phải là số nguyên' })
  @IsPositive({ message: 'quantity phải lớn hơn hoặc bằng 1' })
  @Max(99, { message: 'quantity không được vượt quá 99' })
  quantity!: number;
}
