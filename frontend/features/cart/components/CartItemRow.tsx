'use client';

import { useState } from 'react';
import { FiMinus, FiPlus, FiX } from 'react-icons/fi';
import type { CartLine } from '@/types/cart';
import { formatPrice } from '@/lib/helpers';
import { showToast } from '@/lib/toast';
import { PRODUCT_IMAGE_FALLBACK } from '@/lib/productImage';
import ProductImage from '@/components/ProductImage';

interface Props {
  line: CartLine;
  index?: number;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<unknown>;
  onRemove: (itemId: string) => Promise<unknown>;
}

const isOutOfStock = (s: number) => s === 0;

// Editorial bag row (not a card): sharp 3:4 product image, quiet typography,
// separated from siblings by the list's hairline dividers. Flat throughout,
// so the item list stays calm and gallery-like.
export default function CartItemRow({
  line,
  index = 0,
  onUpdateQuantity,
  onRemove,
}: Props) {
  const { id, product, quantity } = line;
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);

  const imageSrc = product.imageUrl ?? PRODUCT_IMAGE_FALLBACK;
  const hasDiscount = Boolean(product.discountPercentage);
  const oos = isOutOfStock(product.stockQuantity);
  const lowStock = !oos && product.stockQuantity < quantity;
  const displayQty = lowStock ? product.stockQuantity : quantity;
  const atMin = displayQty <= 1;
  const atMax = displayQty >= product.stockQuantity;

  const changeQuantity = async (next: number) => {
    setBusy(true);
    try {
      await onUpdateQuantity(id, next);
    } catch (err) {
      showToast.error(
        /stock/i.test(String(err))
          ? 'Không đủ hàng trong kho.'
          : 'Không thể cập nhật giỏ hàng. Vui lòng thử lại.',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await onRemove(id);
    } catch {
      showToast.error('Không thể xoá sản phẩm. Vui lòng thử lại.');
      setRemoving(false);
    }
  };

  return (
    <article
      // Staggered fade-up on mount; dropped when removing so the exit fade wins.
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
      className={`group grid grid-cols-[auto_minmax(0,1fr)] gap-4 py-5 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] first:pt-0 sm:gap-7 ${
        removing ? 'opacity-0' : 'opacity-100 motion-safe:animate-account-rise'
      }`}
    >
      {/* Product image: editorial 4:5 crop with a gentle hover zoom */}
      <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-sm border border-line bg-fill shadow-xs sm:w-24">
        <ProductImage
          src={imageSrc}
          alt={product.name}
          fill
          sizes="(min-width: 640px) 96px, 80px"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:scale-[1.05]"
        />
      </div>

      <div className="flex min-w-0 flex-col">
        {/* Title, unit price, status + remove */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="truncate text-product leading-snug text-ink">
              {product.name}
            </h3>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className={`text-body-sm tabular-nums ${hasDiscount ? 'text-accent' : 'text-ink-secondary'}`}>
                {formatPrice(hasDiscount ? product.finalPrice : product.price)}
              </span>
              {hasDiscount && (
                <span className="text-caption tabular-nums text-ink-faint line-through">
                  {formatPrice(product.price)}
                </span>
              )}
              {hasDiscount && (
                <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                  −{product.discountPercentage}%
                </span>
              )}
            </p>
            {oos && (
              <span
                role="status"
                aria-label="Hết hàng"
                className="mt-0.5 inline-flex w-fit rounded-full bg-error-bg px-2.5 py-1 text-label-xs text-error-strong"
              >
                Hết hàng
              </span>
            )}
            {lowStock && (
              <p className="text-caption text-alert">
                Chỉ còn {product.stockQuantity} sản phẩm
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={busy || removing}
            aria-label={`Xoá ${product.name} khỏi giỏ`}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-ink-muted md:h-8 md:w-8 transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <FiX size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Quantity stepper + line total, anchored to the row baseline */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-4">
          {!oos ? (
            <div className="inline-flex items-center overflow-hidden rounded-sm border border-line bg-surface shadow-xs">
              <button
                type="button"
                onClick={() => changeQuantity(displayQty - 1)}
                disabled={busy || removing || atMin}
                aria-label={`Giảm số lượng ${product.name}`}
                className="flex h-10 w-10 items-center justify-center text-ink transition md:h-9 md:w-9-colors duration-200 hover:bg-fill focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <FiMinus size={14} aria-hidden="true" />
              </button>
              <span
                className="w-8 text-center text-body-sm tabular-nums text-ink sm:w-9"
                aria-live="polite"
              >
                {displayQty}
              </span>
              <button
                type="button"
                onClick={() => changeQuantity(displayQty + 1)}
                disabled={busy || removing || atMax}
                aria-label={`Tăng số lượng ${product.name}`}
                className="flex h-10 w-10 items-center justify-center text-ink transition md:h-9 md:w-9-colors duration-200 hover:bg-fill focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <FiPlus size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <span />
          )}

          <p className="text-product tabular-nums text-ink">
            {formatPrice((hasDiscount ? product.finalPrice : product.price) * displayQty)}
          </p>
        </div>
      </div>
    </article>
  );
}
