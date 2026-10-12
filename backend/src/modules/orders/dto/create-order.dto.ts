import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @Type(() => Number)
  @IsInt({ message: 'productId phải là số nguyên' })
  @IsPositive({ message: 'productId phải là số nguyên dương' })
  productId!: number;

  @Type(() => Number)
  @IsInt({ message: 'quantity phải là số nguyên' })
  @IsPositive({ message: 'quantity phải lớn hơn hoặc bằng 1' })
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray({ message: 'cartItems phải là một mảng' })
  @ArrayNotEmpty({ message: 'cartItems không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  cartItems!: CreateOrderItemDto[];

  @Type(() => Number)
  @IsInt({ message: 'shippingAddressId phải là số nguyên' })
  @IsPositive({ message: 'shippingAddressId phải là số nguyên dương' })
  shippingAddressId!: number;

  @IsString({ message: 'idempotencyKey phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'idempotencyKey không được để trống' })
  idempotencyKey!: string;
}
