import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from '../../common/storage/storage.service';
import { HomeHeroEntity } from './entities/home-hero.entity';
import { UpdateHomeHeroDto } from './dto/update-home-hero.dto';
import {
  HOME_HERO_IMAGE_LIMITS,
  HOME_HERO_ROW_ID,
} from './home-hero.constants';
import type { HomeHeroTemplate } from './home-hero.constants';

export interface HomeHero {
  template: HomeHeroTemplate;
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  images: string[];
}

@Injectable()
export class HomeHeroService {
  constructor(
    @InjectRepository(HomeHeroEntity)
    private readonly repo: Repository<HomeHeroEntity>,
    private readonly storageService: StorageService,
  ) {}

  async get(): Promise<HomeHero | null> {
    const row = await this.repo.findOne({ where: { id: HOME_HERO_ROW_ID } });
    return row ? this.toHomeHero(row) : null;
  }

  async upsert(dto: UpdateHomeHeroDto): Promise<HomeHero> {
    const { min, max } = HOME_HERO_IMAGE_LIMITS[dto.template];
    if (dto.images.length < min || dto.images.length > max) {
      throw new BadRequestException(
        min === max
          ? `Mẫu "${dto.template}" cần đúng ${min} hình ảnh`
          : `Mẫu "${dto.template}" cần từ ${min} đến ${max} hình ảnh`,
      );
    }
    const previous = await this.repo.findOne({
      where: { id: HOME_HERO_ROW_ID },
    });
    await this.repo.save(
      this.repo.create({
        id: HOME_HERO_ROW_ID,
        template: dto.template,
        eyebrow: dto.eyebrow,
        title: dto.title,
        subtitle: dto.subtitle,
        primaryCta: { label: dto.primaryCta.label, href: dto.primaryCta.href },
        secondaryCta: {
          label: dto.secondaryCta.label,
          href: dto.secondaryCta.href,
        },
        images: dto.images,
      }),
    );
    // Best-effort: delete uploaded images the new config no longer uses. Only
    // images that were in the previous row are candidates, so an upload not
    // yet saved (or one still referenced) is never touched.
    const kept = new Set(dto.images);
    await Promise.all(
      (previous?.images ?? [])
        .filter((url) => !kept.has(url))
        .map((url) => this.cloudinaryKey(url))
        .filter((key): key is string => key !== null)
        .map((key) => this.storageService.remove(key)),
    );
    const saved = await this.repo.findOneOrFail({
      where: { id: HOME_HERO_ROW_ID },
    });
    return this.toHomeHero(saved);
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    const key = await this.storageService.upload(file);
    return { url: this.storageService.resolveUrl(key) };
  }

  // "https://res.cloudinary.com/x/image/upload/v1/products/abc.jpg" →
  // "products/abc". Local paths and foreign URLs yield null (never deleted).
  private cloudinaryKey(url: string): string | null {
    const m =
      /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(products\/[^./]+)\.[a-z0-9]+$/i.exec(
        url,
      );
    return m ? m[1] : null;
  }

  private toHomeHero(row: HomeHeroEntity): HomeHero {
    return {
      template: row.template,
      eyebrow: row.eyebrow,
      title: row.title,
      subtitle: row.subtitle,
      primaryCta: row.primaryCta,
      secondaryCta: row.secondaryCta,
      images: row.images,
    };
  }
}
