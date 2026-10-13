import Image from 'next/image';
import { formatPrice } from '@/lib/helpers';
import type { Order, OrderItem } from '@/features/orders/services/ordersAPI';
import { useAddToCart } from '@/features/product/hooks/useAddToCart';
import OrderStatusTimeline from './OrderStatusTimeline';

// No live chat/ticket system exists — a real functioning mailto link stands
// in for "Contact support" per the story's "developer's choice" allowance.
const SUPPORT_EMAIL = 'hello@oren.store';

// Shared with app/orders/[orderId]/page.tsx's cream header band, so the
// headline copy there and the body content here never drift apart.
export function orderHeadline(order: Order): string {
  return order.status === 'delivered'
    ? 'Đơn của bạn đã đến nơi.'
    : order.status === 'cancelled'
      ? 'Đơn hàng này đã bị hủy.'
      : 'Đơn của bạn đang trên đường.';
}

// "Mua lại" re-adds this exact line item to the cart via the same
// add-to-cart path as the PDP/ProductCard buttons (useAddToCart) — no
// separate "reorder whole order" endpoint exists, so this is per-item.
function OrderItemRow({ item }: { item: OrderItem }) {
  const { addToCart, status } = useAddToCart();
  return (
    <li className="flex items-stretch gap-4 border-t border-line py-5 first:border-t-0">
      <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg bg-fill sm:w-28">
        {item.productImageUrl && (
          <Image
            src={item.productImageUrl}
            alt={item.productName}
            fill
            sizes="112px"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1">
        <div>
          <p className="break-words text-product text-ink">{item.productName}</p>
          <p className="mt-1 text-body-sm text-ink-muted">Số lượng {item.quantity}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => addToCart(item.productId, 1)}
            disabled={status === 'adding'}
            className="-my-2 border-b border-line-strong py-2 text-label-xs text-ink-secondary transition-all duration-200 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'adding' ? 'Đang thêm…' : 'Mua lại'}
          </button>
          <span className="text-body-sm tabular-nums text-ink">{formatPrice(item.price)}</span>
        </div>
      </div>
    </li>
  );
}

export default function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 motion-safe:animate-fade-up lg:grid-cols-[1.6fr_1fr]">
      <div className="flex min-w-0 flex-col gap-5">
        <section aria-label="Trạng thái đơn hàng" className="rounded-[18px] border border-line bg-white p-5 sm:p-7">
          <h2 className="mb-5 font-display text-[18px] text-ink">Trạng thái đơn hàng</h2>
          <OrderStatusTimeline order={order} />
          <p className="mt-4 text-caption text-ink-muted">
            Email thông báo cho đơn hàng này sẽ được gửi trong ít phút. Nếu không thấy, vui lòng kiểm tra thư mục spam.
          </p>
        </section>

        <section aria-label="Sản phẩm" className="rounded-[18px] border border-line bg-white p-5 sm:p-7">
          <h2 className="mb-2 font-display text-[18px] text-ink">Sản phẩm</h2>
          <ul>
            {order.items.map((item) => (
              <OrderItemRow key={item.id} item={item} />
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <section aria-label="Địa chỉ giao hàng" className="rounded-[18px] border border-line bg-white p-5 sm:p-7">
            <h2 className="mb-2.5 font-display text-[16px] text-ink">Giao đến</h2>
            <address className="flex flex-col gap-0.5 break-words text-body-sm not-italic text-ink-secondary">
              <span>
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </span>
              <span>{order.shippingAddress.street}</span>
              <span>{order.shippingAddress.city}</span>
            </address>
            <p className="mt-3 text-caption text-ink-muted">Thanh toán khi nhận hàng (COD)</p>
          </section>

          <section
            aria-label="Hỗ trợ"
            className="flex flex-col justify-center gap-2.5 rounded-[18px] bg-fill p-5 sm:p-7"
          >
            <h2 className="font-display text-[16px] text-ink">Cần hỗ trợ?</h2>
            <p className="text-body-sm text-ink-secondary">
              Có gì chưa đúng với đơn này, viết cho Oren.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="-my-2 w-fit max-sm:w-full max-sm:text-center border-b border-line-strong py-2 text-label-sm text-ink transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Liên hệ hỗ trợ
            </a>
          </section>
        </div>
      </div>

      <section
        aria-label="Hoá đơn"
        className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-9 rounded-[18px] border border-line bg-white p-5 sm:p-6"
      >
        <span className="text-label-xs text-ink-secondary">Hoá đơn</span>
        <div className="flex justify-between text-body-sm text-ink-secondary">
          <span>Tạm tính</span>
          <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-body-sm text-ink-secondary">
          <span>Vận chuyển</span>
          <span className="tabular-nums">{formatPrice(order.shippingFee)}</span>
        </div>
        <div className="flex justify-between text-body-sm text-ink-secondary">
          <span>VAT</span>
          <span className="tabular-nums">{formatPrice(order.tax)}</span>
        </div>
        <div className="flex justify-between border-t border-dashed border-line-strong pt-3">
          <span className="whitespace-nowrap font-display text-[16px] text-ink">Tổng cộng</span>
          <span className="whitespace-nowrap font-display text-[20px] tabular-nums text-ink">
            {formatPrice(order.total)}
          </span>
        </div>
      </section>
    </div>
  );
}
