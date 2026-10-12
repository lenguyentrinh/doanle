'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiSearch } from 'react-icons/fi';
import { formatPrice, formatDate, formatRelativeVi } from '@/lib/helpers';
import { showToast } from '@/lib/toast';
import {
  getAdminOrdersAPI,
  type AdminOrderSummary,
  type AdminOrderSort,
} from '@/features/admin/services/adminAPI';
import type { OrderStatus } from '@/features/orders/services/ordersAPI';
import OrderStatusBadge from '@/features/orders/components/OrderStatusBadge';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminStatStrip from '@/features/admin/components/AdminStatStrip';
import AdminSegmented from '@/features/admin/components/AdminSegmented';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminPagination from '@/features/admin/components/AdminPagination';
import { DEFAULT_PAGE_LIMIT } from '@/lib/pagination';

const SEARCH_DEBOUNCE_MS = 300;

// COD lifecycle stages as filter tabs (mirrors the shopper-facing
// app/orders tabs, plus a Cancelled tab an admin needs). Labels track the
// same COD display names as OrderStatusBadge. `dot` is each tab's own
// identity color when unselected (matches OrderStatusBadge's dot colors);
// selected tabs switch to accent-soft regardless of status.
const FILTER_TABS: { label: string; value: OrderStatus | 'all'; dot: string }[] = [
  { label: 'Tất cả', value: 'all', dot: 'bg-ink-faint' },
  { label: 'Chờ xác nhận', value: 'pending', dot: 'bg-alert' },
  { label: 'Đang chuẩn bị', value: 'confirmed', dot: 'bg-ink-secondary' },
  { label: 'Đang giao', value: 'shipped', dot: 'bg-accent' },
  { label: 'Đã giao', value: 'delivered', dot: 'bg-success' },
  { label: 'Đã hủy', value: 'cancelled', dot: 'bg-error-strong' },
];

// Left accent bar per row — same identity color as the filter tab dots.
const ROW_ACCENT: Record<OrderStatus, string> = {
  pending: 'bg-alert',
  confirmed: 'bg-line-strong',
  shipped: 'bg-accent',
  delivered: 'bg-success',
  cancelled: 'bg-error-strong',
};

// Customer-initials avatar tint, cycled by a deterministic name hash — same
// pattern as the Products table's category tint (§Tints in the handoff).
const TINTS: { bg: string; ink: string }[] = [
  { bg: 'bg-sand', ink: 'text-clay' },
  { bg: 'bg-success-bg', ink: 'text-success' },
  { bg: 'bg-alert-bg', ink: 'text-alert' },
  { bg: 'bg-fill-dark', ink: 'text-ink-secondary' },
  { bg: 'bg-error-bg', ink: 'text-error-strong' },
  { bg: 'bg-fill', ink: 'text-ink-muted' },
];

