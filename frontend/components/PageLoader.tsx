// Route-transition loader shown while the next page is still loading. Quiet
// on purpose: the "Oren" wordmark breathes letter by letter, a needle runs
// along a dashed stitch line beneath it, and a thin terracotta bar sweeps
// across the top. It fades in after a short delay so fast navigations never
// flash it. All motion is gated behind motion-safe; reduced-motion users get
// the static wordmark and label.
const LETTERS = ['O', 'r', 'e', 'n'];

export default function PageLoader({ label = 'Đang tải trang' }: { label?: string }) {
  return (
    // A fixed, viewport-sized layer (below the sticky header, z-50) so the
    // loader is always dead centre of the screen — never pinned to the top or
    // bottom of whatever container it happens to render in.
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-7 bg-paper/95 px-5 motion-safe:animate-[fade-in_0.3s_ease_0.15s_both]"
    >
      <span
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] overflow-hidden bg-transparent"
      >
        <span className="block h-full w-1/3 rounded-full bg-accent motion-safe:animate-[loader-bar_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
      </span>

      <div className="flex flex-col items-center gap-5">
        <span
          aria-hidden
          className="flex font-display text-[clamp(52px,12vw,76px)] font-light italic leading-none tracking-[0.04em] text-ink"
        >
          {LETTERS.map((letter, i) => (
            <span
              key={letter}
              className="inline-block motion-safe:animate-[loader-letter_1.8s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {letter}
            </span>
          ))}
        </span>

        <span aria-hidden className="relative block h-3 w-[min(220px,60vw)]">
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-[1.5px] border-dashed border-line-strong" />
          <span className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_0_4px_rgba(192,95,60,0.15)] motion-safe:animate-[loader-run_1.6s_ease-in-out_infinite_alternate]" />
        </span>
      </div>

      <p className="flex items-baseline gap-0.5 text-label-sm text-ink-secondary">
        {label}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className="motion-safe:animate-[loader-dot_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            .
          </span>
        ))}
      </p>
    </div>
  );
}
