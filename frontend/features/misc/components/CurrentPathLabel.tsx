'use client';

import { usePathname } from 'next/navigation';

// not-found.tsx is a Server Component and Next never passes it the requested
// URL, so the "path you just opened" line needs its own tiny client leaf.
export default function CurrentPathLabel() {
  const pathname = usePathname();
  return (
    <span className="text-[12px] leading-[1.5] tracking-[0.04em] text-ink-muted">
      Đường dẫn bạn vừa mở: {pathname}
    </span>
  );
}
