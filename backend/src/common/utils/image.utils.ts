import { StorageService } from '../storage/storage.service';

/**
 * Extract and resolve the first image URL from an array of image keys.
 * Returns null if no images are available.
 */
export function resolveFirstImageUrl(
  imageKeys: string[] | null | undefined,
  storageService: StorageService,
): string | null {
  const key = imageKeys?.[0];
  return key ? storageService.resolveUrl(key) : null;
}
