export interface AdminStatItem {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'alert' | 'fill' | 'accent';
  /** Currency strings run longer than plain counts — 'sm' fits the row. */
  size?: 'lg' | 'sm';
}

const TONE_CLASSES: Record<
  NonNullable<AdminStatItem['tone']>,
  { card: string; value: string }
> = {
  default: { card: 'border-line bg-white', value: 'text-ink' },
  success: { card: 'border-success-line bg-success-bg', value: 'text-success' },
  alert: { card: 'border-alert-line bg-alert-bg', value: 'text-alert' },
  fill: { card: 'border-line bg-fill', value: 'text-ink' },
  // Orders screen's "Đang giao" tile: neutral fill card, but the number
  // itself is the one accent-colored figure in the strip.
  accent: { card: 'border-line bg-fill', value: 'text-accent' },
};

export default function AdminStatStrip({ items }: { items: AdminStatItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const tone = TONE_CLASSES[item.tone ?? 'default'];
        return (
          <div
            key={item.label}
            className={`flex items-center justify-between gap-3.5 rounded-[14px] border px-[18px] py-4 ${tone.card}`}
          >
            <span className="min-w-0 text-label-sm text-ink-secondary">{item.label}</span>
            <span
              className={`shrink-0 font-display tabular-nums ${item.size === 'sm' ? 'text-[20px]' : 'text-[28px]'} ${tone.value}`}
            >
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
