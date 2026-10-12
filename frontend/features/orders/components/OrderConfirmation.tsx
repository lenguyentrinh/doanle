'use client';

import Link from 'next/link';
import { formatPrice } from '@/lib/helpers';
import type { Order } from '@/features/orders/services/ordersAPI';
import OrderStatusTimeline from './OrderStatusTimeline';

interface Props {
  order: Order;
}

// Success state of the order-confirmation page. Renders the backend-computed
// totals as-is (no client recompute), matching the same discipline as
// ReviewStep.tsx. Reuses OrderStatusTimeline for the "what happens next"
// strip — it already renders the order's real status/timestamps, so it
// doubles as the confirmation timeline instead of a second, separately
// mocked one.
export default function OrderConfirmation({ order }: Props) {
  const { shippingAddress: address } = order;
  const firstName = address.firstName.trim().split(' ').pop() || address.firstName;

  return (
    <div className="flex w-full flex-col items-center gap-md text-center motion-safe:animate-fade-up">
      <span className="text-label-xs text-olive">Đặt hàng thành công</span>
      <h1 className="text-display-md text-ink">
        Cảm ơn, <em className="text-accent">{firstName}</em>
      </h1>
      <p className="max-w-[46ch] text-body-md text-ink-secondary">
        Đơn <span className="text-ink">#{order.id}</span> đang được chuẩn bị. Email xác nhận sẽ
        được gửi kèm mã vận đơn ngay khi hàng rời kho.
      </p>

      <div className="w-full max-w-[500px] rounded-2xl bg-fill p-6">
        <OrderStatusTimeline order={order} />
      </div>

      <div className="mx-auto w-full max-w-[500px] divide-y divide-line border-y border-line text-left">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-body-sm text-ink">{item.productName}</p>
              <p className="text-body-sm text-ink-muted">Số lượng {item.quantity}</p>
            </div>
            <p className="text-body-sm tabular-nums text-ink">
              {formatPrice(item.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      <dl className="mx-auto flex w-full max-w-[500px] flex-col gap-3 text-left">
        <div className="flex items-center justify-between">
          <dt className="text-body-sm text-ink-secondary">Tạm tính</dt>
          <dd className="text-body-sm tabular-nums text-ink">{formatPrice(order.subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-body-sm text-ink-secondary">Vận chuyển</dt>
          <dd className="text-body-sm tabular-nums text-ink">{formatPrice(order.shippingFee)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-body-sm text-ink-secondary">VAT</dt>
          <dd className="text-body-sm tabular-nums text-ink">{formatPrice(order.tax)}</dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between border-t border-line-strong pt-4">
          <dt className="text-body-lg text-ink">Tổng cộng</dt>
          <dd className="text-headline-sm tabular-nums text-ink">{formatPrice(order.total)}</dd>
        </div>
      </dl>

      <div className="mx-auto w-full max-w-[500px] text-left">
        <h2 className="mb-1 text-label-xs text-ink-secondary">Giao đến</h2>
        <p className="text-body-sm text-ink">
          {address.firstName} {address.lastName}
        </p>
        <p className="text-body-sm text-ink-secondary">{address.street}</p>
        <p className="text-body-sm text-ink-secondary">{address.city}</p>
      </div>

      <div className="flex w-full flex-col-reverse items-center gap-3 sm:w-auto sm:flex-row sm:justify-center">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-ink px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 sm:w-fit"
        >
          Xem đơn hàng
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-[54px] w-full items-center justify-center rounded-full border border-line-strong bg-transparent px-8 py-4 text-label-sm text-ink transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-ink hover:bg-fill focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 sm:w-fit"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  );
}
