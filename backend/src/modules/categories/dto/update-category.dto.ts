import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Rename is the only supported update — `name` is required, not optional.
export class UpdateCategoryDto {
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @MaxLength(100, { message: 'Tên danh mục tối đa 100 ký tự' })
  name!: string;
}
