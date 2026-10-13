'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import FreeShippingProgress from '@/features/cart/components/FreeShippingProgress';
import { formatPrice } from '@/lib/helpers';
import { SHIPPING_FEE, TAX_RATE, calcTax, calcTotal } from '@/features/cart/constants';
import { pushWithLoader } from '@/lib/navigationLoader';

interface Props {
  subtotal: number;
  hasOutOfStock?: boolean;
}

export default function CartSummary({ subtotal, hasOutOfStock = false }: Props) {
  const router = useRouter();
  const tax = calcTax(subtotal);
  const total = calcTotal(subtotal);
  const taxPercent = Math.round(TAX_RATE * 100);
  const checkoutTitle = hasOutOfStock
    ? 'Bỏ các sản phẩm hết hàng trước khi thanh toán.'
    : undefined;

  return (
    // Elevated summary panel: hairline border, rounded surface, resting card
    // shadow. Sticks alongside the scrolling item list on desktop.
    <aside className="flex h-fit flex-col gap-7 rounded-2xl bg-fill p-5 sm:p-8 lg:sticky lg:top-28">
      <h2 className="text-headline-md text-ink">Tóm tắt đơn</h2>

      <FreeShippingProgress subtotal={subtotal} />

      <dl className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <dt className="text-body-sm text-ink-secondary">Tạm tính</dt>
          <dd className="text-body-sm tabular-nums text-ink">
            {formatPrice(subtotal)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-body-sm text-ink-secondary">Vận chuyển</dt>
          <dd className="text-body-sm tabular-nums text-ink">
            {formatPrice(SHIPPING_FEE)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-body-sm text-ink-secondary">VAT ({taxPercent}%)</dt>
          <dd className="text-body-sm tabular-nums text-ink">
            {formatPrice(tax)}
          </dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between border-t border-line-strong pt-5">
          <dt className="text-body-lg text-ink">Tổng cộng</dt>
          <dd className="text-headline-md tabular-nums text-ink">
            {formatPrice(total)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        <Button
          variant="primary"
          disabled={hasOutOfStock}
          title={checkoutTitle}
          className="w-full"
          onClick={() => pushWithLoader(router, '/checkout')}
        >
          Thanh toán
        </Button>
        {hasOutOfStock && (
          <p className="text-center text-caption text-ink-muted">{checkoutTitle}</p>
        )}
        <Link
          href="/"
          className="mt-1 inline-flex w-full items-center justify-center py-2 text-label-sm text-ink underline decoration-line underline-offset-8 transition-colors duration-200 hover:decoration-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    </aside>
  );
}
