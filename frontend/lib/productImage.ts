import type { SyntheticEvent } from 'react';

// Single fallback for every product photo that's missing or fails to load
// (empty imageUrls, a 404'd upload, stale seed data). Deliberately not
// per-category: a category-keyed placeholder (e.g. one SVG per category name)
// silently has no fallback the moment a new category is added, so there's
// only ever this one generic image.
export const PRODUCT_IMAGE_FALLBACK = '/images/placeholders/product-placeholder.svg';

// Shared onError handler for next/image <Image>: clears the responsive
// srcset first (otherwise the browser keeps retrying the broken source at
// other widths) before swapping to the fallback.
export function onProductImageError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.srcset = '';
  e.currentTarget.src = PRODUCT_IMAGE_FALLBACK;
}
