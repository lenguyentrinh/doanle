'use client';

import Button from '@/components/Button';
import { formatPrice } from '@/lib/helpers';
import { SHIPPING_FEE } from '@/features/cart/constants';

const ACTIONS_ROW =
  'sticky bottom-0 -mx-5 border-t border-line bg-paper px-5 py-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0';

interface Props {
  onContinue: () => void;
}

// Step 2 — Delivery. Single pre-selected shipping option for the MVP; no
// carrier API call, nothing to configure. Styled as the same radio-card
// pattern as the payment method and saved-address cards below it.
export default function DeliveryStep({ onContinue }: Props) {
  return (
    <div className="flex flex-col gap-md">
      <h2 className="text-headline-md text-ink">Vận chuyển</h2>

      <label className="flex cursor-default items-center gap-3 rounded-[12px] border border-accent bg-fill px-5 py-4">
        <input type="radio" checked readOnly className="h-[18px] w-[18px] accent-accent" />
        <span className="flex min-w-0 flex-col">
          <span className="text-body-sm text-ink">Tiêu chuẩn — 3–5 ngày</span>
          <span className="text-body-sm text-ink-muted">{formatPrice(SHIPPING_FEE)}</span>
        </span>
      </label>

      <div className={ACTIONS_ROW}>
        <Button type="button" variant="primary" className="w-full sm:w-fit" onClick={onContinue}>
          Tiếp tục
        </Button>
      </div>
    </div>
  );
}
