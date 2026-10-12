import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { trimToUndefinedTransform } from '../../../common/utils/string.utils';

export type AdminCategorySort = 'name' | 'count';

// Admin list query — search matches category name or slug; sort 'name'
// (A→Z, default) or 'count' (most products first, ties broken by name).
export class AdminCategoryQueryDto {
  @IsOptional()
  @Transform(trimToUndefinedTransform)
  @IsString({ message: 'search phải là chuỗi ký tự' })
  search?: string;

  @IsOptional()
  @IsIn(['name', 'count'], { message: 'sort không hợp lệ' })
  sort: AdminCategorySort = 'name';

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
  limit: number = 6;
}
