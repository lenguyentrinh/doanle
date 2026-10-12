'use client';

import { useEffect, useState } from 'react';
import type { HomeHero } from '../../types/homeHero';
import { HeroCtas, HeroEyebrow, HeroImage, HeroSubtitle, HeroTitle } from './heroParts';

const AUTOPLAY_MS = 5500;

// Auto-playing slider. Motion is a CSS transform on a flex track (not
// scrollLeft); autoplay pauses on hover/focus and is off entirely under
// prefers-reduced-motion.
export default function SliderHero({ hero }: { hero: HomeHero }) {
  const images = hero.images;
  const count = images.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused, reduced, index]);

  const go = (next: number) => setIndex(((next % count) + count) % count);

  return (
    <section
      className="relative isolate min-h-[clamp(520px,calc(100vh-124px),720px)] overflow-hidden bg-fill-dark scroll-mt-3 [scroll-snap-align:start]"
      aria-roledescription="carousel"
      aria-label="Ảnh nổi bật"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="absolute inset-0 -z-20 flex transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-full min-w-full"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            aria-hidden={i !== index}
          >
            <HeroImage src={src} priority={i === 0} sizes="100vw" />
          </div>
        ))}
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/65 via-black/35 to-black/10 max-lg:from-black/60 max-lg:via-black/45 max-lg:to-black/40" />

      <div className="mx-auto flex min-h-[inherit] w-full max-w-[1480px] flex-col justify-center gap-7 px-[clamp(16px,3.4vw,44px)] py-24 lg:gap-[34px]">
        <HeroEyebrow text={hero.eyebrow} tone="dark" />
        <HeroTitle text={hero.title} tone="dark" className="max-w-[16ch]" />
        <HeroSubtitle text={hero.subtitle} tone="dark" />
        <HeroCtas primary={hero.primaryCta} secondary={hero.secondaryCta} tone="dark" />
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Ảnh trước"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:left-5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Ảnh sau"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:right-5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Chuyển đến ảnh ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  i === index ? 'w-7 bg-white' : 'w-2.5 bg-white/55 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
