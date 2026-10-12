import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { HOME_HERO_TEMPLATES } from '../home-hero.constants';
import type { HomeHeroTemplate } from '../home-hero.constants';

export class HomeHeroCtaDto {
  @IsString({ message: 'Nhãn nút phải là chuỗi ký tự' })
  @MaxLength(40, { message: 'Nhãn nút tối đa 40 ký tự' })
  label!: string;

  @IsString({ message: 'Liên kết phải là chuỗi ký tự' })
  @MaxLength(300, { message: 'Liên kết tối đa 300 ký tự' })
  @Matches(/^(\/(?!\/)|https?:\/\/)/i, {
    message: 'Liên kết phải bắt đầu bằng "/" hoặc "http(s)://"',
  })
  href!: string;
}

export class UpdateHomeHeroDto {
  @IsIn(HOME_HERO_TEMPLATES, { message: 'Mẫu hero không hợp lệ' })
  template!: HomeHeroTemplate;

  @IsString({ message: 'Eyebrow phải là chuỗi ký tự' })
  @MaxLength(60, { message: 'Eyebrow tối đa 60 ký tự' })
  eyebrow!: string;

  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(120, { message: 'Tiêu đề tối đa 120 ký tự' })
  title!: string;

  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @MaxLength(300, { message: 'Mô tả tối đa 300 ký tự' })
  subtitle!: string;

  @ValidateNested()
  @Type(() => HomeHeroCtaDto)
  primaryCta!: HomeHeroCtaDto;

  @ValidateNested()
  @Type(() => HomeHeroCtaDto)
  secondaryCta!: HomeHeroCtaDto;

  // Local paths ("/images/...", not "//host") or http(s) URLs — data URIs and
  // other schemes are rejected. The per-template count is enforced in
  // HomeHeroService.
  @IsArray({ message: 'Danh sách hình ảnh không hợp lệ' })
  @ArrayMaxSize(5, { message: 'Tối đa 5 hình ảnh' })
  @Matches(/^(\/(?!\/)[^\s]*|https?:\/\/[^\s]+)$/i, {
    each: true,
    message: 'Hình ảnh phải là đường dẫn nội bộ hoặc URL http(s) hợp lệ',
  })
  @MaxLength(2048, { each: true, message: 'URL hình ảnh quá dài' })
  images!: string[];
}
