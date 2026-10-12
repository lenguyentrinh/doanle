import { formatDate } from '@/lib/helpers';
import type { Order } from '@/features/orders/services/ordersAPI';

type TimelineStep = 'pending' | 'confirmed' | 'shipped' | 'delivered';

const STEPS: { key: TimelineStep; label: string }[] = [
  { key: 'pending', label: 'Đã đặt' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'shipped', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
];

const STEP_INDEX: Record<TimelineStep, number> = {
  pending: 0,
  confirmed: 1,
  shipped: 2,
  delivered: 3,
};

function timestampFor(order: Order, key: TimelineStep): string | null {
  switch (key) {
    case 'pending':
      return order.createdAt;
    case 'confirmed':
      return order.confirmedAt;
    case 'shipped':
      return order.shippedAt;
    case 'delivered':
      return order.deliveredAt;
  }
}

// Pending → Confirmed → Shipped → Delivered, each step marked complete (with
// its timestamp, if known) or pending. A cancelled order doesn't fit this
// linear model — it gets a distinct block instead (Story 4.4 AC #6).
export default function OrderStatusTimeline({ order }: { order: Order }) {
  if (order.status === 'cancelled') {
    return (
      <div className="rounded-[12px] border border-line p-4 sm:p-6">
        <p className="text-label-sm text-error-strong">Đơn hàng đã bị hủy</p>
      </div>
    );
  }

  const currentIndex = STEP_INDEX[order.status as TimelineStep] ?? 0;
  // Percentage along the track the accent fill should reach: 0% at "Đã đặt",
  // 100% once "Đã giao" is reached. Matches the spec's single continuous
  // track bar (lines 1022-1030) rather than per-segment connectors.
  const progressPct = (currentIndex / (STEPS.length - 1)) * 100;

  // Horizontal stepper mirroring the checkout CheckoutSteps indicator, so the
  // order's progression reads the same way as the checkout flow. A single
  // hairline track spans the full width behind every circle, with an
  // accent-colored fill overlay sized to current progress — not short
  // per-segment connectors — so the line reads as one continuous bar.
  // Future steps show an empty circle (no step number).
  return (
    <div className="relative flex items-start">
      <span
        aria-hidden="true"
        className="absolute left-[12.5%] right-[12.5%] top-[8px] h-px bg-line"
      />
      <span
        aria-hidden="true"
        className="absolute left-[12.5%] top-[8px] h-px bg-accent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: `${progressPct * 0.75}%` }}
      />
      <ol className="relative flex w-full flex-wrap justify-between gap-y-4">
        {STEPS.map((step, i) => {
          const completed = i <= currentIndex;
          const timestamp = timestampFor(order, step.key);
          return (
            <li
              key={step.key}
              className="flex min-w-0 flex-1 sm:min-w-[76px] flex-col items-center gap-3 text-center"
            >
              <span
                aria-hidden="true"
                className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full ${
                  completed ? 'bg-accent' : 'border border-line-strong bg-white'
                }`}
              >
                {completed && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" aria-hidden>
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                )}
              </span>
              <div className="flex flex-col gap-1">
                <span
                  aria-current={completed && i === currentIndex ? 'step' : undefined}
                  className={`text-label-sm max-sm:text-[10px] max-sm:tracking-[0.08em] ${completed ? 'text-ink' : 'text-ink-muted'}`}
                >
                  {step.label}
                </span>
                {completed && timestamp && (
                  <span className="break-words text-caption text-ink-muted sm:text-body-sm">{formatDate(timestamp)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
