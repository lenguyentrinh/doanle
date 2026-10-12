'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Wraps a home-page section so it fades up once scrolled into view, instead
// of every section being visible (and animating) at once on load. A safety
// timeout reveals anything still hidden after ~2.5s so a section can never
// be stranded invisible (observer misfire, reduced-motion edge cases, etc).
export default function ScrollReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => el.classList.add('is-revealed');
    const safety = window.setTimeout(reveal, 2500);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          window.clearTimeout(safety);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.04 },
    );
    observer.observe(el);

    return () => {
      window.clearTimeout(safety);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`opacity-0 translate-y-[30px] transition-[opacity,transform] duration-[850ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:opacity-100 motion-reduce:translate-y-0 [&.is-revealed]:opacity-100 [&.is-revealed]:translate-y-0 ${className}`}
    >
      {children}
    </div>
  );
}
