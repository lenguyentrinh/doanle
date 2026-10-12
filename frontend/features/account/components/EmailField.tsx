'use client';

import { useEffect, useRef, useState } from 'react';

interface EmailFieldProps {
  /** Full email address to display. */
  email: string;
  /** Field label (matches the editorial input label rhythm). */
  label?: string;
  /** id for the label association. */
  id?: string;
}

// Read-only email display for the account profile card. The email is immutable,
// so it renders as truncating text (not an <input>, which clips without an
// ellipsis). When the address is too long to fit, it truncates with "..." and a
// subtle tooltip below reveals the full address on hover/focus. The tooltip only
// exists when the text is actually truncated.
export default function EmailField({ email, label = 'Email', id = 'email' }: EmailFieldProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  // Truncation is layout-dependent, so re-measure on mount, when the email
  // changes, and whenever the field is resized.
  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;

    const measure = () => setIsTruncated(el.scrollWidth > el.clientWidth + 1);
    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [email]);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-label-xs text-ink-secondary">
        {label}
      </label>

      <div className="relative">
        <span
          ref={valueRef}
          id={id}
          // Focusable only when truncated, so keyboard users can reveal the full
          // address; aria-label always carries the complete value for AT.
          tabIndex={isTruncated ? 0 : undefined}
          aria-label={isTruncated ? email : undefined}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className="block w-full truncate border-0 border-b border-line-strong py-2.5 text-body-md text-ink outline-none transition-colors duration-200 focus-visible:border-accent"
        >
          {email}
        </span>

        {isTruncated && (
          <div
            role="tooltip"
            aria-hidden="true"
            className={`absolute left-0 top-full z-20 mt-2 max-w-[min(22rem,80vw)] break-all rounded-sm bg-ink px-3 py-1.5 text-caption leading-snug text-paper shadow-overlay transition duration-200 ease-out motion-reduce:transition-none ${
              open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
            }`}
          >
            {email}
          </div>
        )}
      </div>
    </div>
  );
}
