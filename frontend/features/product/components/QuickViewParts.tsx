'use client';

import { useAddToCart } from '@/features/product/hooks/useAddToCart';
import { formatPrice } from '@/lib/helpers';
import type { Product } from '@/types/product';

export function stockInfo(product: Product) {
  const n = product.stockQuantity;
  if (n <= 0) return { label: 'Tạm hết hàng', cls: 'text-ink-muted' };
  if (n <= 5) return { label: `Chỉ còn ${n} chiếc`, cls: 'text-accent' };
  return { label: `Còn ${n} chiếc`, cls: 'text-success' };
}

export function DiscountChip({ product, className = '' }: { product: Product; className?: string }) {
  if (!product.discountPercentage) return null;
  return (
    <span className={`inline-flex w-fit items-center rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-white ${className}`}>
      −{product.discountPercentage}%
    </span>
  );
}

export function PriceText({ product, className = '' }: { product: Product; className?: string }) {
  const hasDiscount = Boolean(product.discountPercentage);
  return (
    <span className={`font-display font-medium tabular-nums ${hasDiscount ? 'text-accent' : 'text-ink'} ${className}`}>
      {formatPrice(hasDiscount ? product.finalPrice : product.price)}
    </span>
  );
}

export function OldPrice({ product }: { product: Product }) {
  if (!product.discountPercentage) return null;
  return <span className="text-[13px] tabular-nums text-ink-faint line-through">{formatPrice(product.price)}</span>;
}

export function BuyButton({ product, className = '' }: { product: Product; className?: string }) {
  const { addToCart, status } = useAddToCart();
  const inStock = product.stockQuantity > 0;
  if (!inStock) {
    return (
      <button
        type="button"
        disabled
        className={`min-h-[50px] cursor-not-allowed rounded-full bg-fill-dark px-8 text-label-sm text-ink-muted ${className}`}
      >
        Hết hàng
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={status === 'adding'}
      onClick={() => addToCart(product.id)}
      className={`min-h-[50px] rounded-full px-8 text-label-sm text-white transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
        status === 'added' ? 'bg-success' : 'bg-ink hover:bg-accent'
      } ${className}`}
    >
      {status === 'added' ? '✓ Đã thêm vào giỏ' : 'Thêm vào giỏ'}
    </button>
  );
}

export function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CloseButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      data-qv-close
      onClick={onClick}
      aria-label="Đóng"
      className={`flex items-center justify-center rounded-full border border-white/35 text-white transition-colors duration-200 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
    >
      <CloseIcon />
    </button>
  );
}

export function NavButton({
  dir,
  onClick,
  className = '',
}: {
  dir: 'prev' | 'next';
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Sản phẩm trước' : 'Sản phẩm sau'}
      className={`flex items-center justify-center rounded-full border border-white/35 text-white transition-colors duration-200 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d={dir === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}

export function Counter({ index, total, className = '' }: { index: number; total: number; className?: string }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span aria-live="polite" className={`font-display italic ${className}`}>
      {pad(index + 1)} <span className="opacity-60">/ {pad(total)}</span>
    </span>
  );
}

