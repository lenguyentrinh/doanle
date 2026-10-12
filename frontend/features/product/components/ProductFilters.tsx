'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FiCheck } from 'react-icons/fi';
import SortSelect from './SortSelect';
import { formatPrice } from '@/lib/helpers';
import { type CurrentFilters } from '@/features/product/productFilters';
import type { ProductSort } from '@/types/product';

// Real-money step: the catalog's whole price range spans hundreds of
// thousands to several million VND — a "10" step (leftover from an old
// 0–500 placeholder range) would be meaningless against real prices.
const PRICE_STEP = 100_000;

interface CategoryCount {
  category: string;
  count: number;
}

interface ProductFiltersProps {
  categories: CategoryCount[];
  totalDesignCount: number;
  // Whole-catalog price bounds (server-computed, rounded to the nearest
  // 100k) — NOT derived from the current page's 8 products, so the slider's
  // ends stay put across pagination and filtering.
  priceFloor: number;
  priceCeil: number;
  current: CurrentFilters;
  // 'sidebar' (default): the sticky desktop panel — every control applies
  // straight to the URL as it changes, no draft state, no confirm step (the
  // old "Update Results" batching was the main complaint with this panel).
  // 'sheet': hosted inside MobileFilterSheet's bottom sheet, which already
  // supplies the surface/padding — keeps a local draft + an explicit apply
  // button, since batching a set of taps before dismissing a touch sheet is
  // still the better interaction there.
  variant?: 'sidebar' | 'sheet';
  // Sheet host wants to dismiss itself once the draft is committed/cleared.
  onApplied?: () => void;
}

function toParams(filters: CurrentFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('search', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.lowStock) params.set('lowStock', 'true');
  if (filters.newArrivals) params.set('newArrivals', 'true');
  if (filters.sort) params.set('sort', filters.sort);
  return params;
}

