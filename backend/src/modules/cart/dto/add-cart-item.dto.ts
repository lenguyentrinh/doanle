import { IsInt, IsMongoId, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @IsMongoId({ message: 'productId không hợp lệ' })
  productId!: string;

  @Type(() => Number)
  @IsInt({ message: 'quantity phải là số nguyên' })
  @IsPositive({ message: 'quantity phải lớn hơn hoặc bằng 1' })
  @Max(99, { message: 'quantity không được vượt quá 99' })
  quantity!: number;
}
