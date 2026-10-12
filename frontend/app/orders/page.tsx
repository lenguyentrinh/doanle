'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { showToast } from '@/lib/toast';
import { getOrdersAPI, type Order, type OrderStatus } from '@/features/orders/services/ordersAPI';
import OrderHistoryList from '@/features/orders/components/OrderHistoryList';
import OrderHistoryListSkeleton from '@/features/orders/components/OrderHistoryListSkeleton';
import AdminPagination from '@/features/admin/components/AdminPagination';
import { DEFAULT_PAGE_LIMIT } from '@/lib/pagination';

const FILTER_TABS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Chờ xác nhận', value: 'pending' },
  { label: 'Đang chuẩn bị', value: 'confirmed' },
  { label: 'Đang giao', value: 'shipped' },
  { label: 'Đã giao', value: 'delivered' },
];

// 3 headline stats + per-tab counts, computed client-side from whatever
// orders are already in hand (Story 4.4's `orders` list) rather than a new
// endpoint. `orders` only holds the current filter's page(s) though, so — to
// keep counts correct across every tab regardless of which filter is active
// — a separate one-off "all statuses" snapshot (capped at the API's max
// limit of 100) is fetched once on mount purely to drive these numbers.
function countByStatus(list: Order[], status: OrderStatus | 'all'): number {
  return status === 'all' ? list.length : list.filter((o) => o.status === status).length;
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (typeof response?.data?.message === 'string') {
      return response.data.message;
    }
  }
  return 'Không tải được đơn hàng của bạn';
}

// Flat under app/ (no app/(shop)/ route group), matching every Epic 4 page.
// Local-state filter (not URL params) — no AC requires a shareable filtered
// view, this mirrors AddressPreview.tsx's client-fetch-on-mount pattern.
export default function OrdersPage() {
  const { isAuthenticated, authChecked } = useRequireAuth();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsOrders, setStatsOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!authChecked || !isAuthenticated) return;
    let active = true;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setLoading(true);
    getOrdersAPI({
      status: filter === 'all' ? undefined : filter,
      page,
      limit: DEFAULT_PAGE_LIMIT,
    })
      .then((res) => {
        if (!active) return;
        setOrders(res.data);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        if (!active) return;
        showToast.error(extractErrorMessage(err));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authChecked, isAuthenticated, filter, page]);

  useEffect(() => {
    if (!authChecked || !isAuthenticated) return;
    getOrdersAPI({ page: 1, limit: 100 })
      .then((res) => setStatsOrders(res.data))
      .catch(() => {
        /* Stats/counts are a decorative enhancement — a failure here shouldn't
           block the list itself, which already surfaces its own error toast. */
      });
  }, [authChecked, isAuthenticated]);

  if (!authChecked) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <p className="text-body-md text-ink-muted">Đang tải đơn hàng của bạn...</p>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const isEmpty = !loading && orders.length === 0;

  return (
    <div className="bg-paper">
      <section className="mx-auto w-full">
        <header className="mb-10 border-b border-line pb-6">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <span className="text-label-xs text-accent">Lịch sử mua</span>
              <h1 className="mt-2 text-display-lg text-ink">Đơn hàng</h1>
            </div>
            <dl className="flex gap-6 sm:gap-8">
              {[
                { key: 'total', label: 'Tổng đơn', value: statsOrders.length },
                { key: 'shipped', label: 'Đang giao', value: countByStatus(statsOrders, 'shipped') },
                { key: 'delivered', label: 'Đã giao', value: countByStatus(statsOrders, 'delivered') },
              ].map((stat) => (
                <div key={stat.key} className="flex flex-col gap-1">
                  <dd className="text-display-md tabular-nums text-ink">{stat.value}</dd>
                  <dt className="text-label-xs text-ink-muted">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <nav
            className="mt-6 flex flex-wrap gap-x-2 gap-y-2"
            aria-label="Lọc đơn hàng theo trạng thái"
          >
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setFilter(tab.value);
                  setPage(1);
                }}
                aria-pressed={filter === tab.value}
                className={`relative flex items-center gap-2 min-h-10 rounded-full px-4 py-2 text-label-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  filter === tab.value ? 'bg-accent text-white' : 'bg-fill text-ink-secondary hover:text-ink'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums leading-none ${
                    filter === tab.value ? 'bg-white/25 text-white' : 'bg-white text-ink-muted'
                  }`}
                >
                  {countByStatus(statsOrders, tab.value)}
                </span>
              </button>
            ))}
          </nav>
        </header>

        {loading ? (
          <OrderHistoryListSkeleton />
        ) : isEmpty ? (
          filter === 'all' ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center gap-6 rounded-2xl bg-fill text-center">
              <p className="text-body-md text-ink-muted">
                Chưa có đơn hàng nào. Bắt đầu mua sắm nhé!
              </p>
              <Link
                href="/"
                className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-ink max-sm:w-full px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Mua sắm ngay
              </Link>
            </div>
          ) : (
            <p className="rounded-2xl bg-fill py-12 text-center text-body-md text-ink-muted">
              Chưa có đơn nào ở mục này.
            </p>
          )
        ) : (
          <OrderHistoryList orders={orders} />
        )}

        {!loading && total > 0 && (
          <AdminPagination page={page} total={total} limit={DEFAULT_PAGE_LIMIT} onPageChange={setPage} />
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-fill px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-1">
            <span className="text-headline-sm text-ink">Cần hỗ trợ một đơn?</span>
            <span className="text-body-sm text-ink-secondary">
              Đổi trả trong 30 ngày &middot; sửa chữa miễn phí trọn đời.
            </span>
          </div>
          <a
            href="mailto:hello@oren.store"
            className="break-all text-body-sm text-accent transition-colors duration-200 hover:text-accent-strong"
          >
            hello@oren.store
          </a>
        </div>
      </section>
    </div>
  );
}