// 19x19 checkbox: unchecked = hairline-strong outline, checked = solid accent
// fill + white tick. Shared by every row in the Tồn kho group.
function StockCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-[5px] border transition-colors duration-200 ${
        checked ? 'border-accent bg-accent' : 'border-line-strong bg-transparent'
      }`}
    >
      {checked && <FiCheck size={10} strokeWidth={3.4} className="text-white" />}
    </span>
  );
}

// A single draggable/keyboard-operable thumb, positioned by percentage
// within its parent track. Fully custom (not a native <input type="range">)
// so it can be pinned exactly on the track's centerline regardless of the
// track's own (much thinner) height.
function PriceThumb({
  value,
  floor,
  ceil,
  label,
  onDrag,
  onCommit,
}: {
  value: number;
  floor: number;
  ceil: number;
  label: string;
  onDrag: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const thumbRef = useRef<HTMLButtonElement>(null);
  const draggingRef = useRef(false);
  const pct = ceil > floor ? ((value - floor) / (ceil - floor)) * 100 : 0;

  const valueFromClientX = (clientX: number): number => {
    const track = thumbRef.current?.parentElement;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    const raw = floor + ratio * (ceil - floor);
    return Math.round(raw / PRICE_STEP) * PRICE_STEP;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    thumbRef.current?.setPointerCapture(e.pointerId);
    draggingRef.current = true;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    onDrag(valueFromClientX(e.clientX));
  };
  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onCommit(valueFromClientX(e.clientX));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onCommit(Math.max(floor, value - PRICE_STEP));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onCommit(Math.min(ceil, value + PRICE_STEP));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onCommit(floor);
    } else if (e.key === 'End') {
      e.preventDefault();
      onCommit(ceil);
    }
  };

  return (
    <button
      type="button"
      ref={thumbRef}
      role="slider"
      aria-label={label}
      aria-valuemin={floor}
      aria-valuemax={ceil}
      aria-valuenow={value}
      aria-valuetext={formatPrice(value)}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      style={{ left: `${pct}%` }}
      className="absolute top-1/2 z-10 h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-accent bg-white shadow-[0_1px_3px_rgba(63,49,40,0.18)] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    />
  );
}

// Dual-thumb price range: a thin bg-line track with an bg-accent segment
// between the two thumbs, live-updating (visual only) while dragging and
// committing (→ onCommit, which pushes the URL/draft) only on release —
// dragging must never fire a request per pixel. Keyboard steps and the two
// text boxes below commit immediately (each keypress/blur is already a
// discrete, final action, not a continuous drag).
function PriceRangeControl({
  floorPrice,
  ceilPrice,
  minPrice,
  maxPrice,
  onCommit,
}: {
  floorPrice: number;
  ceilPrice: number;
  minPrice: number;
  maxPrice: number;
  onCommit: (min: number, max: number) => void;
}) {
  const [liveMin, setLiveMin] = useState(minPrice);
  const [liveMax, setLiveMax] = useState(maxPrice);
  const [minText, setMinText] = useState(() => formatPrice(minPrice));
  const [maxText, setMaxText] = useState(() => formatPrice(maxPrice));

  // Re-sync when the committed value changes from elsewhere (category nav,
  // "Xoá tất cả", back/forward navigation). Adjusted directly during render
  // (React's documented alternative to an effect for "reset state when a
  // prop changes") rather than in a useEffect, so a commit from this same
  // control doesn't round-trip through an extra render — and, unlike keying
  // the component to force a remount, it doesn't drop DOM focus on every
  // keyboard-driven commit.
  const [prevMinPrice, setPrevMinPrice] = useState(minPrice);
  const [prevMaxPrice, setPrevMaxPrice] = useState(maxPrice);
  if (minPrice !== prevMinPrice || maxPrice !== prevMaxPrice) {
    setPrevMinPrice(minPrice);
    setPrevMaxPrice(maxPrice);
    setLiveMin(minPrice);
    setLiveMax(maxPrice);
    setMinText(formatPrice(minPrice));
    setMaxText(formatPrice(maxPrice));
  }

  const dragMin = (next: number) => {
    const clamped = Math.min(Math.max(next, floorPrice), liveMax - PRICE_STEP);
    setLiveMin(clamped);
    setMinText(formatPrice(clamped));
  };
  const dragMax = (next: number) => {
    const clamped = Math.max(Math.min(next, ceilPrice), liveMin + PRICE_STEP);
    setLiveMax(clamped);
    setMaxText(formatPrice(clamped));
  };
  const commitMin = (next: number) => {
    const clamped = Math.min(Math.max(next, floorPrice), liveMax - PRICE_STEP);
    setLiveMin(clamped);
    setMinText(formatPrice(clamped));
    onCommit(clamped, liveMax);
  };
  const commitMax = (next: number) => {
    const clamped = Math.max(Math.min(next, ceilPrice), liveMin + PRICE_STEP);
    setLiveMax(clamped);
    setMaxText(formatPrice(clamped));
    onCommit(liveMin, clamped);
  };

  const parseTyped = (text: string): number | null => {
    const digits = text.replace(/[^\d]/g, '');
    return digits ? Number(digits) : null;
  };

  const commitMinText = () => {
    const parsed = parseTyped(minText);
    if (parsed === null) {
      setMinText(formatPrice(liveMin));
      return;
    }
    const bounded = Math.min(Math.max(parsed, floorPrice), ceilPrice);
    const nextMin = Math.min(bounded, liveMax);
    const nextMax = Math.max(bounded, liveMax);
    setLiveMin(nextMin);
    setLiveMax(nextMax);
    setMinText(formatPrice(nextMin));
    setMaxText(formatPrice(nextMax));
    onCommit(nextMin, nextMax);
  };
  const commitMaxText = () => {
    const parsed = parseTyped(maxText);
    if (parsed === null) {
      setMaxText(formatPrice(liveMax));
      return;
    }
    const bounded = Math.min(Math.max(parsed, floorPrice), ceilPrice);
    const nextMax = Math.max(bounded, liveMin);
    const nextMin = Math.min(bounded, liveMin);
    setLiveMin(nextMin);
    setLiveMax(nextMax);
    setMinText(formatPrice(nextMin));
    setMaxText(formatPrice(nextMax));
    onCommit(nextMin, nextMax);
  };

  const range = ceilPrice - floorPrice || 1;
  const leftPct = ((liveMin - floorPrice) / range) * 100;
  const rightPct = ((ceilPrice - liveMax) / range) * 100;

  return (
    <div className="flex flex-col gap-4">
      <span className="text-label-xs text-ink">Khoảng giá</span>
      {/* px-2: half the thumb's own width, so a thumb sitting exactly at 0%/100%
          never overflows past the sidebar's edge. */}
      <div className="px-2 pt-1">
        <div className="relative h-[3px] rounded-full bg-line">
          <div
            className="absolute h-full rounded-full bg-accent"
            style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
          />
          <PriceThumb
            value={liveMin}
            floor={floorPrice}
            ceil={ceilPrice}
            label="Giá thấp nhất"
            onDrag={dragMin}
            onCommit={commitMin}
          />
          <PriceThumb
            value={liveMax}
            floor={floorPrice}
            ceil={ceilPrice}
            label="Giá cao nhất"
            onDrag={dragMax}
            onCommit={commitMax}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={minText}
          onChange={(e) => setMinText(e.target.value)}
          onBlur={commitMinText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          aria-label="Giá thấp nhất"
          className="h-[42px] min-w-0 flex-1 rounded-full border border-line px-3 text-[12.5px] tabular-nums text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        />
        <span aria-hidden="true" className="flex-none text-ink-muted">
          —
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={maxText}
          onChange={(e) => setMaxText(e.target.value)}
          onBlur={commitMaxText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          aria-label="Giá cao nhất"
          className="h-[42px] min-w-0 flex-1 rounded-full border border-line px-3 text-[12.5px] tabular-nums text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        />
      </div>
    </div>
  );
}

export default function ProductFilters({
  categories,
  totalDesignCount,
  priceFloor,
  priceCeil,
  current,
  variant = 'sidebar',
  onApplied,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isSidebar = variant === 'sidebar';

  // Sheet-only draft state — the sidebar reads straight from `current` and
  // pushes on every change, so it never needs a draft copy of its own.
  const [draftSort, setDraftSort] = useState<ProductSort | ''>(current.sort ?? '');
  const [draftInStock, setDraftInStock] = useState(current.inStock);
  const [draftLowStock, setDraftLowStock] = useState(current.lowStock);
  const [draftNewArrivals, setDraftNewArrivals] = useState(current.newArrivals);
  const [draftCategory, setDraftCategory] = useState<string | undefined>(current.category);
  const [draftMinPrice, setDraftMinPrice] = useState(
    current.minPrice ? Number(current.minPrice) : priceFloor,
  );
  const [draftMaxPrice, setDraftMaxPrice] = useState(
    current.maxPrice ? Number(current.maxPrice) : priceCeil,
  );

  const sort = isSidebar ? current.sort ?? '' : draftSort;
  const inStock = isSidebar ? current.inStock : draftInStock;
  const lowStock = isSidebar ? current.lowStock : draftLowStock;
  const newArrivals = isSidebar ? current.newArrivals : draftNewArrivals;
  const category = isSidebar ? current.category : draftCategory;
  const minPrice = isSidebar
    ? current.minPrice
      ? Number(current.minPrice)
      : priceFloor
    : draftMinPrice;
  const maxPrice = isSidebar
    ? current.maxPrice
      ? Number(current.maxPrice)
      : priceCeil
    : draftMaxPrice;

  const go = (overrides: Partial<CurrentFilters>) => {
    const params = toParams({ ...current, ...overrides });
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    onApplied?.();
  };

  const setSort = (next: ProductSort | '') =>
    isSidebar ? go({ sort: next || undefined }) : setDraftSort(next);
  const setCategory = (next: string | undefined) =>
    isSidebar ? go({ category: next }) : setDraftCategory(next);
  const setInStock = (next: boolean) =>
    isSidebar ? go({ inStock: next }) : setDraftInStock(next);
  const setLowStock = (next: boolean) =>
    isSidebar ? go({ lowStock: next }) : setDraftLowStock(next);
  const setNewArrivals = (next: boolean) =>
    isSidebar ? go({ newArrivals: next }) : setDraftNewArrivals(next);
  const commitPrice = (min: number, max: number) => {
    if (isSidebar) {
      go({
        minPrice: min > priceFloor ? String(min) : undefined,
        maxPrice: max < priceCeil ? String(max) : undefined,
      });
    } else {
      setDraftMinPrice(min);
      setDraftMaxPrice(max);
    }
  };

  const applyDraft = () =>
    go({
      sort: draftSort || undefined,
      inStock: draftInStock,
      lowStock: draftLowStock,
      newArrivals: draftNewArrivals,
      category: draftCategory,
      minPrice: draftMinPrice > priceFloor ? String(draftMinPrice) : undefined,
      maxPrice: draftMaxPrice < priceCeil ? String(draftMaxPrice) : undefined,
    });

  const clearAll = () => {
    setDraftSort('');
    setDraftInStock(false);
    setDraftLowStock(false);
    setDraftNewArrivals(false);
    setDraftCategory(undefined);
    setDraftMinPrice(priceFloor);
    setDraftMaxPrice(priceCeil);
    // Keep the active search term; drop every other filter.
    router.push(current.q ? `${pathname}?search=${encodeURIComponent(current.q)}` : pathname);
    onApplied?.();
  };

  const groupLabel = 'text-label-xs text-ink';

  return (
    <aside className={isSidebar ? 'flex w-full flex-col gap-[34px] md:sticky md:top-6' : 'flex w-full flex-col gap-[34px]'}>
      {isSidebar && (
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-headline-sm text-ink">Bộ lọc</h2>
          <button
            type="button"
            onClick={clearAll}
            className="border-b border-line pb-0.5 text-label-xs text-ink-muted transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Xoá tất cả
          </button>
        </div>
      )}

      {/* 3a. Danh mục — single-select (matches the backend query), "Tất cả" first with the total count */}
      <div className="flex flex-col gap-1">
        <span className={groupLabel}>Danh mục</span>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setCategory(undefined)}
            className="flex items-center justify-between gap-2.5 border-t border-line py-2.5 text-left"
          >
            <span className={`text-body-sm ${!category ? 'text-accent' : 'text-ink-secondary'}`}>Tất cả</span>
            <span className="text-[12px] tabular-nums text-ink-muted">{totalDesignCount}</span>
          </button>
          {categories.map((c) => {
            const selected = category === c.category;
            return (
              <button
                key={c.category}
                type="button"
                onClick={() => setCategory(selected ? undefined : c.category)}
                className="flex items-center justify-between gap-2.5 border-t border-line py-2.5 text-left"
              >
                <span className={`text-body-sm ${selected ? 'text-accent' : 'text-ink-secondary'}`}>
                  {c.category}
                </span>
                <span className="text-[12px] tabular-nums text-ink-muted">{c.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3b. Khoảng giá */}
      <PriceRangeControl
        floorPrice={priceFloor}
        ceilPrice={priceCeil}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onCommit={commitPrice}
      />

      {/* 3c. Tồn kho */}
      <div className="flex flex-col gap-3">
        <span className={groupLabel}>Tồn kho</span>
        <button
          type="button"
          onClick={() => setInStock(!inStock)}
          aria-pressed={inStock}
          className="flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-3">
            <StockCheckbox checked={inStock} />
            <span className="text-body-sm text-ink-secondary">Chỉ hàng còn sẵn</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setLowStock(!lowStock)}
          aria-pressed={lowStock}
          className="flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-3">
            <StockCheckbox checked={lowStock} />
            <span className="text-body-sm text-ink-secondary">Sắp hết (dưới 5 chiếc)</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setNewArrivals(!newArrivals)}
          aria-pressed={newArrivals}
          className="flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-3">
            <StockCheckbox checked={newArrivals} />
            <span className="text-body-sm text-ink-secondary">Lô mới nhất</span>
          </span>
        </button>
      </div>

      {/* Sort — kept in the sidebar (not in the spec's sidebar list, but the
          panel needs a home for it; the header's own dropdown owns sort on
          desktop, this stays for the mobile sheet variant). */}
      {!isSidebar && (
        <div className="flex flex-col gap-3">
          <span className={groupLabel}>Sắp xếp</span>
          <SortSelect value={sort} onChange={setSort} />
        </div>
      )}

      {/* 3e. Hộp stylist */}
      <div className="flex flex-col gap-3 rounded-[16px] bg-fill p-[26px]">
        <h3 className="font-display text-[21px] text-ink">Chưa chắc size?</h3>
        <p className="text-[13px] leading-[1.65] text-ink-secondary">
          Nhắn số đo, stylist của Oren trả lời trong 15 phút — miễn phí, không cần mua.
        </p>
        <button
          type="button"
          className="flex h-[46px] w-full items-center justify-center rounded-full bg-ink text-[10px] font-medium uppercase tracking-[0.24em] text-white transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Chat với stylist
        </button>
      </div>

      {!isSidebar && (
        <button
          type="button"
          onClick={applyDraft}
          className="inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-ink px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Áp dụng
        </button>
      )}
    </aside>
  );
}
