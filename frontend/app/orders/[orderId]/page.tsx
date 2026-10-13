'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { showToast } from '@/lib/toast';
import { formatDate, formatPrice, isObjectId } from '@/lib/helpers';
import { getOrderByIdAPI, type Order } from '@/features/orders/services/ordersAPI';
import OrderDetail, { orderHeadline } from '@/features/orders/components/OrderDetail';
import OrderStatusBadge from '@/features/orders/components/OrderStatusBadge';
import PageLoader from '@/components/PageLoader';

// Same canonical-id guard as order-confirmation/[orderId]/page.tsx and
// products/[id]/page.tsx's isValidId, duplicated locally (a 1-line check).
const isValidId = isObjectId; // route ids are Mongo ObjectIds

type ViewState = 'loading' | 'ready' | 'not-found';

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (typeof response?.data?.message === 'string') {
      return response.data.message;
    }
  }
  return 'Không tải được đơn hàng của bạn';
}

// Second client-rendered `[param]` route (after order-confirmation). Unlike
// the confirmation page, every status is a valid "ready" state here — a
// shopper can look up any of their own orders regardless of status.
export default function OrderDetailPage() {
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
        if (!result) {
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

  const effectiveState: ViewState = !validId ? 'not-found' : state;

  if (!authChecked || (isAuthenticated && effectiveState === 'loading')) {
    return <PageLoader label="Đang tải đơn hàng của bạn" />;
  }
  if (!isAuthenticated) return <PageLoader />;

  return (
    <div className="bg-paper">
      {effectiveState === 'ready' && order ? (
        <>
          {/* Cream editorial header band (spec lines 992-1016): back link,
              order no/date + headline on the left, grand total right-aligned. */}
          <div className="border-b border-line bg-fill">
            <div className="mx-auto w-full py-8 sm:py-10 lg:py-14 px-4 sm:px-6">
              <Link
                href="/orders"
                className="inline-flex min-h-10 items-center gap-2 text-body-sm text-ink-muted transition-colors duration-200 hover:text-accent"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M19 12H6" />
                  <path d="M11 6l-6 6 6 6" />
                </svg>
                Tất cả đơn hàng
              </Link>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
                <div className="flex min-w-0 max-w-full flex-col gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <span title={order.id} className="min-w-0 max-w-full truncate text-label-sm uppercase tabular-nums text-ink-muted">
                      Đơn #{order.id}
                    </span>
                    <span aria-hidden="true" className="hidden h-px w-3.5 bg-line-strong sm:block" />
                    <span className="text-body-sm text-ink-muted">{formatDate(order.createdAt)}</span>
                    <OrderStatusBadge status={order.status} className="max-sm:grow" />
                  </div>
                  <h1 className="text-display-md text-ink">{orderHeadline(order)}</h1>
                  <p className="text-body-sm text-ink-secondary">
                    Nếu có gì chưa đúng, bạn còn 30 ngày để đổi trả.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-label-xs text-ink-muted">Tổng cộng</span>
                  <span className="text-display-md tabular-nums text-ink">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <section className="mx-auto w-full lg:py-16">
            <OrderDetail order={order} />
          </section>
        </>
      ) : (
        <section className="mx-auto w-full max-w-[720px] py-16 lg:py-24">
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <span className="text-label-sm text-ink-muted">Không tìm thấy đơn hàng</span>
            <h1 className="text-display-lg text-ink">
              Không tìm thấy đơn hàng này
            </h1>
            <p className="text-body-md text-ink-muted">
              Đơn hàng bạn tìm không tồn tại hoặc không thuộc về bạn.
            </p>
            <Link
              href="/orders"
              className="mt-4 inline-flex min-h-[54px] items-center justify-center rounded-full bg-ink max-sm:w-full px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Về danh sách đơn hàng
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
