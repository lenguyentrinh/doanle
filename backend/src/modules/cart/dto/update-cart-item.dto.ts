import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  // 0 is allowed and means "remove the item" (see AC5).
  @Type(() => Number)
  @IsInt({ message: 'quantity phải là số nguyên' })
  @Min(0, { message: 'quantity không được là số âm' })
  @Max(99, { message: 'quantity không được vượt quá 99' })
  quantity!: number;
}
