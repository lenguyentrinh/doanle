'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import type { AppDispatch } from '@/store/store';
import Button from '@/components/Button';
import ProductImage from '@/components/ProductImage';
import { formatPrice } from '@/lib/helpers';
import { PRODUCT_IMAGE_FALLBACK } from '@/lib/productImage';
import { calcTotal } from '@/features/cart/constants';
import { fetchCartThunk } from '@/features/cart/store/cartThunk';
import { createOrderAPI } from '@/features/orders/services/ordersAPI';
import type { CartLine } from '@/types/cart';
import type { CheckoutAddress } from '@/features/checkout/hooks/useCheckoutFlow';

const ACTIONS_ROW =
  'sticky bottom-0 -mx-5 border-t border-line bg-paper px-5 py-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0';

interface Props {
  items: CartLine[];
  subtotal: number;
  address: CheckoutAddress;
  orderId: string | null;
  idempotencyKey: string;
  onOrderCreated: (orderId: string) => void;
  onBack: () => void;
}

// Step 4 — Review & submit. "Place Order" creates the Cash-on-Delivery order
// exactly once per checkout session (idempotencyKey + the lifted `orderId`
// guard below). Placing the order commits it server-side (stock reserved,
// cart cleared) at status "Pending Confirmation" — an admin confirms it
// later. A transient failure leaves `orderId` in the parent's checkout state
// so a retry reuses the same order instead of creating a duplicate.
export default function ReviewStep({
  items,
  subtotal,
  address,
  orderId,
  idempotencyKey,
  onOrderCreated,
  onBack,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = calcTotal(subtotal);

  const handlePlaceOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let currentOrderId = orderId;
      if (!currentOrderId) {
        const created = await createOrderAPI({
          cartItems: items.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
          shippingAddressId: address.id,
          idempotencyKey,
        });
        currentOrderId = created.orderId;
        onOrderCreated(currentOrderId);
      }

      // Placing the order committed it server-side and emptied the server
      // cart. Re-sync from the server (keeps `loaded: true`, so the Header
      // badge reads the authenticated count and doesn't fall back to the
      // stale localStorage guest count) before heading to confirmation.
      dispatch(fetchCartThunk());
      router.push(`/order-confirmation/${currentOrderId}`);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Đã có lỗi xảy ra khi đặt hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-md">
      <h2 className="text-headline-md text-ink">Xác nhận đơn hàng</h2>

      <div className="divide-y divide-line border-y border-line">
        {items.map((line) => (
          <div key={line.id} className="flex items-center gap-3 py-4">
            <div className="relative aspect-[4/5] w-12 flex-none overflow-hidden rounded-sm bg-fill">
              <ProductImage
                src={line.product.imageUrl ?? PRODUCT_IMAGE_FALLBACK}
                alt={line.product.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words text-body-sm text-ink">{line.product.name}</p>
              <p className="text-body-sm text-ink-muted">Số lượng {line.quantity}</p>
            </div>
            <p className="flex-none text-body-sm tabular-nums text-ink">
              {formatPrice((line.product.discountPercentage ? line.product.finalPrice : line.product.price) * line.quantity)}
            </p>
          </div>
        ))}
      </div>

      <div className="min-w-0 break-words">
        <h3 className="mb-1 text-label-xs text-ink-secondary">Giao đến</h3>
        <p className="text-body-sm text-ink">
          {address.firstName} {address.lastName}
        </p>
        <p className="text-body-sm text-ink-secondary">{address.street}</p>
        <p className="text-body-sm text-ink-secondary">{address.city}</p>
      </div>

      {error && (
        <p role="alert" className="rounded-[10px] border-l-2 border-error bg-error-bg px-4 py-3.5 text-body-sm text-error-strong">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-sm sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="-my-2 w-fit border-b border-line py-2 text-label-sm text-ink-secondary transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Quay lại
        </button>
        <div className={ACTIONS_ROW}>
          <Button
            type="button"
            variant="primary"
            className="w-full gap-2.5 sm:w-fit"
            disabled={submitting}
            onClick={handlePlaceOrder}
          >
            {submitting && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            )}
            {submitting ? 'Đang xử lý...' : `Đặt hàng — ${formatPrice(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
