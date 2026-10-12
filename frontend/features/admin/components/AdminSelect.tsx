'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';

interface AdminSelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface AdminSelectProps<T extends string | number> {
  options: AdminSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

// Custom listbox replacing the native <select> — an OS-styled dropdown looks
// out of place next to the rest of the admin form. Mirrors
// features/product/components/SortSelect.tsx's WAI-ARIA button+listbox
// pattern (aria-activedescendant roving highlight, full keyboard support,
// click-outside/Escape to close), restyled to the hairline-trigger,
// dot-indicator voice the admin handoff calls for.
export default function AdminSelect<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className = '',
}: AdminSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const selectedLabel = options[selectedIndex]?.label ?? '';

  const openMenu = () => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const closeMenu = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  const select = (i: number) => {
    onChange(options[i].value);
    closeMenu();
  };

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openMenu();
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        select(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`${ariaLabel}: ${selectedLabel}`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className={`flex w-full items-center justify-between gap-2 border-b py-2.5 text-[14px] text-ink transition-colors duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? 'border-accent' : 'border-line-strong'
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <FiChevronDown
          aria-hidden="true"
          size={14}
          className={`shrink-0 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={optionId(activeIndex)}
          onKeyDown={onListKeyDown}
          className="absolute top-[calc(100%+10px)] z-20 max-h-[264px] w-full max-w-[320px] overflow-y-auto rounded-[14px] border border-line bg-white p-1.5 shadow-card-hover focus:outline-none motion-safe:animate-rise"
        >
          {options.map((option, i) => {
            const active = i === activeIndex;
            const selected = i === selectedIndex;
            return (
              <li
                key={option.value}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                onClick={() => select(i)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-[9px] px-3.5 py-2.5 text-[14px] transition-colors duration-200 ${
                  active || selected ? 'bg-fill text-ink' : 'text-ink-secondary'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full ${selected ? 'bg-accent' : 'bg-line-strong'}`}
                />
                <span className="truncate">{option.label}</span>
                {selected && (
                  <FiCheck aria-hidden="true" size={14} className="ml-auto shrink-0 text-accent" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
