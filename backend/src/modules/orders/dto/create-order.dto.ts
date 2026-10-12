import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsMongoId({ message: 'productId không hợp lệ' })
  productId!: string;

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

  @IsMongoId({ message: 'shippingAddressId không hợp lệ' })
  shippingAddressId!: string;

  @IsString({ message: 'idempotencyKey phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'idempotencyKey không được để trống' })
  idempotencyKey!: string;
}
