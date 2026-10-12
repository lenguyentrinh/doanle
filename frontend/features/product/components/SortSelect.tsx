'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import { PRODUCT_SORTS, SORT_LABELS } from '@/features/product/productFilters';
import type { ProductSort } from '@/types/product';

interface SortSelectProps {
  value: ProductSort | '';
  onChange: (value: ProductSort | '') => void;
}

// Options mirror the old native <select>: an empty value = "Mới nhất"
// (the backend default), then every named sort.
const OPTIONS: { value: ProductSort | ''; label: string }[] = [
  { value: '', label: 'Mới nhất' },
  ...PRODUCT_SORTS.map((s) => ({ value: s, label: SORT_LABELS[s] })),
];

// A custom listbox replacing the native <select>. Same state contract
// (value + onChange), fully styleable: sharp boxed trigger in the shared
// input voice, hairline floating panel with the single overlay shadow, an
// animated chevron, and quiet hover / focus / open / selected states.
// Implements the WAI-ARIA button + listbox popup pattern (aria-haspopup,
// aria-expanded, aria-activedescendant, roving highlight) with full keyboard
// support and click-outside to close.
export default function SortSelect({ value, onChange }: SortSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const selectedLabel = OPTIONS[selectedIndex].label;

  const openMenu = () => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const closeMenu = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  const select = (i: number) => {
    onChange(OPTIONS[i].value);
    closeMenu();
  };

  // Move focus into the listbox when it opens (the highlight is tracked via
  // aria-activedescendant, so the <ul> itself owns focus).
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Keep the highlighted option visible when navigating by keyboard.
  useEffect(() => {
    if (open) {
      optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  // Dismiss on any pointer press outside the control.
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
        setActiveIndex((i) => Math.min(OPTIONS.length - 1, i + 1));
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
        setActiveIndex(OPTIONS.length - 1);
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
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`Sắp xếp theo: ${selectedLabel}`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className={`flex h-[46px] w-full items-center justify-between gap-2 whitespace-nowrap rounded-full border border-line-strong bg-transparent px-[22px] text-[13.5px] text-ink transition-colors duration-200 hover:border-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 ${
          open ? 'border-ink' : ''
        }`}
      >
        <span className="truncate">Sắp xếp: {selectedLabel}</span>
        <FiChevronDown
          aria-hidden="true"
          size={12}
          className={`shrink-0 text-ink-muted transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label="Sắp xếp"
          aria-activedescendant={optionId(activeIndex)}
          onKeyDown={onListKeyDown}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-20 origin-top overflow-hidden rounded-[10px] border border-line bg-white p-1.5 shadow-card focus:outline-none motion-safe:animate-dropdown-in"
        >
          {OPTIONS.map((o, i) => {
            const active = i === activeIndex;
            const selected = i === selectedIndex;
            return (
              <li
                key={o.value || 'newest'}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                onClick={() => select(i)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 text-body-sm transition-colors duration-200 ${
                  active ? 'bg-fill text-ink' : 'text-ink-secondary'
                } ${selected ? 'font-medium text-ink' : ''}`}
              >
                <span className="truncate">{o.label}</span>
                {selected && (
                  <FiCheck
                    aria-hidden="true"
                    size={16}
                    className="shrink-0 text-accent"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
