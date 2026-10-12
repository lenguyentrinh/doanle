'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAddToCart } from '@/features/product/hooks/useAddToCart';
import { formatPrice } from '@/lib/helpers';

// PDP purchase controls: quantity stepper and a CTA that shows the live
// total (price × qty). The stock pill itself renders in ProductInfo, inline
// with the price (spec) — this component only reads stockQuantity to decide
// qty-stepper-and-CTA vs a disabled "Hết hàng" button. Also renders the
// sticky bottom add-to-bag bar mirroring the same qty/total — kept in one
// component so both pieces share state without prop-drilling through
// ProductInfo/the page shell.
//
// No size selector: the Product model has no variant fields today (see
// ProductInfo's prior note) — do not fabricate sizes here either.
export default function PdpPurchasePanel({
  productId,
  productName,
  price,
  stockQuantity,
  imageUrl,
}: {
  productId: string;
  productName: string;
  price: number;
  stockQuantity: number;
  imageUrl?: string;
}) {
  const [qty, setQty] = useState(1);
  const { addToCart, status } = useAddToCart();
  const inStock = stockQuantity > 0;

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(stockQuantity, q + 1));

  const ctaLabel = status === 'added' ? 'Đã thêm vào giỏ' : `Thêm vào giỏ — ${formatPrice(price * qty)}`;

  return (
    <>
      <div className="flex flex-col gap-3">
        {inStock ? (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center rounded-full border border-line bg-fill">
              <button
                type="button"
                onClick={dec}
                aria-label="Giảm số lượng"
                className="flex h-[54px] w-12 items-center justify-center text-lg text-ink-secondary transition-colors duration-200 hover:text-accent"
              >
                –
              </button>
              <span className="min-w-[26px] text-center text-body-md tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={inc}
                aria-label="Tăng số lượng"
                className="flex h-[54px] w-12 items-center justify-center text-lg text-ink-secondary transition-colors duration-200 hover:text-accent"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={status === 'adding'}
              aria-label={`Thêm ${productName} vào giỏ`}
              onClick={() => addToCart(productId, qty)}
              className="min-h-[54px] min-w-0 flex-1 rounded-full bg-ink px-5 sm:px-8 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ctaLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled
            aria-label={`Hết hàng: ${productName}`}
            className="min-h-[54px] w-full cursor-not-allowed rounded-full border border-line bg-fill px-8 text-label-sm text-ink-muted"
          >
            Hết hàng
          </button>
        )}
      </div>

      {/* Portaled to document.body: this component renders inside the PDP's
          `lg:sticky` info column (app/products/[id]/page.tsx), and
          `position: sticky` always establishes its own stacking context —
          same trap as the admin filter-row/table z-index bug. Left in place,
          this bar's z-40 would only be compared against its sticky ancestor's
          *other* siblings, not against later-rendered page chrome (e.g. the
          site Footer), which could then paint over it. Portaling out of that
          ancestor puts it at the document root, where z-40 is compared
          globally as intended. */}
      {inStock && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/94 backdrop-blur-md motion-safe:animate-bar-in">
          <div className="mx-auto flex max-w-[1480px] items-center gap-3 px-[clamp(16px,3.4vw,44px)] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3.5">
            {imageUrl && (
              <span
                aria-hidden
                className="block h-12 w-10 flex-none rounded-md bg-cover bg-center"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-display text-[16px] font-medium text-ink">{productName}</span>
              <span className="text-[12px] text-ink-muted">
                SL {qty} · {formatPrice(price)}
              </span>
            </span>
            <button
              type="button"
              disabled={status === 'adding'}
              aria-label={`Thêm ${productName} vào giỏ`}
              onClick={() => addToCart(productId, qty)}
              className="min-h-[46px] shrink-0 rounded-full bg-accent px-5 sm:px-7 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              Thêm vào giỏ
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
