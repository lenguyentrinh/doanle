import type { OrderStatus } from '@/features/orders/services/ordersAPI';

// Cash-on-Delivery lifecycle labels, kept in one place so the history list
// and the detail timeline never disagree. The internal status codes are
// unchanged; only their display names track the COD stages: pending="Chờ
// xác nhận" (awaiting admin), confirmed="Đang chuẩn bị", shipped="Đang
// giao", delivered="Đã giao". shipped gets the solid accent pill (the one
// "in progress, on its way" state) matching the Orders list spec; the rest
// use the existing semantic tints.
// dotClassName mirrors each status's text color (or, for the solid "shipped"
// pill, a translucent white) so the dot reads as "this status's color" rather
// than an arbitrary extra hue.
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string; dotClassName: string }
> = {
  pending: { label: 'Chờ xác nhận', className: 'text-alert bg-alert-bg', dotClassName: 'bg-alert' },
  confirmed: {
    label: 'Đang chuẩn bị',
    className: 'text-ink-secondary bg-fill',
    dotClassName: 'bg-ink-secondary',
  },
  shipped: { label: 'Đang giao', className: 'bg-accent text-white', dotClassName: 'bg-white/80' },
  delivered: { label: 'Đã giao', className: 'text-success bg-success-bg', dotClassName: 'bg-success' },
  cancelled: {
    label: 'Đã hủy',
    className: 'text-error-strong bg-error-bg',
    dotClassName: 'bg-error-strong',
  },
};

export default function OrderStatusBadge({
  status,
  compact = false,
}: {
  status: OrderStatus;
  /** Self-sizing pill (`w-auto`) instead of the fixed 160px width — used
   * where the badge sits inline with other content (e.g. the admin
   * dashboard's recent orders row) rather than in a column that needs
   * every row's badge to line up at the same width. */
  compact?: boolean;
}) {
  const { label, className, dotClassName } = STATUS_CONFIG[status];
  const sizing = compact ? 'w-auto px-[11px] tracking-[.18em]' : 'w-auto px-3 sm:w-[168px]';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full py-1 text-label-xs ${sizing} ${className}`}
    >
      <span aria-hidden="true" className={`h-[5px] w-[5px] shrink-0 rounded-full ${dotClassName}`} />
      {label}
    </span>
  );
}
