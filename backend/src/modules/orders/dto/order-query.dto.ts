import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OrderStatus } from '../entities/order.entity';
import { trimToUndefinedTransform } from '../../../common/utils/string.utils';

export type UserOrderSort = 'newest' | 'oldest';

export class OrderQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status?: OrderStatus;

  @IsOptional()
  @Transform(trimToUndefinedTransform)
  @IsString({ message: 'search phải là chuỗi ký tự' })
  search?: string;

  @IsOptional()
  @IsIn(['newest', 'oldest'], { message: 'sort không hợp lệ' })
  sort: UserOrderSort = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit không được vượt quá 100' })
  limit: number = 10;
}
