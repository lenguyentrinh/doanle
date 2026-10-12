import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Every field is optional: omitted = leave unchanged, null = clear.
export class UpdateAuthLookbookDto {
  // Local paths ("/images/...", not "//host") or http(s) URLs — data URIs and
  // other schemes are rejected.
  @IsOptional()
  @IsString({ message: 'Hình ảnh phải là chuỗi ký tự' })
  @Matches(/^(\/(?!\/)[^\s]*|https?:\/\/[^\s]+)$/i, {
    message: 'Hình ảnh phải là đường dẫn nội bộ hoặc URL http(s) hợp lệ',
  })
  @MaxLength(2048, { message: 'URL hình ảnh quá dài' })
  imageUrl?: string | null;

  @IsOptional()
  @IsString({ message: 'Chú thích phải là chuỗi ký tự' })
  @MaxLength(200, { message: 'Chú thích tối đa 200 ký tự' })
  caption?: string | null;

  @IsOptional()
  @IsString({ message: 'Nhãn phải là chuỗi ký tự' })
  @MaxLength(40, { message: 'Nhãn tối đa 40 ký tự' })
  label?: string | null;
}
