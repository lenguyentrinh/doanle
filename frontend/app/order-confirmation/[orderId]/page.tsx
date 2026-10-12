'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { showToast } from '@/lib/toast';
import { getOrderByIdAPI, type Order } from '@/features/orders/services/ordersAPI';
import OrderConfirmation from '@/features/orders/components/OrderConfirmation';
import { isObjectId } from '@/lib/helpers';

// The backend `:id` is Mongo ObjectId. Same canonical-id guard as
// products/[id]/page.tsx's isValidId, duplicated locally (a 1-line check,
// not worth extracting for a single other caller).
const isValidId = isObjectId; // route ids are Mongo ObjectIds

type ViewState = 'loading' | 'ready' | 'not-found';

// A Cash-on-Delivery order is placed straight into 'pending' ("awaiting
// admin confirmation"), so every non-cancelled status represents a real,
// successfully-placed order the shopper should see here — including a fresh
// pending one and any later stage (a shopper revisiting the link). Only a
// cancelled order is excluded.
const PLACED_STATUSES: Order['status'][] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
];

// Duck-types an axios-shaped error without needing an `instanceof` check
// (keeps this resilient to whatever `getOrderByIdAPI` rethrows).
function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } })
      .response;
    if (typeof response?.data?.message === 'string') {
      return response.data.message;
    }
  }
  return 'Không tải được đơn hàng của bạn';
}

// This is the app's first client-rendered dynamic route: existing `[param]`
// pages (products/[id], categories/[name]) are Server Components using the
// `params: Promise<...>` prop. That pattern doesn't apply to a 'use client'
// page — `useParams()` is the correct hook here, since the order lookup is
// an authenticated, cookie-JWT call that can't run server-side the same way.
export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { isAuthenticated, authChecked } = useRequireAuth();
  const validId = isValidId(orderId);
  const [state, setState] = useState<ViewState>('loading');
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!authChecked || !isAuthenticated || !validId) return;

    let cancelled = false;
    getOrderByIdAPI(orderId)
      .then((result) => {
        if (cancelled) return;
        if (!result || !PLACED_STATUSES.includes(result.status)) {
          setState('not-found');
          return;
        }
        setOrder(result);
        setState('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        showToast.error(extractErrorMessage(err));
        setState('not-found');
      });

    return () => {
      cancelled = true;
    };
  }, [authChecked, isAuthenticated, validId, orderId]);

  // An invalid id never resolves via the effect above — show the not-found
  // state immediately instead of a needless loading flash.
  const effectiveState: ViewState = !validId ? 'not-found' : state;

  if (!authChecked || (isAuthenticated && effectiveState === 'loading')) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <p className="text-body-md text-ink-muted">Đang tải đơn hàng của bạn...</p>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="bg-paper">
      <section className="mx-auto w-full max-w-[720px] px-5 py-10 sm:py-16 lg:px-10 lg:py-24">
        {effectiveState === 'ready' && order ? (
          <OrderConfirmation order={order} />
        ) : (
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <span className="text-label-sm text-ink-muted">Không tìm thấy đơn hàng</span>
            <h1 className="text-display-lg text-ink">
              Không tìm thấy đơn hàng này
            </h1>
            <p className="text-body-md text-ink-muted">
              Đơn hàng bạn tìm không tồn tại hoặc không còn khả dụng.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-[54px] items-center justify-center rounded-full bg-ink max-sm:w-full px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Về trang chủ
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
