'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface AdminConfirmDialogProps {
  open: boolean;
  /** Eyebrow naming the action, e.g. "Xoá danh mục". */
  actionLabel: string;
  /** Headline naming the object being acted on. */
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Replaces window.confirm across the admin screens. Mirrors
// features/account/components/AddressFormModal.tsx's portal + scroll-lock
// pattern (lock documentElement, not body, or a stray page scrollbar
// lingers) and hooks/useFocusTrap.ts for Tab-cycling. The destructive button
// sits first in reading order (left) but focus lands on "cancel" by default
// — a destructive dialog shouldn't default-focus its own destructive action.
export default function AdminConfirmDialog({
  open,
  actionLabel,
  title,
  description,
  confirmLabel = 'Xoá vĩnh viễn',
  cancelLabel = 'Giữ lại',
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);

    const scroller = (document.scrollingElement as HTMLElement) || document.documentElement;
    const scrollbarWidth = window.innerWidth - scroller.clientWidth;
    const prevOverflow = scroller.style.overflow;
    const prevPaddingRight = scroller.style.paddingRight;
    scroller.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const basePadding = parseFloat(getComputedStyle(scroller).paddingRight) || 0;
      scroller.style.paddingRight = `${basePadding + scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      scroller.style.overflow = prevOverflow;
      scroller.style.paddingRight = prevPaddingRight;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] grid place-items-center bg-[rgba(47,37,30,0.42)] p-6 backdrop-blur-[3px] motion-safe:animate-overlay-in"
      onMouseDown={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] rounded-[18px] bg-white p-7 shadow-overlay motion-safe:animate-admin-modal-in"
      >
        <div className="flex flex-col gap-2.5">
          <span className="text-label-xs text-error-strong">{actionLabel}</span>
          <h2 id="admin-confirm-title" className="font-display text-[26px] text-ink">
            {title}
          </h2>
          <p className="text-body-sm text-ink-secondary">{description}</p>
        </div>
        <div className="flex gap-2.5 pt-[22px]">
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[46px] flex-1 rounded-full bg-error-strong text-label-xs text-white transition-colors duration-200 hover:bg-error focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-[46px] flex-1 rounded-full border border-line-strong text-label-xs text-ink-secondary transition-colors duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
