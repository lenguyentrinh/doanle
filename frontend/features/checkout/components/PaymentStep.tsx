'use client';

import { FiTruck } from 'react-icons/fi';
import Button from '@/components/Button';
import { formatPrice } from '@/lib/helpers';
import { calcTotal } from '@/features/cart/constants';

const ACTIONS_ROW =
  'sticky bottom-0 -mx-5 border-t border-line bg-paper px-5 py-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0';

interface Props {
  subtotal: number;
  onContinue: () => void;
}

// Step 3 — Payment. Cash on Delivery is the only method (MVP): the courier
// collects payment on delivery, so there is no online gateway, no card fields
// and no outcome to simulate. The single option is pre-selected; "Continue"
// just advances to Review, where placing the order commits it.
export default function PaymentStep({ subtotal, onContinue }: Props) {
  const total = calcTotal(subtotal);

  return (
    <div className="flex flex-col gap-md">
      <h2 className="text-headline-md text-ink">Thanh toán</h2>

      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <span className="text-body-md text-ink-secondary">Số tiền cần trả</span>
        <span className="text-headline-sm tabular-nums text-ink">{formatPrice(total)}</span>
      </div>

      <fieldset className="flex flex-col gap-sm">
        <legend className="mb-1 text-label-xs text-ink-secondary">Phương thức thanh toán</legend>
        <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-accent bg-fill p-4">
          <input
            type="radio"
            name="payment-method"
            className="h-[18px] w-[18px] accent-accent"
            checked
            readOnly
          />
          <FiTruck aria-hidden="true" size={18} className="shrink-0 text-ink" />
          <span className="flex flex-col">
            <span className="text-body-sm text-ink">Thanh toán khi nhận hàng (COD)</span>
            <span className="text-body-sm text-ink-muted">Trả tiền mặt cho shipper khi nhận hàng</span>
          </span>
        </label>
      </fieldset>

      <div className={ACTIONS_ROW}>
        <Button type="button" variant="primary" className="w-full sm:w-fit" onClick={onContinue}>
          Tiếp tục
        </Button>
      </div>
    </div>
  );
}
