'use client';

import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { formatPrice } from '@/lib/helpers';
import { showToast } from '@/lib/toast';
import {
  getAdminProductsAPI,
  getAdminCategoriesAPI,
  bulkApplyDiscountAPI,
  type AdminProduct,
  type AdminCategory,
} from '@/features/admin/services/adminAPI';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminSelect from '@/features/admin/components/AdminSelect';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminPagination from '@/features/admin/components/AdminPagination';
import { DEFAULT_PAGE_LIMIT } from '@/lib/pagination';

const SEARCH_DEBOUNCE_MS = 300;
// High enough to cover a category's full catalog in this app's dev-sized
// data set — used only for the "auto-tick every product in this category"
// fetch, not for the paginated list shown on screen.
const CATEGORY_FETCH_LIMIT = 200;

// Category-tint pairs, cycled by a deterministic name hash — copied from
// app/admin/products/page.tsx's own copy (§Tints); kept duplicated rather
// than extracted since that's the existing pattern across admin screens.
const TINTS: { bg: string; ink: string }[] = [
  { bg: 'bg-sand', ink: 'text-clay' },
  { bg: 'bg-success-bg', ink: 'text-success' },
  { bg: 'bg-alert-bg', ink: 'text-alert' },
  { bg: 'bg-fill-dark', ink: 'text-ink-secondary' },
  { bg: 'bg-error-bg', ink: 'text-error-strong' },
  { bg: 'bg-fill', ink: 'text-ink-muted' },
];

function tintForCategory(category: string): { bg: string; ink: string } {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) % 997;
  return TINTS[hash % TINTS.length];
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (typeof response?.data?.message === 'string') return response.data.message;
  }
  return fallback;
}

