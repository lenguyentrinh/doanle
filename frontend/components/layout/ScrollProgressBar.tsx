'use client';

import { useEffect, useState } from 'react';

// 2px terracotta bar fixed at the very top of the viewport, filling with
// how far down the document the reader has scrolled. Above the header's
// z-50 so it stays visible while scrolling past the sticky chrome.
export default function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed left-0 top-0 z-[100] h-[2px] bg-accent transition-[width] duration-100 ease-linear"
      style={{ width: `${progress}%` }}
    />
  );
}
