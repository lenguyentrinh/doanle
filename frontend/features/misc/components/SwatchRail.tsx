import Link from 'next/link';

type Swatch = {
  label: string;
  bg: string;
  ink: string;
  height: number;
  rotate: number;
  sway: string;
  /** Hidden below this breakpoint so the rail never squeezes on narrow screens. */
  visibleFrom?: 'sm' | 'md';
  /** The empty "gap on the shelf" slot — dashed outline, no fill, no link. */
  isGap?: boolean;
};

const SWATCHES: Swatch[] = [
  { label: 'Áo', bg: 'bg-sand', ink: 'text-clay', height: 168, rotate: -7, sway: '7.5s', visibleFrom: 'md' },
  { label: 'Váy', bg: 'bg-olive-soft', ink: 'text-ink', height: 196, rotate: -3, sway: '8.5s' },
  { label: 'Trang bạn tìm', bg: 'bg-transparent', ink: 'text-accent', height: 232, rotate: 0, sway: '9.5s', isGap: true },
  { label: 'Đầm', bg: 'bg-accent-soft', ink: 'text-ink', height: 196, rotate: 3, sway: '8s' },
  { label: 'Phụ kiện', bg: 'bg-accent', ink: 'text-white', height: 168, rotate: 7, sway: '7s', visibleFrom: 'sm' },
  { label: 'Hàng mới', bg: 'bg-fill', ink: 'text-ink-secondary', height: 144, rotate: 11, sway: '6.5s', visibleFrom: 'md' },
];

// Card width:height is a fixed 0.62 ratio; both dimensions scale together
// with viewport width (0.62x at narrow, 1x at ≥1200px) via one clamp() each,
// so no JS/ResizeObserver is needed to match the design's breakpoint table.
function dimension(height: number, ratio: number) {
  const min = height * ratio * 0.62;
  const max = height * ratio;
  const vw = (height * ratio * 100) / 1200;
  return `clamp(${min.toFixed(1)}px, ${vw.toFixed(3)}vw, ${max.toFixed(1)}px)`;
}

const visibilityClass: Record<NonNullable<Swatch['visibleFrom']>, string> = {
  sm: 'hidden min-[620px]:flex',
  md: 'hidden min-[900px]:flex',
};

// The 404 page's centerpiece: a rail of warm swatch "cards" standing in for
// the store shelf, with a dashed, text-stroked gap where the missing page
// should be. Pure CSS animation + hover — no client JS needed.
export default function SwatchRail() {
  return (
    <div className="flex items-end justify-center gap-[clamp(6px,1.2vw,16px)] pb-2">
      {SWATCHES.map((s, i) => {
        const delay = `${i * 90 + 200}ms`;
        const cardClassName = s.isGap
          ? 'relative flex flex-col items-center justify-end gap-2 overflow-hidden rounded-t-[50%] rounded-b-[12px] border border-dashed border-line-strong p-[16px_12px]'
          : `relative flex flex-col items-center justify-end gap-2 overflow-hidden rounded-t-[50%] rounded-b-[12px] border border-[rgba(63,49,40,0.06)] p-[16px_12px] shadow-[0_26px_50px_-28px_rgba(150,110,78,0.5)] transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-4 hover:shadow-[0_40px_70px_-34px_rgba(0,0,0,0.6)] ${s.bg}`;

        const card = (
          <div
            className={cardClassName}
            style={{ width: dimension(s.height, 0.62), height: dimension(s.height, 1) }}
          >
            {s.isGap && (
              <span
                aria-hidden
                className="absolute inset-0 grid place-items-center font-display text-[clamp(38px,5vw,64px)] font-medium leading-none"
                style={{ color: 'transparent', WebkitTextStroke: '1px rgba(192,95,60,0.55)' }}
              >
                404
              </span>
            )}
            <span className={`relative text-label-xs text-center ${s.ink}`}>{s.label}</span>
          </div>
        );

        return (
          <span
            key={s.label}
            className={`${s.visibleFrom ? visibilityClass[s.visibleFrom] : 'flex'} motion-safe:animate-swatch-in motion-reduce:animate-none`}
            // The standalone `rotate` property (not `transform: rotate()`) so the
            // swatch-in keyframe — which animates `transform` — can't clobber it;
            // `rotate` and `transform` compose independently in the render pipeline.
            style={{ rotate: `${s.rotate}deg`, animationDelay: delay }}
          >
            <span
              className="block motion-safe:animate-sway motion-reduce:animate-none"
              style={{ animationDuration: s.sway, animationDelay: delay }}
            >
              {s.isGap ? card : <Link href="/products">{card}</Link>}
            </span>
          </span>
        );
      })}
    </div>
  );
}
