'use client';

import { formatPrice } from '@/lib/helpers';
import { useCountUp } from '../hooks/useCountUp';
import RevenueBarChart from './RevenueBarChart';

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toLocaleString('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

// Revenue hero: this month's headline number (count-up on mount) + delta vs
// last month, 3 supporting stats, and a 14-day bar chart. Everything here
// comes from AdminDashboardStats — no hardcoded example values.
export default function RevenueHeroPanel({
  revenue,
  previousMonthRevenue,
  daily,
  averageOrderValue,
  deliveredOrders,
  cancelRate,
}: {
  revenue: number;
  previousMonthRevenue: number;
  daily: { date: string; total: number }[];
  averageOrderValue: number;
  deliveredOrders: number;
  cancelRate: number;
}) {
  const animatedRevenue = useCountUp(revenue);
  const deltaPct =
    previousMonthRevenue > 0 ? (revenue - previousMonthRevenue) / previousMonthRevenue : null;

  return (
    <div className="relative grid gap-7 overflow-hidden rounded-xl bg-ink-soft p-8 shadow-hero lg:grid-cols-[1.05fr_1fr]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[40%] -left-[10%] aspect-square w-[46%] rounded-full bg-accent opacity-[.22] blur-[80px] motion-safe:animate-drift"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-[30px] right-11 aspect-[0.72] w-[150px] rounded-t-[50%] border border-white/8"
      />

      <div className="relative z-[2] flex min-w-0 flex-col justify-between gap-[22px]">
        <span className="text-label-xs text-accent-soft">Doanh thu tháng này</span>

        <div className="flex flex-col gap-3.5">
          <span className="font-display text-[clamp(38px,4.4vw,62px)] leading-[1.02] tracking-[-0.026em] tabular-nums text-white">
            {formatPrice(animatedRevenue)}
          </span>
          {deltaPct !== null && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft/16 px-3 py-[5px] text-[11px] font-semibold text-accent-soft">
                {deltaPct >= 0 ? '↑' : '↓'} {formatPercent(Math.abs(deltaPct))}
              </span>
              <span className="text-body-sm text-white/55">
                so với tháng trước · {formatPrice(previousMonthRevenue)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-[26px] border-t border-white/12 pt-[18px]">
          <span className="flex flex-col gap-[5px]">
            <span className="text-[10px] uppercase tracking-[.2em] text-white/45">
              Giá trị đơn TB
            </span>
            <span className="font-display text-[19px] tabular-nums text-white">
              {formatPrice(averageOrderValue)}
            </span>
          </span>
          <span className="flex flex-col gap-[5px]">
            <span className="text-[10px] uppercase tracking-[.2em] text-white/45">
              Đơn đã giao
            </span>
            <span className="font-display text-[19px] tabular-nums text-white">
              {deliveredOrders}
            </span>
          </span>
          <span className="flex flex-col gap-[5px]">
            <span className="text-[10px] uppercase tracking-[.2em] text-white/45">Tỷ lệ huỷ</span>
            <span className="font-display text-[19px] tabular-nums text-white">
              {formatPercent(cancelRate)}
            </span>
          </span>
        </div>
      </div>

      {daily.length > 0 && <RevenueBarChart daily={daily} />}
    </div>
  );
}
