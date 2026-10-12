'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import ProductImage from '@/components/ProductImage';

interface CategoryCarouselProps {
  categories: { category: string; count: number; imageUrl: string | null }[];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
// Enough copies that the track always covers viewport + one loop width, even
// with only a couple of categories. Only copy 0 is exposed to assistive tech.
const COPIES = 6;
const SPEED = 40; // px per second
const RESUME_DELAY = 3500; // ms of idle after a manual action before autoplay resumes
const STEP_DURATION = 550; // ms for the prev/next glide
const DRAG_THRESHOLD = 6; // px before a press counts as a drag, not a click

const ARROW_CLASSES =
  'absolute top-[calc(50%-40px)] z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/94 text-ink shadow-hero backdrop-blur-md transition-colors duration-200 hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// The track is moved with a transform rather than scrollLeft: scrollLeft is
// quantised to whole pixels, which makes a ~40px/s drift visibly stutter.
export default function CategoryCarousel({ categories }: CategoryCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const loopWidth = useRef(0);
  const hovering = useRef(false);
  const pausedUntil = useRef(0);
  const glide = useRef<{ from: number; to: number; start: number } | null>(null);
  const drag = useRef<{ startX: number; startPos: number; id: number } | null>(null);
  const moved = useRef(false);

  const pause = (ms = RESUME_DELAY) => {
    pausedUntil.current = performance.now() + ms;
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const measure = () => {
      loopWidth.current = track.scrollWidth / COPIES;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;

      const g = glide.current;
      if (g) {
        const t = Math.min((now - g.start) / STEP_DURATION, 1);
        pos.current = g.from + (g.to - g.from) * easeOutCubic(t);
        if (t >= 1) glide.current = null;
      } else if (
        !drag.current &&
        !hovering.current &&
        now >= pausedUntil.current &&
        !reduceMotion
      ) {
        pos.current += (SPEED * dt) / 1000;
      }

      const w = loopWidth.current;
      if (w > 0) {
        const offset = ((pos.current % w) + w) % w;
        track.style.transform = `translate3d(${-offset}px,0,0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [categories.length]);

  const step = (dir: 1 | -1) => {
    const card = trackRef.current?.querySelector<HTMLElement>('[data-card]');
    const from = pos.current;
    glide.current = {
      from,
      to: from + dir * (card?.offsetWidth ?? 240),
      start: performance.now(),
    };
    pause();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    glide.current = null;
    moved.current = false;
    drag.current = { startX: e.clientX, startPos: pos.current, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.startX;
    if (!moved.current && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!moved.current) e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = true;
    pos.current = d.startPos - dx;
  };

  const endDrag = () => {
    if (drag.current) pause();
    drag.current = null;
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
      onFocus={() => pause(6000)}
    >
      <button
        type="button"
        aria-label="Danh mục trước"
        onClick={() => step(-1)}
        className={`${ARROW_CLASSES} left-2`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Danh mục tiếp theo"
        onClick={() => step(1)}
        className={`${ARROW_CLASSES} right-2`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div
        className="select-none overflow-hidden pb-2.5 [touch-action:pan-y]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          // A drag that ends over a card must not also follow its link.
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {Array.from({ length: COPIES }).flatMap((_, copy) =>
            categories.map(({ category, count, imageUrl }, i) => (
              <Link
                key={`${copy}-${category}`}
                data-card
                draggable={false}
                href={`/products?category=${encodeURIComponent(category)}`}
                aria-hidden={copy !== 0 ? true : undefined}
                tabIndex={copy !== 0 ? -1 : undefined}
                className="group box-content flex w-[clamp(180px,20vw,282px)] shrink-0 flex-col gap-4 pr-[clamp(12px,1.5vw,20px)]"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-fill-dark oren-arch-sm">
                  {imageUrl && (
                    <ProductImage
                      src={imageUrl}
                      alt=""
                      fill
                      draggable={false}
                      sizes="282px"
                      className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:scale-[1.07]"
                    />
                  )}
                  <span className="absolute left-[18px] top-[22px] font-display text-[15px] italic text-white/85 [text-shadow:0_1px_6px_rgba(63,49,40,0.5)]">
                    {ROMAN[i]}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2.5 border-t border-line pt-[13px]">
                  <span className="font-display text-[23px] font-medium leading-[1.2] tracking-[-0.012em] text-ink">
                    {category}
                  </span>
                  <span className="text-[12px] tabular-nums text-ink-muted">{count} mẫu</span>
                </div>
              </Link>
            )),
          )}
        </div>
      </div>
    </div>
  );
}
