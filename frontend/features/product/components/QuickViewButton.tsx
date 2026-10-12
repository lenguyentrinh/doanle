'use client';

import type { Product } from '@/types/product';
import { useQuickView, useQuickViewScope } from '@/features/product/context/QuickViewContext';

// Compact circular CTA next to AddToCartButton. Opens the Quick View modal
// (image + name + price + description + add-to-cart) without leaving the
// grid. Visibility is owned by the CTA row wrapper in ProductCard, not this
// button — it only renders its own hover/focus color state.
export default function QuickViewButton({
  product,
  className = '',
}: {
  product: Product;
  className?: string;
}) {
  const { open } = useQuickView();
  const list = useQuickViewScope();

  return (
    <button
      type="button"
      onClick={() => open(product, list)}
      aria-label={`Xem nhanh ${product.name}`}
      className={`flex h-11 items-center justify-center rounded-full bg-white/96 text-ink shadow-btn backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    </button>
  );
}
