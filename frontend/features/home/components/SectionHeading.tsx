import type { ReactNode } from 'react';

// Shared header for the three home-page sections — a big italic numeral
// beside the title, a 72px accent tick anchored to the start of the
// underline. The underline is border-line-strong (not border-ink): full ink
// at this weight reads too harsh against the cream ground.
export default function SectionHeading({
  num,
  title,
  right,
  headingId,
}: {
  num?: string;
  title: string;
  right?: ReactNode;
  headingId?: string;
}) {
  return (
    <div className="relative flex items-end justify-between gap-6 border-b border-line-strong pb-5">
      <span aria-hidden className="absolute bottom-[-1px] left-0 h-px w-[72px] bg-accent" />
      <div className="flex items-baseline gap-5">
        {num && (
          <span
            aria-hidden
            className="font-display text-[clamp(48px,6vw,84px)] font-medium italic leading-[0.74] tracking-[-0.02em] text-line"
          >
            {num}
          </span>
        )}
        <h2
          id={headingId}
          className="font-display text-[clamp(34px,4.4vw,60px)] font-medium leading-none tracking-[-0.024em] text-ink"
        >
          {title}
        </h2>
      </div>
      {right && <div className="flex items-baseline gap-[22px] pb-1.5">{right}</div>}
    </div>
  );
}
