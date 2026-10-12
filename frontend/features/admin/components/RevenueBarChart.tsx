import { formatPrice } from '@/lib/helpers';

// `date` is the backend's YYYY-MM-DD string — split directly rather than
// `new Date(date)` (which parses as UTC midnight and can render a day off
// depending on the viewer's timezone).
function toShortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

// 14 CSS bars, no charting library — height is each day's revenue relative
// to the window's peak day. Staggered grow-in on mount only (no lib means no
// built-in "animate once" guard, so this relies on the parent never
// remounting this component on data refresh).
export default function RevenueBarChart({
  daily,
}: {
  daily: { date: string; total: number }[];
}) {
  const peak = Math.max(0, ...daily.map((d) => d.total));
  const markerIndices = [0, Math.floor((daily.length - 1) / 2), daily.length - 1];

  return (
    <div className="relative z-[2] flex min-w-0 flex-col justify-end gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[.2em] text-white/45">
          14 ngày gần nhất
        </span>
        <span className="font-display text-[13px] italic text-accent-soft">
          đỉnh {formatPrice(peak)}
        </span>
      </div>
      <div className="flex h-[150px] items-end gap-1.5">
        {daily.map((d, i) => (
          <span key={d.date} className="relative flex h-full flex-1 items-end">
            <span
              className={`w-full origin-bottom rounded-t-[4px] motion-safe:animate-admin-grow ${
                d.total === peak && peak > 0 ? 'bg-accent-soft' : 'bg-accent-soft/42'
              }`}
              style={{
                height: peak > 0 ? `${(d.total / peak) * 100}%` : '0%',
                animationDelay: `${i * 45}ms`,
              }}
            />
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] tracking-[.14em] text-white/35">
        {markerIndices.map((i) => (
          <span key={i}>{toShortDate(daily[i].date)}</span>
        ))}
      </div>
    </div>
  );
}
