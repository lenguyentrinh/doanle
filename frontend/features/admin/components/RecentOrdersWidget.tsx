import Link from 'next/link';
import { formatPrice, formatDate } from '@/lib/helpers';
import OrderStatusBadge from '@/features/orders/components/OrderStatusBadge';
import type { RecentOrderSummary } from '../services/adminAPI';

// Initials from the first word's first letter + the last word's first
// letter (e.g. "Nguyễn Thùy Linh" -> "NL"), matching the design reference.
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Row links to /admin/orders/:id, which 404s until Story 5.4 ships — an
// expected, sequencing-driven gap (see story Dev Notes), not a bug.
export default function RecentOrdersWidget({
  orders,
}: {
  orders: RecentOrderSummary[];
}) {
  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-[18px] sm:px-[22px]">
        <h2 className="text-label-xs text-ink-secondary">Đơn gần đây</h2>
        <Link
          href="/admin/orders"
          className="text-label-xs text-ink-muted transition-colors duration-200 hover:text-accent"
        >
          Tất cả đơn
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="px-[22px] py-6 text-body-sm text-ink-muted">
          Chưa có đơn nào.
        </p>
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/admin/orders/${order.id}`}
                className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-[22px] transition-colors duration-200 hover:bg-fill focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fill font-display text-[15px] leading-none text-ink-secondary">
                  {getInitials(order.customerName)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="truncate text-[14px] text-ink">{order.customerName}</span>
                  <span className="truncate text-caption text-ink-muted">
                    Đơn #{order.id} · {formatDate(order.createdAt)} · {order.itemCount} sản phẩm
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                  <span className="font-display text-[17px] tabular-nums text-ink">
                    {formatPrice(order.total)}
                  </span>
                  <OrderStatusBadge status={order.status} compact />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
