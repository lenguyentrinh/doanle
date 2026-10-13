'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import PageLoader from '@/components/PageLoader';
import { NAVIGATION_START_EVENT } from '@/lib/navigationLoader';

// Safety net so a navigation that never lands (error, cancelled) can't leave
// the overlay stuck on screen.
const MAX_VISIBLE_MS = 15000;

// Next's loading.tsx only shows for server-suspended segments; most pages here
// resolve client-side, so clicking a link left the old/empty content in place
// with just the header and footer. This listens for in-app link clicks, covers
// the content area with <PageLoader /> straight away (it fades in after a short
// delay so instant navigations never flash it) and removes it once the URL
// actually changes. Rendered inside <Suspense> by LayoutShell because it reads
// useSearchParams.
export default function NavigationLoader() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const routeKey = `${pathname}?${search}`;
  const routeKeyRef = useRef(routeKey);
  // The route we were on when a link was clicked. The overlay shows for as long
  // as the URL still equals it; once the route changes it simply stops matching.
  const [fromKey, setFromKey] = useState<string | null>(null);
  // Route moved on: drop the stale marker during render (React's documented
  // alternative to a setState-in-effect), so coming back to the same URL later
  // doesn't resurrect the overlay.
  if (fromKey !== null && fromKey !== routeKey) setFromKey(null);
  const navigating = fromKey !== null && fromKey === routeKey;

  useEffect(() => {
    routeKeyRef.current = routeKey;
  }, [routeKey]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setFromKey(routeKeyRef.current);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Code-driven navigations (lib/navigationLoader) raise the same overlay.
  useEffect(() => {
    const onStart = (e: Event) => {
      const href = (e as CustomEvent<{ href?: string }>).detail?.href;
      if (href) {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      }
      setFromKey(routeKeyRef.current);
    };
    window.addEventListener(NAVIGATION_START_EVENT, onStart);
    return () => window.removeEventListener(NAVIGATION_START_EVENT, onStart);
  }, []);

  useEffect(() => {
    if (!navigating) return;
    const timer = setTimeout(() => setFromKey(null), MAX_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [navigating]);

  if (!navigating) return null;

  return <PageLoader />;
}
