'use client';

import Image, { type ImageProps } from 'next/image';
import { onProductImageError } from '@/lib/productImage';

// Thin next/image wrapper that always falls back to PRODUCT_IMAGE_FALLBACK on
// load failure. A plain 'use client' component so Server Components (e.g.
// ProductCard, the homepage category rail) can still use it — a function
// prop like onError can't cross the server/client boundary, so the handler
// lives in here instead of being threaded down from each call site.
export default function ProductImage(props: ImageProps) {
  // eslint-disable-next-line jsx-a11y/alt-text -- `alt` is required by ImageProps and spread in via props
  return <Image {...props} onError={onProductImageError} />;
}
