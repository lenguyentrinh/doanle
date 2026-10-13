import Image from 'next/image';
import Link from 'next/link';
import { formatDate, formatPrice } from '@/lib/helpers';
import type { Order } from '@/features/orders/services/ordersAPI';
import OrderStatusBadge from './OrderStatusBadge';

// Mirrors OrderStatusBadge's own labels so the serif summary line ("3 sản
// phẩm · Đã giao") never disagrees with the pill next to it.
const STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đang chuẩn bị',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

// "Item count" = total units across lines, matching cartSlice's
// selectCartCount convention (sum of quantities), not order.items.length.
function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

// Overlapping thumbnail cluster (spec lines 693-697): a single item gets one
// full-size 4:5 thumb; multiple items stack up to 3 small thumbs with a white
// ring so they read as a deck rather than a flat row.
//
// The two branches render at different total widths (52px for one item vs.
// up to 112px for a 3-item deck) — left un-wrapped, that difference shifted
// the text column that follows it left/right depending on each order's item
// count. Both branches now sit inside one fixed-width, left-aligned slot
// (112px, sized for the widest/3-item case) so the text always starts at the
// same x position regardless of how many items an order has.
function OrderThumbCluster({ order }: { order: Order }) {
  const items = order.items.slice(0, 3);
  return (
    <div className="flex h-16 w-[84px] shrink-0 items-center sm:w-[112px]">
      {items.length <= 1 ? (
        <div className="relative h-16 w-[52px] overflow-hidden rounded-lg bg-fill">
          {items[0]?.productImageUrl && (
            <Image
              src={items[0].productImageUrl}
              alt={items[0].productName}
              fill
              sizes="52px"
              className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            />
          )}
        </div>
      ) : (
        <div className="flex items-center pl-1 sm:pl-3">
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{ zIndex: items.length - i }}
              className={`relative aspect-[4/5] w-9 shrink-0 sm:w-11 overflow-hidden rounded-md bg-fill ring-2 ring-white ${
                i > 0 ? '-ml-4' : ''
              }`}
            >
              {item.productImageUrl && (
                <Image
                  src={item.productImageUrl}
                  alt={item.productName}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrderHistoryList({ orders }: { orders: Order[] }) {
  return (
    <ul className="divide-y divide-line border-t border-line">
      {orders.map((order, i) => {
        const count = itemCount(order);
        return (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              // Subtle staggered entrance (capped so long lists don't drag);
              // collapses to static under prefers-reduced-motion via motion-safe:.
              style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
              className="group flex items-center gap-3 py-5 transition-colors sm:gap-4 duration-200 hover:bg-fill focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 motion-safe:animate-fade-up"
            >
              <OrderThumbCluster order={order} />

              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p title={order.id} className="truncate text-label-sm uppercase text-ink-muted">
                    Đơn #{order.id}
                  </p>
                  <p className="mt-1 truncate text-product text-ink">
                    {count} sản phẩm &middot; {STATUS_LABEL[order.status]}
                  </p>
                  <p className="mt-1 text-body-sm text-ink-muted">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-body-sm tabular-nums text-ink">
                    {formatPrice(order.total)}
                  </span>
                  <OrderStatusBadge status={order.status} className="max-sm:grow" />
                  <svg
                    aria-hidden="true"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="hidden shrink-0 text-line-strong transition-colors duration-200 group-hover:text-accent sm:block"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
