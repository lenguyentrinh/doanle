'use client';

import { useEffect, useState } from 'react';

// Cubic ease-out count-up from 0 to `target` on mount, used by the dashboard
// hero revenue number and metric card values so they feel freshly pulled
// rather than static. `cancelAnimationFrame` on unmount/target-change avoids
// a leaked rAF loop writing state after the component is gone.
export function useCountUp(target: number, ms = 1100): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}