// Admin bulk-discount picker (/admin/discounts). Search + category filter
// narrow the visible list; picking a category auto-ticks every product in
// it (fetched separately, uncapped by the visible page), but the checkbox
// Set<string> itself is never reset by search/filter changes — selections
// accumulate as the admin browses multiple categories, matching the UI
// spec in OPTIMIZATION_AND_DISCOUNT_PLAN.md's "UI chọn sản phẩm áp dụng".
export default function DiscountManager() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [percentageInput, setPercentageInput] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getAdminCategoriesAPI({ limit: 100 })
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  // Plain 300ms debounce, mirroring app/admin/products/page.tsx.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const refreshProducts = () => {
    let active = true;
    setLoading(true);
    getAdminProductsAPI({
      search: search || undefined,
      categoryId: categoryId || undefined,
      page,
      limit: DEFAULT_PAGE_LIMIT,
    })
      .then((res) => {
        if (!active) return;
        setProducts(res.data);
        setTotal(res.total);
      })
      .catch(() => {
        if (!active) return;
        showToast.error('Không tải được sản phẩm');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  };

  useEffect(refreshProducts, [search, categoryId, page]);

  // Auto-tick every product under the newly-picked category — fetched
  // uncapped (not the paginated page size) so it covers the whole category,
  // then merged into the existing selection rather than replacing it.
  useEffect(() => {
    if (!categoryId) return;
    let active = true;
    getAdminProductsAPI({ categoryId, limit: CATEGORY_FETCH_LIMIT })
      .then((res) => {
        if (!active) return;
        setSelected((prev) => {
          const next = new Set(prev);
          res.data.forEach((p) => next.add(p.id));
          return next;
        });
      })
      .catch(() => {
        if (!active) return;
        showToast.error('Không tải được sản phẩm theo danh mục để tự động chọn');
      });
    return () => {
      active = false;
    };
  }, [categoryId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Header checkbox scopes to the current page's rows only (not the whole
  // filtered set across pages) — matches what the admin can actually see.
  const allVisibleSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  const someVisibleSelected = products.some((p) => selected.has(p.id));

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        products.forEach((p) => next.delete(p.id));
      } else {
        products.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const parsedPercentage = percentageInput === '' ? null : Number(percentageInput);
  const validPercentage =
    percentageInput !== '' &&
    Number.isFinite(parsedPercentage) &&
    (parsedPercentage as number) >= 0 &&
    (parsedPercentage as number) <= 100;

  const applyDiscount = async (value: number | null) => {
    if (selected.size === 0 || applying) return;
    setApplying(true);
    try {
      const res = await bulkApplyDiscountAPI(Array.from(selected), value);
      showToast.success(`Đã cập nhật giảm giá cho ${res.updatedCount} sản phẩm`);
      setSelected(new Set());
      setPercentageInput('');
      refreshProducts();
    } catch (err: unknown) {
      showToast.error(extractErrorMessage(err, 'Không áp dụng được giảm giá'));
    } finally {
      setApplying(false);
    }
  };

  const isEmpty = !loading && products.length === 0;

  return (
    <div className="mx-auto flex w-full flex-col gap-[22px] pb-28">
      <AdminPageHeader title="Giảm giá" />

      <div
        className="relative z-10 grid grid-cols-1 items-center gap-3 motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] lg:grid-cols-[minmax(0,1fr)_220px]"
        style={{ animationDelay: '0.06s' }}
      >
        <div className="flex h-12 items-center gap-2.5 rounded-full border border-line bg-fill px-[18px] transition-all duration-200 focus-within:border-line-strong focus-within:bg-white">
          <FiSearch aria-hidden="true" size={15} className="text-ink-muted" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm sản phẩm…"
            aria-label="Tìm sản phẩm"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        <AdminSelect
          options={[
            { value: '', label: 'Tất cả danh mục' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={categoryId}
          onChange={(value) => {
            setCategoryId(value);
            setPage(1);
          }}
          ariaLabel="Lọc theo danh mục"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-ink-secondary">
        <span>
          Đã chọn <span className="font-display text-[16px] text-ink">{selected.size}</span> sản phẩm
        </span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="py-2 text-label-xs text-ink-muted transition-colors duration-200 hover:text-error-strong"
          >
            Bỏ chọn tất cả
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-12 text-center text-body-md text-ink-muted">Đang tải sản phẩm…</p>
      ) : isEmpty ? (
        <AdminEmptyState
          title="Không tìm thấy sản phẩm nào"
          description="Thử bỏ bộ lọc hoặc từ khoá khác."
        />
      ) : (
        <>
        <div className="flex items-center gap-3 px-1 md:hidden">
          <input
            type="checkbox"
            id="discount-select-all-mobile"
            checked={allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
            }}
            onChange={toggleAllVisible}
            className="size-[22px] rounded border-line-strong accent-success"
          />
          <label htmlFor="discount-select-all-mobile" className="text-label-xs text-ink-muted">
            Chọn tất cả sản phẩm đang hiển thị
          </label>
        </div>
        <ul className="flex flex-col gap-3 md:hidden">
          {products.map((product) => {
            const tint = tintForCategory(product.category);
            const checked = selected.has(product.id);
            const hasDiscount = product.discountPercentage !== null && product.discountPercentage !== undefined;
            return (
              <li key={product.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-[16px] border border-line p-4 transition-colors duration-200 ${checked ? 'bg-fill' : 'bg-white'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(product.id)}
                    aria-label={`Chọn ${product.name}`}
                    className="mt-1 size-[22px] shrink-0 rounded border-line-strong accent-success"
                  />
                  {product.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- backend-served upload thumbnail, not a Next-optimizable static asset
                    <img
                      src={product.imageUrls[0]}
                      alt=""
                      className="h-[52px] w-[46px] shrink-0 rounded-t-[23px] rounded-b-[6px] object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`grid h-[52px] w-[46px] shrink-0 place-items-center rounded-t-[23px] rounded-b-[6px] font-display text-[19px] leading-none ${tint.bg} ${tint.ink}`}
                    >
                      {product.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="break-words text-[14px] text-ink">{product.name}</span>
                    <span className={`w-fit max-w-full truncate rounded-full px-[11px] py-1 text-[12px] ${tint.bg} ${tint.ink}`}>
                      {product.category}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className={`font-display text-[17px] tabular-nums ${hasDiscount ? 'text-ink-faint line-through' : 'text-ink'}`}
                      >
                        {formatPrice(product.price)}
                      </span>
                      {hasDiscount && (
                        <span className="font-display text-[15px] tabular-nums text-accent">
                          {formatPrice(product.finalPrice)}
                        </span>
                      )}
                      {hasDiscount ? (
                        <span className="inline-flex w-fit items-center rounded-full bg-accent px-[11px] py-1 text-[11px] font-semibold text-white">
                          −{product.discountPercentage}%
                        </span>
                      ) : (
                        <span className="text-[12px] text-ink-faint">Không giảm</span>
                      )}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div
          className="hidden overflow-x-auto md:block rounded-[16px] border border-line bg-white motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[40px_minmax(0,1.7fr)_150px_160px_160px] gap-4 border-b border-line-strong px-[22px] py-3.5">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                }}
                onChange={toggleAllVisible}
                aria-label="Chọn tất cả sản phẩm đang hiển thị"
                className="size-[18px] rounded border-line-strong accent-success focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
              />
              <span className="text-label-xs text-ink-muted">Sản phẩm</span>
              <span className="text-label-xs text-ink-muted">Danh mục</span>
              <span className="text-label-xs text-ink-muted">Giá</span>
              <span className="text-label-xs text-ink-muted">Giảm giá</span>
            </div>

            {products.map((product, i) => {
              const tint = tintForCategory(product.category);
              const checked = selected.has(product.id);
              const hasDiscount = product.discountPercentage !== null && product.discountPercentage !== undefined;

              return (
                <label
                  key={product.id}
                  className={`grid cursor-pointer grid-cols-[40px_minmax(0,1.7fr)_150px_160px_160px] items-center gap-4 px-[22px] py-3.5 transition-colors duration-200 hover:bg-fill ${
                    i === products.length - 1 ? 'border-b border-transparent' : 'border-b border-line'
                  } ${checked ? 'bg-fill' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(product.id)}
                    aria-label={`Chọn ${product.name}`}
                    className="size-[18px] rounded border-line-strong accent-success focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                  />

                  <span className="flex min-w-0 items-center gap-3.5">
                    {product.imageUrls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- backend-served upload thumbnail, not a Next-optimizable static asset
                      <img
                        src={product.imageUrls[0]}
                        alt=""
                        className="h-[52px] w-[46px] shrink-0 rounded-t-[23px] rounded-b-[6px] object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`grid h-[52px] w-[46px] shrink-0 place-items-center rounded-t-[23px] rounded-b-[6px] font-display text-[19px] leading-none ${tint.bg} ${tint.ink}`}
                      >
                        {product.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col gap-[3px]">
                      <span className="truncate text-[14px] text-ink">{product.name}</span>
                      <span className="text-[12px] tracking-[.04em] text-ink-faint">#{product.id}</span>
                    </span>
                  </span>

                  <span className="flex min-w-0">
                    <span className={`truncate rounded-full px-[11px] py-1 text-[12px] ${tint.bg} ${tint.ink}`}>
                      {product.category}
                    </span>
                  </span>

                  <span className="flex flex-col gap-[3px]">
                    <span
                      className={`font-display text-[17px] tabular-nums ${hasDiscount ? 'text-ink-faint line-through' : 'text-ink'}`}
                    >
                      {formatPrice(product.price)}
                    </span>
                    {hasDiscount && (
                      <span className="font-display text-[15px] tabular-nums text-accent">
                        {formatPrice(product.finalPrice)}
                      </span>
                    )}
                  </span>

                  <span className="flex">
                    {hasDiscount ? (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-[11px] py-1 text-[11px] font-semibold text-white">
                        −{product.discountPercentage}%
                      </span>
                    ) : (
                      <span className="text-[12px] text-ink-faint">Không giảm</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        </>
      )}

      {!loading && total > 0 && (
        <AdminPagination page={page} total={total} limit={DEFAULT_PAGE_LIMIT} onPageChange={setPage} />
      )}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-white/92 p-3 sm:gap-4 sm:rounded-full sm:py-3 sm:pr-3 sm:pl-6 shadow-card backdrop-blur-[12px]">
        <div className="flex items-center gap-2.5">
          <label htmlFor="bulk-discount" className="text-label-xs text-ink-muted">
            % giảm giá
          </label>
          <div className="flex items-baseline gap-1.5 border-b border-line-strong pb-0.5 focus-within:border-accent">
            <input
              id="bulk-discount"
              type="number"
              min={0}
              max={100}
              value={percentageInput}
              onChange={(e) => setPercentageInput(e.target.value)}
              placeholder="0–100"
              className="w-[76px] border-0 bg-transparent py-1 font-display text-[18px] tabular-nums text-ink outline-none"
            />
            <span className="text-body-sm text-ink-muted">%</span>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
          <button
            type="button"
            onClick={() => applyDiscount(null)}
            disabled={selected.size === 0 || applying}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-full border sm:flex-none border-line-strong px-[22px] text-label-xs text-ink-secondary transition-all duration-200 hover:border-error-strong hover:text-error-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            Bỏ giảm giá
          </button>
          <button
            type="button"
            onClick={() => applyDiscount(parsedPercentage)}
            disabled={!validPercentage || selected.size === 0 || applying}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-3 rounded-full bg-ink sm:flex-none px-[26px] text-label-xs text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {applying ? 'Đang áp dụng' : 'Áp dụng'}
            {applying && (
              <span
                aria-hidden="true"
                className="size-[13px] rounded-full border-[1.5px] border-white/35 border-t-white animate-spin"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
