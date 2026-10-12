import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsPositive,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MergeCartItem {
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

export class MergeCartDto {
  @IsArray({ message: 'items phải là một mảng' })
  @ArrayMaxSize(100, { message: 'items không được vượt quá 100 phần tử' })
  @ValidateNested({ each: true })
  @Type(() => MergeCartItem)
  items!: MergeCartItem[];
}
