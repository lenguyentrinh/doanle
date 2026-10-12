'use client';

import { useEffect, useState } from 'react';
import { FiSliders, FiX } from 'react-icons/fi';
import ProductFilters from './ProductFilters';
import type { CurrentFilters } from '@/features/product/productFilters';

interface MobileFilterSheetProps {
  categories: { category: string; count: number }[];
  totalDesignCount: number;
  priceFloor: number;
  priceCeil: number;
  current: CurrentFilters;
  activeCount: number;
  filterKey: string;
}

// Below md, the sticky sidebar has nowhere to sit — it used to render as a
// full-width block above the grid, pushing every product below the fold.
// This swaps that for a trigger bar + bottom sheet holding the same
// ProductFilters panel (variant="sheet" strips its own card framing since
// the sheet already supplies the surface).
export default function MobileFilterSheet({
  categories,
  totalDesignCount,
  priceFloor,
  priceCeil,
  current,
  activeCount,
  filterKey,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const { style } = document.documentElement;
    const previousOverflow = style.overflow;
    style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-8 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-fill text-label-sm text-ink transition-colors duration-200 hover:border-line-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <FiSliders aria-hidden="true" size={16} />
        Bộ lọc
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-medium leading-none text-white"
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bộ lọc"
          className="fixed inset-0 z-50"
        >
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 motion-safe:animate-overlay-in"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-overlay motion-safe:animate-sheet-in">
            <div className="mb-5 flex items-center justify-between border-b border-line pb-5">
              <h2 className="text-headline-sm text-ink">Bộ lọc</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng bộ lọc"
                className="text-ink-muted transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <FiX aria-hidden="true" size={20} />
              </button>
            </div>
            <ProductFilters
              key={filterKey}
              categories={categories}
              totalDesignCount={totalDesignCount}
              priceFloor={priceFloor}
              priceCeil={priceCeil}
              current={current}
              variant="sheet"
              onApplied={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
