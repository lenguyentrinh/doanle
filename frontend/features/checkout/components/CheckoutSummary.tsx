import { formatPrice } from '@/lib/helpers';
import { SHIPPING_FEE, TAX_RATE, calcTax, calcTotal } from '@/features/cart/constants';

interface Props {
  subtotal: number;
}

// Sticky order-summary card, visible alongside every checkout step (spec
// lines 618-627) — previously the subtotal/shipping/tax/total breakdown only
// showed up once, inline in ReviewStep. Reuses the same calc helpers as
// CartSummary/ReviewStep rather than recomputing shipping/tax.
export default function CheckoutSummary({ subtotal }: Props) {
  const tax = calcTax(subtotal);
  const total = calcTotal(subtotal);
  const taxPercent = Math.round(TAX_RATE * 100);

  return (
    <aside className="flex h-fit flex-col gap-6 rounded-2xl bg-fill p-5 sm:p-8 lg:sticky lg:top-28">
      <h2 className="text-label-xs text-ink-secondary">Tổng đơn hàng</h2>

      <dl className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <dt className="text-body-sm text-ink-secondary">Tạm tính</dt>
          <dd className="text-body-sm tabular-nums text-ink">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-body-sm text-ink-secondary">Vận chuyển</dt>
          <dd className="text-body-sm tabular-nums text-ink">{formatPrice(SHIPPING_FEE)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-body-sm text-ink-secondary">VAT ({taxPercent}%)</dt>
          <dd className="text-body-sm tabular-nums text-ink">{formatPrice(tax)}</dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between border-t border-line-strong pt-5">
          <dt className="text-body-lg text-ink">Tổng cộng</dt>
          <dd className="text-headline-md tabular-nums text-ink">{formatPrice(total)}</dd>
        </div>
      </dl>
    </aside>
  );
}
