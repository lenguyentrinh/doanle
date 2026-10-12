import { FREE_SHIPPING_THRESHOLD } from '@/features/cart/constants';
import { formatPrice } from '@/lib/helpers';

interface Props {
  subtotal: number;
}

// Free-shipping progress bar — shared by CartDrawer and the full /cart page's
// CartSummary so the threshold math, copy and track/fill colors stay in one
// place. Track is --color-sand, fill is --color-accent (design handoff).
export default function FreeShippingProgress({ subtotal }: Props) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="h-1 overflow-hidden rounded-full bg-sand">
        <span
          className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-body-sm text-ink-secondary">
        {remaining > 0
          ? `Thêm ${formatPrice(remaining)} để được miễn phí giao hàng.`
          : 'Đơn của bạn được miễn phí giao hàng tiêu chuẩn.'}
      </p>
    </div>
  );
}
