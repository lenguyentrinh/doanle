import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { StorageService } from '../../common/storage/storage.service';
import { AuthLookbookEntity } from './entities/auth-lookbook.entity';
import { UpdateAuthLookbookDto } from './dto/update-auth-lookbook.dto';
import { AUTH_LOOKBOOK_ROW_ID } from './auth-lookbook.constants';

export interface AuthLookbook {
  imageUrl: string | null;
  caption: string | null;
  label: string | null;
}

@Injectable()
export class AuthLookbookService {
  constructor(
    @InjectModel(AuthLookbookEntity.name)
    private readonly model: Model<AuthLookbookEntity>,
    private readonly storageService: StorageService,
  ) {}

  // Never null: an unconfigured lookbook is all-null fields.
  async get(): Promise<AuthLookbook> {
    const row = await this.model.findById(AUTH_LOOKBOOK_ROW_ID);
    return this.toAuthLookbook(row);
  }

  async upsert(dto: UpdateAuthLookbookDto): Promise<AuthLookbook> {
    const previous = await this.model.findById(AUTH_LOOKBOOK_ROW_ID);
    // Only fields present in the body are written (null clears).
    const set: Partial<AuthLookbook> = {};
    if (dto.imageUrl !== undefined) set.imageUrl = dto.imageUrl;
    if (dto.caption !== undefined) set.caption = dto.caption;
    if (dto.label !== undefined) set.label = dto.label;
    const saved = await this.model.findOneAndUpdate(
      { _id: AUTH_LOOKBOOK_ROW_ID },
      { $set: set },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    if (!saved) {
      throw new Error('Failed to persist the auth lookbook configuration');
    }
    // Best-effort: delete the previous uploaded image if replaced/cleared.
    if (previous?.imageUrl && previous.imageUrl !== saved.imageUrl) {
      const key = this.cloudinaryKey(previous.imageUrl);
      if (key) await this.storageService.remove(key);
    }
    return this.toAuthLookbook(saved);
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

  private toAuthLookbook(row: AuthLookbookEntity | null): AuthLookbook {
    return {
      imageUrl: row?.imageUrl ?? null,
      caption: row?.caption ?? null,
      label: row?.label ?? null,
    };
  }
}
