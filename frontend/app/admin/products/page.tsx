'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiSearch } from 'react-icons/fi';
import { formatPrice } from '@/lib/helpers';
import { showToast } from '@/lib/toast';
import {
  getAdminProductsAPI,
  getAdminCategoriesAPI,
  deleteAdminProductAPI,
  type AdminProduct,
  type AdminCategory,
} from '@/features/admin/services/adminAPI';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminStatStrip from '@/features/admin/components/AdminStatStrip';
import AdminSegmented from '@/features/admin/components/AdminSegmented';
import AdminSelect from '@/features/admin/components/AdminSelect';
import AdminConfirmDialog from '@/features/admin/components/AdminConfirmDialog';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminPagination from '@/features/admin/components/AdminPagination';
import { DEFAULT_PAGE_LIMIT } from '@/lib/pagination';

const SEARCH_DEBOUNCE_MS = 300;
const STOCK_FULL = 20;

type StatusFilter = 'all' | 'active' | 'hidden' | 'archived';

// Category-tint pairs, cycled by a deterministic name hash — so every row of
// the same category always lands on the same tint (§Tints in the handoff).
// All existing tokens, no new colors.
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

function matchesStatus(product: AdminProduct, status: StatusFilter): boolean {
  if (status === 'all') return true;
  if (status === 'archived') return product.deletedAt !== null;
  if (product.deletedAt) return false;
  return status === 'active' ? product.isActive : !product.isActive;
}

function statusPill(product: AdminProduct): { bg: string; fg: string; dot: string; label: string } {
  if (product.deletedAt) {
    return { bg: 'bg-fill', fg: 'text-ink-muted', dot: 'bg-ink-faint', label: 'Đã lưu trữ' };
  }
  if (product.isActive) {
    return { bg: 'bg-success-bg', fg: 'text-success', dot: 'bg-success', label: 'Đang bán' };
  }
  return { bg: 'bg-fill', fg: 'text-ink-muted', dot: 'bg-ink-muted', label: 'Đã ẩn' };
}

