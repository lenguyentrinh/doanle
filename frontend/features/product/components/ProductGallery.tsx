'use client';

import { useState } from 'react';
import ProductImage from '@/components/ProductImage';
import { PRODUCT_IMAGE_FALLBACK } from '@/lib/productImage';

// PDP gallery: one large hero image with up to 4 thumbnails below. Clicking a
// thumbnail swaps the hero (active thumb gets an accent border, the rest sit
// at reduced opacity) rather than tiling every shot at once.
export default function ProductGallery({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const gallery = images.length > 0 ? images : [PRODUCT_IMAGE_FALLBACK];
  const [active, setActive] = useState(0);
  const hero = gallery[Math.min(active, gallery.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-fill-dark shadow-hero">
        <ProductImage
          src={hero}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1023px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {gallery.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {gallery.slice(0, 4).map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-pressed={active === index}
              className={`relative aspect-square overflow-hidden rounded-lg border bg-fill-dark transition-[border-color,opacity] duration-200 ${
                active === index ? 'border-accent opacity-100' : 'border-transparent opacity-70'
              }`}
            >
              <ProductImage src={src} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
