'use client';

import { useCountUp } from '../hooks/useCountUp';

const CHIP_TONE_CLASSES: Record<'success' | 'alert' | 'neutral', string> = {
  success: 'bg-success-bg text-success',
  alert: 'bg-alert-bg text-alert',
  neutral: 'bg-fill text-ink-secondary',
};

const TONE_CLASSES: Record<'default' | 'alert', { card: string; sparkBar: string }> = {
  default: { card: 'bg-white border-line', sparkBar: 'bg-line-strong' },
  alert: { card: 'bg-alert-bg border-alert-line', sparkBar: 'bg-alert-soft' },
};

// Metric card: label + status chip, a count-up value with a 7-bar sparkline,
// and a note line. Chip stays `whitespace-nowrap`/`shrink-0` and the label
// keeps `min-w-0` with the top row pinned to `min-h-[34px]` — without all
// three, a long label or a chip that wraps to 2 lines pushes the 3-card grid
// out of baseline alignment (hit twice while building this).
export default function MetricCard({
  label,
  value,
  format = (n: number) => String(Math.round(n)),
  chip,
  chipTone = 'neutral',
  note,
  spark,
  tone = 'default',
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  chip?: string;
  chipTone?: 'success' | 'alert' | 'neutral';
  note?: string;
  /** 7 values, each 0..1, tallest = 1 — rendered as a small trend sparkline. */
  spark?: number[];
  tone?: 'default' | 'alert';
}) {
  const animated = useCountUp(value);
  const toneClasses = TONE_CLASSES[tone];

  return (
    <div
      className={`flex flex-col gap-3.5 rounded-lg border p-5 transition-all duration-300 hover:-translate-y-[3px] hover:shadow-card ${toneClasses.card}`}
    >
      <div className="flex min-h-[34px] items-start justify-between gap-3">
        <span className="min-w-0 text-label-sm text-ink-secondary">{label}</span>
        {chip && (
          <span
            className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10px] font-semibold ${CHIP_TONE_CLASSES[chipTone]}`}
          >
            {chip}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <span className="font-display text-[38px] tabular-nums text-ink">{format(animated)}</span>
        {spark && spark.length > 0 && (
          <span className="flex h-[30px] items-end gap-[3px]">
            {spark.map((v, i) => (
              <span
                key={i}
                className={`w-[5px] rounded-[2px] ${toneClasses.sparkBar}`}
                style={{ height: `${Math.max(4, Math.round(v * 30))}px` }}
              />
            ))}
          </span>
        )}
      </div>

      {note && <span className="text-caption text-ink-muted">{note}</span>}
    </div>
  );
}
