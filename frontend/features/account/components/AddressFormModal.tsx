'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import AddressForm from './AddressForm';

interface AddressFormModalProps {
  addressId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// Popup wrapper around AddressForm. Keeps the shopper on the account page while
// adding/editing. Esc + backdrop close, body scroll locked while open.
export default function AddressFormModal({
  addressId = null,
  onClose,
  onSaved,
}: AddressFormModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Lock the REAL scroll container (usually <html>, not <body>) so the page
    // scrollbar doesn't linger behind the modal. Compensate its width so the
    // page doesn't shift when the scrollbar is removed.
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
      document.removeEventListener('keydown', onKey);
      scroller.style.overflow = prevOverflow;
      scroller.style.paddingRight = prevPaddingRight;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-md">
      <div
        className="absolute inset-0 bg-ink/40"
        aria-hidden="true"
        onMouseDown={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-form-title"
        tabIndex={-1}
        className="motion-safe:animate-account-rise relative z-10 flex max-h-[90dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-overlay"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-md top-md z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:bg-fill hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <FiX size={20} />
        </button>
        {/* Scroll lives here, not on the bordered box: the modal sizes to its
            content and only this region scrolls when content truly exceeds the
            capped height. min-h-0 lets it shrink inside the flex column. */}
        <div className="min-h-0 overflow-y-auto p-8">
          <AddressForm
            addressId={addressId}
            onSuccess={onSaved}
            onCancel={onClose}
            titleId="address-form-title"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
