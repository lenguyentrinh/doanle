import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary-backed image storage — replaces the earlier local-disk
// placeholder (Story 5.2/5.3) now that real Cloudinary credentials exist in
// this app's environment. Configured from three discrete env vars
// (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET) —
// deliberately NOT CLOUDINARY_URL, whose `${VAR}` interpolation is never
// expanded because this app's ConfigModule.forRoot() does not set
// `expandVariables: true`.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  // Bare (no "/") image keys are seed-data filenames resolved against this
  // local placeholder base URL, exactly as before the Cloudinary swap —
  // Products/Cart/Orders all delegate that decision to resolveUrl() below
  // instead of each keeping their own copy.
  private readonly imageBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Missing Cloudinary configuration: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must all be set',
      );
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.imageBaseUrl = (
      this.configService.get<string>('PRODUCT_IMAGE_BASE_URL') ??
      '/images/placeholders'
    ).replace(/\/+$/, '');
  }

  // Returns a storage key (Cloudinary public_id, e.g. "products/<random-id>")
  // — never a full URL. The leading "products/" segment is load-bearing:
  // resolveUrl() below uses it to distinguish uploaded keys from bare
  // seed-data filenames.
  async upload(file: Express.Multer.File): Promise<string> {
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'products',
    });
    if (!result.public_id) {
      throw new Error('Cloudinary upload did not return a public_id');
    }
    return result.public_id;
  }

  // Best-effort cleanup of an image already uploaded for a request that later
  // failed (e.g. one of several uploads in the same create/edit request
  // threw), or of an image an admin edit dropped. A leaked Cloudinary asset on
  // failure is a minor cost, not a data-integrity issue — nothing ever
  // references it — so failures here are swallowed rather than propagated.
  //
  // Bare (no "/") keys are seed-data placeholders that were never uploaded to
  // Cloudinary — calling destroy() on one would be a no-op at best, or at
  // worst collide with an unrelated real asset that happens to share the same
  // public_id. Only ever call Cloudinary for keys this service itself issued.
  async remove(key: string): Promise<void> {
    if (!key.includes('/')) {
      return;
    }
    try {
      await cloudinary.uploader.destroy(key);
    } catch (err) {
      // Cleanup failures must never fail the caller's request, but are still
      // logged so they aren't invisible in production.
      this.logger.warn(`Failed to remove upload "${key}": ${String(err)}`);
    }
  }

  // Two image-URL schemes coexist on purpose: bare seed-data filenames (e.g.
  // "product-placeholder.svg") resolve against the frontend's static placeholder
  // folder; slash-containing Cloudinary keys (e.g. "products/<random-id>")
  // resolve to a Cloudinary CDN URL. The key shape alone tells them apart —
  // Products/Cart/Orders all call this single method rather than keeping
  // their own copy of this logic.
  resolveUrl(key: string): string {
    return key.includes('/')
      ? cloudinary.url(key, { secure: true })
      : `${this.imageBaseUrl}/${key}`;
  }
}
