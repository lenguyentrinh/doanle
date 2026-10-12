'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import { updateCartItemThunk, removeCartItemThunk } from '@/features/cart/store/cartThunk';
import { selectCartItems, selectCartSubtotal } from '@/features/cart/store/cartSlice';
import { useGuestCart } from '@/features/cart/hooks/useGuestCart';
import { updateGuestCartQuantity, removeFromGuestCart, fromGuestLineId } from '@/features/cart/lib/guestCart';
import { useCartDrawer } from '@/features/cart/context/CartDrawerContext';
import FreeShippingProgress from '@/features/cart/components/FreeShippingProgress';
import { formatPrice } from '@/lib/helpers';
import { PRODUCT_IMAGE_FALLBACK } from '@/lib/productImage';
import ProductImage from '@/components/ProductImage';

// Slide-out cart panel — opens automatically after every add-to-cart (wired
// via useAddToCart → CartDrawerContext) and from the Header's bag icon.
// Branches auth-vs-guest the same way the full /cart page does; kept as its
// own duplicate of that branching rather than sharing a hook, since the two
// surfaces render very differently and a shared abstraction would mostly be
// indirection.
export default function CartDrawer() {
  const { isOpen, close } = useCartDrawer();
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((s: { auth: { isAuthenticated: boolean } }) => s.auth.isAuthenticated);
  const authItems = useSelector(selectCartItems);
  const authSubtotal = useSelector(selectCartSubtotal);
  const guest = useGuestCart();

  // Guest cart reads from localStorage on mount only; re-pull it every time
  // the drawer opens so an add-to-cart elsewhere in the tree is reflected.
  useEffect(() => {
    if (isOpen && !isAuthenticated) guest.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated]);

  useEffect(() => {
    if (!isOpen) return;
    const { style } = document.documentElement;
    const previousOverflow = style.overflow;
    style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const items = isAuthenticated ? authItems : guest.items;
  const subtotal = isAuthenticated ? authSubtotal : guest.subtotal;
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  const updateQuantity = (itemId: string, quantity: number) => {
    if (isAuthenticated) {
      dispatch(updateCartItemThunk({ itemId, quantity }));
    } else {
      updateGuestCartQuantity(fromGuestLineId(itemId), quantity);
      guest.refresh();
    }
  };
  const remove = (itemId: string) => {
    if (isAuthenticated) {
      dispatch(removeCartItemThunk({ itemId }));
    } else {
      removeFromGuestCart(fromGuestLineId(itemId));
      guest.refresh();
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Giỏ hàng" className="fixed inset-0 z-[90]">
      <div
        aria-hidden
        onClick={close}
        className="absolute inset-0 bg-ink/38 backdrop-blur-[3px] motion-safe:animate-overlay-in"
      />
      <div className="absolute inset-y-0 right-0 flex w-[min(460px,100vw)] flex-col bg-white shadow-drawer motion-safe:animate-sheet-in">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="text-headline-sm text-ink">Giỏ hàng ({count})</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng giỏ hàng"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-fill text-ink transition-colors duration-200 hover:bg-fill-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {items.length > 0 && (
          <div className="px-6 py-4">
            <FreeShippingProgress subtotal={subtotal} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <p className="flex h-full items-center justify-center py-16 text-center text-body-md text-ink-muted">
              Chưa có sản phẩm nào.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {items.map((line) => {
                const hasDiscount = Boolean(line.product.discountPercentage);
                return (
                <div key={line.id} className="flex min-h-[95px] gap-4 py-5 first:pt-0">
                  <div className="relative h-[95px] w-[76px] flex-none overflow-hidden rounded-lg bg-fill">
                    <ProductImage
                      src={line.product.imageUrl ?? PRODUCT_IMAGE_FALLBACK}
                      alt={line.product.name}
                      fill
                      sizes="76px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex min-h-[95px] min-w-0 flex-1 flex-col gap-1.5">
                    <h3 className="truncate text-body-md text-ink">{line.product.name}</h3>
                    <p className="flex items-baseline gap-1.5">
                      <span className={`text-body-sm ${hasDiscount ? 'text-accent' : 'text-ink-muted'}`}>
                        {formatPrice(hasDiscount ? line.product.finalPrice : line.product.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-caption text-ink-faint line-through">
                          {formatPrice(line.product.price)}
                        </span>
                      )}
                    </p>
                    <div className="mt-auto flex w-fit items-center self-start rounded-full border border-line bg-fill">
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.id, Math.max(1, line.quantity - 1))}
                        aria-label="Giảm"
                        className="flex h-8 w-8 items-center justify-center text-ink-secondary transition-colors duration-200 hover:text-accent"
                      >
                        –
                      </button>
                      <span className="min-w-[20px] text-center text-body-sm tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.id, line.quantity + 1)}
                        aria-label="Tăng"
                        className="flex h-8 w-8 items-center justify-center text-ink-secondary transition-colors duration-200 hover:text-accent"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex min-h-[95px] flex-none flex-col items-end justify-between gap-3">
                    <p className="text-headline-sm tabular-nums text-ink">
                      {formatPrice((hasDiscount ? line.product.finalPrice : line.product.price) * line.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(line.id)}
                      className="border-b border-line pb-0.5 text-label-xs text-ink-muted transition-colors duration-200 hover:border-error hover:text-error"
                    >
                      Xoá
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-line px-6 py-5">
            <div className="flex items-baseline justify-between">
              <span className="text-body-md text-ink">Tạm tính</span>
              <span className="text-headline-sm tabular-nums text-ink">{formatPrice(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={close}
              className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-ink px-8 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover"
            >
              Thanh toán
            </Link>
            <Link
              href="/cart"
              onClick={close}
              className="text-center text-label-xs text-ink-muted underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-ink hover:decoration-ink"
            >
              Xem toàn bộ giỏ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
