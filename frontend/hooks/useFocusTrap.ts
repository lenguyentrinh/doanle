'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab/Shift+Tab focus inside `ref` while the dialog is open, moves focus
 * to the first focusable element on mount, and restores focus to the previously
 * active element on cleanup.
 *
 * @param ref         The dialog element ref.
 * @param enabled     `true` while the dialog is open.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const triggerElement = document.activeElement as HTMLElement | null;
    const dialog = ref.current;

    const getFocusable = () =>
      dialog
        ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        : [];

    const firstFocusable = getFocusable()[0];
    (firstFocusable ?? dialog)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialog) return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      triggerElement?.focus();
    };
  }, [ref, enabled]);
}