// Client Component, flat under app/admin/ (no route group) — matching every
// existing app/admin/* page. The server-side admin gate lives in layout.tsx.
export default function AdminProductsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [pendingArchive, setPendingArchive] = useState<AdminProduct | null>(null);

  // Whole-catalog counters for the stat strip — the backend computes these
  // unfiltered by the current search/category/page (§PaginatedAdminProducts),
  // so no second fetch is needed here.
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeCount: 0,
    hiddenCount: 0,
    archivedCount: 0,
    lowStockCount: 0,
  });

  // Deep link from the Categories screen's "Xem sản phẩm" card action
  // (/admin/products?categoryId=…). Read client-side only — this page has
  // no other URL-synced state, so a full useSearchParams()+Suspense split
  // isn't worth it for one query param.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('categoryId');
    if (fromUrl) setCategoryId(fromUrl);
  }, []);

  // Plain 300ms debounce — SearchBar.tsx has no debounce to mirror (it's
  // submit-on-Enter, not live search), so this is implemented directly.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    getAdminCategoriesAPI({ limit: 100 })
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

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
        setStats({
          totalProducts: res.totalProducts,
          activeCount: res.activeCount,
          hiddenCount: res.hiddenCount,
          archivedCount: res.archivedCount,
          lowStockCount: res.lowStockCount,
        });
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

  const confirmArchive = async () => {
    if (!pendingArchive || archivingId !== null) return;
    const product = pendingArchive;

    setArchivingId(product.id);
    try {
      await deleteAdminProductAPI(product.id);
      refreshProducts();
      showToast.success('Đã lưu trữ sản phẩm');
      setPendingArchive(null);
    } catch {
      showToast.error('Không lưu trữ được sản phẩm');
    } finally {
      setArchivingId(null);
    }
  };

  // The API has no status filter, so the status tabs still only narrow the
  // current page's rows (the handoff README's own sanctioned fallback) —
  // but the stat strip reads the backend's filter-independent `stats`,
  // matching the mock's "always the full catalog" intent.
  const visibleProducts = products.filter((p) => matchesStatus(p, status));
  const isEmpty = !loading && visibleProducts.length === 0;

  return (
    <div className="mx-auto flex w-full flex-col gap-[22px]">
      <AdminPageHeader title="Sản phẩm">
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full bg-ink px-[26px] max-sm:w-full text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[2px] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Thêm sản phẩm
          <span aria-hidden="true" className="text-[13px] leading-none">
            ＋
          </span>
        </Link>
      </AdminPageHeader>

      <div
        className="motion-safe:animate-[rise_0.55s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ animationDelay: '0.04s' }}
      >
        <AdminStatStrip
          items={[
            { label: 'Tổng sản phẩm', value: String(stats.totalProducts) },
            { label: 'Đang bán', value: String(stats.activeCount), tone: 'success' },
            { label: 'Sắp hết', value: String(stats.lowStockCount), tone: 'alert' },
            {
              label: 'Đã ẩn / lưu trữ',
              value: String(stats.hiddenCount + stats.archivedCount),
              tone: 'fill',
            },
          ]}
        />
      </div>

      <div
        className="relative z-10 grid grid-cols-1 items-center gap-3 motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] lg:grid-cols-[minmax(0,1fr)_auto]"
        style={{ animationDelay: '0.08s' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-12 w-full flex-1 items-center gap-2.5 rounded-full border border-line bg-fill px-[18px] transition-all duration-200 focus-within:border-line-strong focus-within:bg-white">
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
            className="w-full sm:w-[180px] sm:shrink-0"
          />
        </div>
        <AdminSegmented
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'active', label: 'Đang bán' },
            { value: 'hidden', label: 'Đã ẩn' },
            { value: 'archived', label: 'Lưu trữ' },
          ]}
          value={status}
          onChange={setStatus}
        />
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
        <ul className="flex flex-col gap-3 md:hidden">
          {visibleProducts.map((product) => {
            const tint = tintForCategory(product.category);
            const out = product.stockQuantity === 0;
            const low = product.stockQuantity > 0 && product.stockQuantity < 5;
            const pill = statusPill(product);
            const archived = product.deletedAt !== null;
            return (
              <li
                key={product.id}
                className={`flex flex-col gap-3 rounded-[16px] border border-line bg-white p-4 ${archived ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`grid h-[52px] w-[46px] shrink-0 place-items-center rounded-t-[23px] rounded-b-[6px] font-display text-[19px] leading-none ${tint.bg} ${tint.ink}`}
                  >
                    {product.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className={`break-words text-[14px] ${archived ? 'text-ink-muted' : 'text-ink'}`}>
                      {product.name}
                    </span>
                    <span title={product.id} className="truncate text-[12px] tracking-[.04em] text-ink-faint">#{product.id}</span>
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] py-1 text-label-xs ${pill.bg} ${pill.fg}`}
                  >
                    <span aria-hidden="true" className={`size-[5px] shrink-0 rounded-full ${pill.dot}`} />
                    {pill.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <span className={`max-w-full truncate rounded-full px-[11px] py-1 text-[12px] ${tint.bg} ${tint.ink}`}>
                    {product.category}
                  </span>
                  <span className="font-display text-[17px] tabular-nums text-ink">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <div
                  className={`text-[13px] tabular-nums ${out ? 'text-error-strong' : low ? 'text-alert' : 'text-ink-muted'}`}
                >
                  {out ? 'Hết hàng · cần nhập' : `còn ${product.stockQuantity} · ${low ? 'sắp hết' : 'đủ hàng'}`}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                  {archived ? (
                    <span className="font-display text-[13px] italic text-ink-faint">đã lưu trữ</span>
                  ) : (
                    <>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="inline-flex min-h-10 items-center rounded-full px-4 text-label-xs text-ink transition-colors duration-200 hover:text-accent"
                      >
                        Sửa
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingArchive(product)}
                        className="inline-flex min-h-10 items-center rounded-full px-4 text-label-xs text-ink-muted transition-colors duration-200 hover:text-error-strong"
                      >
                        Lưu trữ
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div
          className="hidden overflow-x-auto md:block rounded-[16px] border border-line bg-white motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
          style={{ animationDelay: '0.12s' }}
        >
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-[minmax(0,1.7fr)_150px_160px_190px_130px_150px] gap-4 border-b border-line-strong px-[22px] py-3.5">
              <span className="text-label-xs text-ink-muted">Sản phẩm</span>
              <span className="text-label-xs text-ink-muted">Danh mục</span>
              <span className="text-label-xs text-ink-muted">Giá</span>
              <span className="text-label-xs text-ink-muted">Kho</span>
              <span className="text-label-xs text-ink-muted">Trạng thái</span>
              <span className="text-right text-label-xs text-ink-muted">Hành động</span>
            </div>

            {visibleProducts.map((product, i) => {
              const tint = tintForCategory(product.category);
              const out = product.stockQuantity === 0;
              const low = product.stockQuantity > 0 && product.stockQuantity < 5;
              const stockPct = Math.max(3, Math.min(100, Math.round((product.stockQuantity / STOCK_FULL) * 100)));
              const pill = statusPill(product);
              const archived = product.deletedAt !== null;

              return (
                <div
                  key={product.id}
                  className={`grid grid-cols-[minmax(0,1.7fr)_150px_160px_190px_130px_150px] items-center gap-4 px-[22px] py-3.5 transition-colors duration-200 hover:bg-fill ${
                    i === visibleProducts.length - 1 ? 'border-b border-transparent' : 'border-b border-line'
                  } ${archived ? 'opacity-70' : ''}`}
                >
                  <span className="flex min-w-0 items-center gap-3.5">
                    <span
                      aria-hidden="true"
                      className={`grid h-[52px] w-[46px] shrink-0 place-items-center rounded-t-[23px] rounded-b-[6px] font-display text-[19px] leading-none ${tint.bg} ${tint.ink}`}
                    >
                      {product.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-col gap-[3px]">
                      <span className={`truncate text-[14px] ${archived ? 'text-ink-muted' : 'text-ink'}`}>
                        {product.name}
                      </span>
                      <span title={product.id} className="truncate text-[12px] tracking-[.04em] text-ink-faint">#{product.id}</span>
                    </span>
                  </span>

                  <span className="flex min-w-0">
                    <span
                      className={`truncate rounded-full px-[11px] py-1 text-[12px] ${tint.bg} ${tint.ink}`}
                    >
                      {product.category}
                    </span>
                  </span>

                  <span className="font-display text-[17px] tabular-nums text-ink">
                    {formatPrice(product.price)}
                  </span>

                  <span className="flex flex-col gap-[7px]">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-[13px] tabular-nums ${out ? 'text-error-strong' : low ? 'text-alert' : 'text-ink-muted'}`}
                      >
                        {out ? 'Hết hàng' : `còn ${product.stockQuantity}`}
                      </span>
                      <span
                        className={`text-[11px] ${out ? 'text-error-strong' : low ? 'text-alert' : 'text-ink-muted'}`}
                      >
                        {out ? 'cần nhập' : low ? 'sắp hết' : 'đủ hàng'}
                      </span>
                    </span>
                    <span className="relative h-[3px] w-full rounded-full bg-line">
                      <span
                        className={`absolute top-0 left-0 h-full rounded-full ${out ? 'bg-error-strong' : low ? 'bg-alert' : 'bg-olive-soft'}`}
                        style={{ width: `${stockPct}%` }}
                      />
                    </span>
                  </span>

                  <span className="flex">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] py-1 text-label-xs ${pill.bg} ${pill.fg}`}
                    >
                      <span aria-hidden="true" className={`size-[5px] shrink-0 rounded-full ${pill.dot}`} />
                      {pill.label}
                    </span>
                  </span>

                  <span className="flex justify-end gap-3.5">
                    {archived ? (
                      <span className="font-display text-[13px] italic text-ink-faint">đã lưu trữ</span>
                    ) : (
                      <>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-label-xs text-ink transition-colors duration-200 hover:text-accent"
                        >
                          Sửa
                        </Link>
                        <span aria-hidden="true" className="size-[3px] rounded-full bg-line-strong" />
                        <button
                          type="button"
                          onClick={() => setPendingArchive(product)}
                          className="text-label-xs text-ink-muted transition-colors duration-200 hover:text-error-strong"
                        >
                          Lưu trữ
                        </button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        </>
      )}

      {!loading && total > 0 && (
        <AdminPagination page={page} total={total} limit={DEFAULT_PAGE_LIMIT} onPageChange={setPage} />
      )}

      <AdminConfirmDialog
        open={pendingArchive !== null}
        actionLabel="Lưu trữ sản phẩm"
        title={pendingArchive?.name ?? ''}
        description="Sản phẩm sẽ ẩn khỏi cửa hàng và không thể hoàn tác. Đơn hàng cũ vẫn giữ nguyên."
        confirmLabel="Lưu trữ"
        onConfirm={confirmArchive}
        onCancel={() => setPendingArchive(null)}
      />
    </div>
  );
}