function tintForName(name: string): { bg: string; ink: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return TINTS[hash % TINTS.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase();
}

// Client Component, flat under app/admin/ (no route group) — matching every
// existing app/admin/* page. The server-side admin gate lives in layout.tsx.
export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AdminOrderSort>('newest');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Whole-catalog counters for the header chip + stat strip — the backend
  // computes these unfiltered by the current tab/search/sort/page
  // (§PaginatedAdminOrders), so no separate queries are needed here.
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    shippedOrders: 0,
    revenue: 0,
  });

  // Plain 300ms debounce (same as the products page — SearchBar has no
  // debounce to mirror). Resets to page 1 on a new query.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setLoading(true);
    getAdminOrdersAPI({
      status: filter === 'all' ? undefined : filter,
      search: search || undefined,
      sort,
      page,
      limit: DEFAULT_PAGE_LIMIT,
    })
      .then((res) => {
        if (!active) return;
        setOrders(res.data);
        setTotal(res.total);
        setStats({
          totalOrders: res.totalOrders,
          pendingOrders: res.pendingOrders,
          shippedOrders: res.shippedOrders,
          revenue: res.revenue,
        });
      })
      .catch(() => {
        if (!active) return;
        showToast.error('Không tải được đơn hàng');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, search, sort, page]);

  return (
    <div className="mx-auto flex w-full flex-col gap-[22px]">
      <AdminPageHeader title="Đơn hàng">
        <div className="flex items-center gap-2.5 rounded-full border border-line px-3.5 py-2">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-success motion-safe:animate-admin-pulse" />
          <span className="text-caption text-ink-secondary">
            {stats.pendingOrders} đơn chờ xác nhận
          </span>
        </div>
      </AdminPageHeader>

      <div
        className="motion-safe:animate-[rise_0.55s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ animationDelay: '0.04s' }}
      >
        <AdminStatStrip
          items={[
            { label: 'Tổng đơn', value: String(stats.totalOrders) },
            { label: 'Chờ xác nhận', value: String(stats.pendingOrders), tone: 'alert' },
            { label: 'Đang giao', value: String(stats.shippedOrders), tone: 'accent' },
            { label: 'Doanh thu', value: formatPrice(stats.revenue), tone: 'success', size: 'sm' },
          ]}
        />
      </div>

      <div
        className="flex flex-col gap-[14px] motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ animationDelay: '0.08s' }}
      >
        <nav
          className="flex flex-wrap gap-2 border-b border-line pb-4"
          aria-label="Lọc đơn hàng theo trạng thái"
        >
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setFilter(tab.value);
                  setPage(1);
                }}
                aria-pressed={active}
                className={`inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border px-4 py-2.5 text-label-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-accent ${
                  active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-secondary'
                }`}
              >
                <span aria-hidden="true" className={`size-[5px] shrink-0 rounded-full ${active ? 'bg-accent-soft' : tab.dot}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex h-12 items-center gap-2.5 rounded-full border border-line bg-fill px-[18px] transition-all duration-200 focus-within:border-line-strong focus-within:bg-white">
            <FiSearch aria-hidden="true" size={15} className="text-ink-muted" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã đơn hoặc khách hàng…"
              aria-label="Tìm đơn hàng"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <AdminSegmented
            options={[
              { value: 'newest', label: 'Mới nhất' },
              { value: 'oldest', label: 'Cũ nhất' },
            ]}
            value={sort}
            onChange={(value) => {
              setSort(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-body-md text-ink-muted">Đang tải đơn hàng…</p>
      ) : orders.length === 0 ? (
        <AdminEmptyState
          title="Không tìm thấy đơn hàng nào"
          description="Thử bỏ bộ lọc hoặc từ khoá khác."
        />
      ) : (
        <>
        <ul className="flex flex-col gap-3 md:hidden">
          {orders.map((order) => {
            const tint = tintForName(order.customerName);
            return (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-col gap-3 rounded-[16px] border border-line bg-white p-4 transition-colors duration-200 hover:bg-fill"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden="true" className={`h-[26px] w-[3px] shrink-0 rounded-full ${ROW_ACCENT[order.status]}`} />
                      <span className="font-display text-[17px] tabular-nums text-ink">#{order.id}</span>
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-[14px] leading-none ${tint.bg} ${tint.ink}`}
                    >
                      {initialsOf(order.customerName)}
                    </span>
                    <span className="min-w-0 truncate text-[14px] text-ink">{order.customerName}</span>
                  </div>
                  <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
                    <span className="flex min-w-0 flex-col gap-[2px]">
                      <span className="text-[13px] tabular-nums text-ink-secondary">{formatDate(order.createdAt)}</span>
                      <span className="text-[12px] text-ink-faint">{formatRelativeVi(order.createdAt)}</span>
                    </span>
                    <span className="font-display text-[17px] tabular-nums text-ink">{formatPrice(order.total)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <div
          className="hidden overflow-x-auto rounded-[16px] border border-line bg-white motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
          style={{ animationDelay: '0.12s' }}
        >
          <div className="min-w-[1020px]">
            <div className="grid grid-cols-[110px_minmax(0,1.5fr)_200px_170px_150px_110px] gap-4 border-b border-line-strong px-[22px] py-3.5">
              <span className="text-label-xs text-ink-muted">Mã đơn</span>
              <span className="text-label-xs text-ink-muted">Khách hàng</span>
              <span className="text-label-xs text-ink-muted">Trạng thái</span>
              <span className="text-label-xs text-ink-muted">Tổng tiền</span>
              <span className="text-label-xs text-ink-muted">Ngày</span>
              <span className="text-right text-label-xs text-ink-muted">Chi tiết</span>
            </div>

            {orders.map((order, i) => {
              const tint = tintForName(order.customerName);
              return (
                <div
                  key={order.id}
                  className={`grid grid-cols-[110px_minmax(0,1.5fr)_200px_170px_150px_110px] items-center gap-4 px-[22px] py-3.5 transition-colors duration-200 hover:bg-fill ${
                    i === orders.length - 1 ? 'border-b border-transparent' : 'border-b border-line'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true" className={`h-[26px] w-[3px] shrink-0 rounded-full ${ROW_ACCENT[order.status]}`} />
                    <span className="font-display text-[17px] tabular-nums text-ink">#{order.id}</span>
                  </span>

                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-[14px] leading-none ${tint.bg} ${tint.ink}`}
                    >
                      {initialsOf(order.customerName)}
                    </span>
                    <span className="truncate text-[14px] text-ink">{order.customerName}</span>
                  </span>

                  <span className="flex justify-center">
                    <OrderStatusBadge status={order.status} />
                  </span>

                  <span className="font-display text-[17px] tabular-nums text-ink">
                    {formatPrice(order.total)}
                  </span>

                  <span className="flex flex-col gap-[2px]">
                    <span className="text-[13px] tabular-nums text-ink-secondary">
                      {formatDate(order.createdAt)}
                    </span>
                    <span className="text-[12px] text-ink-faint">{formatRelativeVi(order.createdAt)}</span>
                  </span>

                  <span className="flex justify-end">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-2 text-label-xs text-ink transition-all duration-200 hover:gap-3 hover:text-accent"
                    >
                      Xem<span aria-hidden="true">→</span>
                    </Link>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        </>
      )}

      {!loading && total > 0 && (
        <AdminPagination page={page} total={total} limit={DEFAULT_PAGE_LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}
