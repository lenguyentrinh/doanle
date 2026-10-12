import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { trimToUndefinedTransform } from '../../../common/utils/string.utils';

export enum ProductSort {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'newest',
  POPULARITY = 'popularity',
}

export class ProductQueryDto {
  @IsOptional()
  @Transform(trimToUndefinedTransform)
  @IsString({ message: 'category phải là chuỗi ký tự' })
  category?: string;

  @IsOptional()
  @Transform(trimToUndefinedTransform)
  @IsString({ message: 'search phải là chuỗi ký tự' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'minPrice phải là số' })
  @Min(0, { message: 'minPrice không được là số âm' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'maxPrice phải là số' })
  @Min(0, { message: 'maxPrice không được là số âm' })
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  inStock?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  lowStock?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  newArrivals?: boolean;

  @IsOptional()
  @IsEnum(ProductSort, { message: 'sort không hợp lệ' })
  sort?: ProductSort;

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
  limit: number = 12;
}
