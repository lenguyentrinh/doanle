'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store/store';
import {
  fetchCartThunk,
  updateCartItemThunk,
  removeCartItemThunk,
} from '@/features/cart/store/cartThunk';
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartLoading,
  selectCartLoaded,
  selectCartError,
} from '@/features/cart/store/cartSlice';
import { useGuestCart } from '@/features/cart/hooks/useGuestCart';
import { updateGuestCartQuantity, removeFromGuestCart } from '@/features/cart/lib/guestCart';
import CartItemRow from '@/features/cart/components/CartItemRow';
import CartSummary from '@/features/cart/components/CartSummary';
import CartSkeleton from '@/features/cart/components/CartSkeleton';

// Shared page chrome so every populated state has the same rhythm.
function CartShell({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-paper">
      <section className="mx-auto w-full max-w-[1400px] px-5 py-12 lg:px-10 lg:py-16">
        <header className="mb-8 border-b border-line pb-5 md:mb-10">
          <h1 className="text-display-lg text-ink">Giỏ hàng</h1>
          {count > 0 && (
            <p className="mt-2 text-body-md text-ink-muted">
              {count} sản phẩm
            </p>
          )}
        </header>
        {children}
      </section>
    </div>
  );
}

// Shared cart load-failure state (used by both the authenticated and guest
// branches). Centered message + retry, styled to match the page.
function CartError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-paper">
      <section className="mx-auto w-full max-w-[1400px] px-5 py-12 lg:px-10 lg:py-16">
        <h1 className="mb-8 text-display-lg text-ink">Giỏ hàng</h1>
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <p className="text-body-md text-ink-muted">
            Không tải được giỏ hàng của bạn.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-ink px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Thử lại
          </button>
        </div>
      </section>
    </div>
  );
}

// Empty cart state: a display heading, a short supporting line, and a
// primary ink-slab "Continue shopping" CTA. A Link styled as a button, so
// there is no <button> nested in an <a>.
function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center gap-7 py-24 text-center">
      <div className="flex flex-col gap-3">
        <h2 className="text-display-md text-ink">Giỏ hàng đang trống</h2>
        <p className="max-w-[38ch] text-body-md text-ink-muted">
          Bắt đầu với bộ sưu tập mùa thu.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-ink px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Mua sắm ngay
      </Link>
    </div>
  );
}

export default function CartPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, authChecked } = useSelector(
    (s: { auth: { isAuthenticated: boolean; authChecked: boolean } }) => s.auth,
  );
  const authItems = useSelector(selectCartItems);
  const authSubtotal = useSelector(selectCartSubtotal);
  const authLoading = useSelector(selectCartLoading);
  const authLoaded = useSelector(selectCartLoaded);
  const authError = useSelector(selectCartError);

  const guest = useGuestCart();

  const hasOutOfStock = authItems.some((i) => i.product.stockQuantity === 0);

  useEffect(() => {
    if (authChecked && isAuthenticated && !authLoaded) {
      dispatch(fetchCartThunk());
    }
  }, [authChecked, isAuthenticated, authLoaded, dispatch]);

  const handleUpdateQuantity = (itemId: number, quantity: number) =>
    dispatch(updateCartItemThunk({ itemId, quantity })).unwrap();
  const handleRemove = (itemId: number) =>
    dispatch(removeCartItemThunk({ itemId })).unwrap();

  const guestHandleUpdateQuantity = (itemId: number, quantity: number) => {
    updateGuestCartQuantity(Math.abs(itemId), quantity);
    guest.refresh();
    return Promise.resolve();
  };
  const guestHandleRemove = (itemId: number) => {
    removeFromGuestCart(Math.abs(itemId));
    guest.refresh();
    return Promise.resolve();
  };

  if (!authChecked) {
    return <CartSkeleton />;
  }

  if (isAuthenticated) {
    if (authError && !authLoaded) {
      return <CartError onRetry={() => dispatch(fetchCartThunk())} />;
    }
    if (authLoading && !authLoaded) {
      return <CartSkeleton />;
    }
    return (
      <CartShell count={authItems.length}>
        {authItems.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
            <div className="divide-y divide-line">
              {authItems.map((line, i) => (
                <CartItemRow
                  key={line.id}
                  line={line}
                  index={i}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}
            </div>
            <CartSummary subtotal={authSubtotal} hasOutOfStock={hasOutOfStock} />
          </div>
        )}
      </CartShell>
    );
  }

  if (guest.loading) {
    return <CartSkeleton />;
  }

  if (guest.error) {
    return <CartError onRetry={guest.refresh} />;
  }

  const guestHasOOS = guest.items.some((i) => i.product.stockQuantity === 0);

  return (
    <CartShell count={guest.items.length}>
      {guest.items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div className="divide-y divide-line">
            {guest.items.map((line, i) => (
              <CartItemRow
                key={line.id}
                line={line}
                index={i}
                onUpdateQuantity={guestHandleUpdateQuantity}
                onRemove={guestHandleRemove}
              />
            ))}
          </div>
          <CartSummary subtotal={guest.subtotal} hasOutOfStock={guestHasOOS} />
        </div>
      )}
    </CartShell>
  );
}
