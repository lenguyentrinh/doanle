import {
  IsOptional,
  IsString,
  IsInt,
  IsMongoId,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { trimToUndefinedTransform } from '../../../common/utils/string.utils';

// Admin list query — no `sort`/`minPrice`/`maxPrice`/`inStock`, those are
// shopper-only (ProductQueryDto). Default sort is always createdAt DESC.
export class AdminProductQueryDto {
  @IsOptional()
  @Transform(trimToUndefinedTransform)
  @IsString({ message: 'search phải là chuỗi ký tự' })
  search?: string;

  @IsOptional()
  @IsMongoId({ message: 'categoryId không hợp lệ' })
  categoryId?: string;

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
  limit: number = 25;
}
