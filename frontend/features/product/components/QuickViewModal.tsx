'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuickView } from '@/features/product/context/QuickViewContext';
import QuickViewMagazine from './QuickViewMagazine';
import QuickViewTag from './QuickViewTag';

// 'tag'      — big photo with the details on a paper hang-tag tied to it.
// 'magazine' — a two-page magazine spread; the page curl flips to the next product.
const QUICK_VIEW_STYLE: 'tag' | 'magazine' = 'tag';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Product quick-view popup. Shell owns everything shared by both styles:
// portal, backdrop, scroll lock, Esc / arrow keys, swipe, focus trap + restore.
export default function QuickViewModal() {
  const { product, list, close, step } = useQuickView();
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const isOpen = product !== null;

  useEffect(() => {
    if (!isOpen) return;
    const { style } = document.documentElement;
    const previousOverflow = style.overflow;
    style.overflow = 'hidden';
    const trigger = document.activeElement as HTMLElement | null;

    // Focus the visible close button (the hidden breakpoint's copy is display:none).
    const visible = (el: HTMLElement) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
    dialogRef.current?.querySelectorAll<HTMLElement>('[data-qv-close]').forEach((el) => {
      if (visible(el) && document.activeElement !== el && !dialogRef.current?.contains(document.activeElement)) el.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Tab' && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      trigger?.focus?.();
    };
  }, [isOpen, close, step]);

  if (!product || typeof document === 'undefined') return null;

  const index = Math.max(0, list.findIndex((p) => p.id === product.id));
  const total = list.length;
  const View = QUICK_VIEW_STYLE === 'magazine' ? QuickViewMagazine : QuickViewTag;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      className="fixed inset-0 z-[95]"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (QUICK_VIEW_STYLE !== 'magazine' || touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
      }}
    >
      <div aria-hidden onClick={close} className="absolute inset-0 bg-[rgba(47,37,30,.6)] md:bg-[rgba(47,37,30,.55)] motion-safe:animate-overlay-in" />
      <View product={product} index={index} total={total} onClose={close} onStep={step} />
    </div>,
    document.body,
  );
}
