'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FiSearch } from 'react-icons/fi';
import { showToast } from '@/lib/toast';
import { extractErrorMessage } from '@/lib/apiError';
import { slugify } from '@/lib/helpers';
import {
  getAdminCategoriesAPI,
  createAdminCategoryAPI,
  renameAdminCategoryAPI,
  deleteAdminCategoryAPI,
  type AdminCategory,
  type AdminCategorySort,
} from '@/features/admin/services/adminAPI';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminSegmented from '@/features/admin/components/AdminSegmented';
import AdminConfirmDialog from '@/features/admin/components/AdminConfirmDialog';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminPagination from '@/features/admin/components/AdminPagination';
import { DEFAULT_PAGE_LIMIT } from '@/lib/pagination';

const SEARCH_DEBOUNCE_MS = 300;

// Alternating card-header tints, cycled by index-in-page — all existing
// tokens (§Tints in the handoff), no new colors. The arch stroke reuses the
// tint's own ink color for the 3 "colorful" tones (success/alert/error) but
// falls back to plain --color-ink at low opacity for the 3 neutral ones,
// matching the reference design pixel-for-pixel.
const TINTS: { bg: string; ink: string; arch: string }[] = [
  { bg: 'bg-sand', ink: 'text-clay', arch: 'border-ink/10' },
  { bg: 'bg-success-bg', ink: 'text-success', arch: 'border-success/16' },
  { bg: 'bg-alert-bg', ink: 'text-alert', arch: 'border-alert/16' },
  { bg: 'bg-fill-dark', ink: 'text-ink-secondary', arch: 'border-ink/10' },
  { bg: 'bg-error-bg', ink: 'text-error-strong', arch: 'border-error-strong/14' },
  { bg: 'bg-fill', ink: 'text-ink-muted', arch: 'border-ink/8' },
];

// Client Component, flat under app/admin/ (no route group) — matching every
// existing app/admin/* page. The server-side admin gate lives in layout.tsx.
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null);

  const [filterInput, setFilterInput] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<AdminCategorySort>('name');
  const [page, setPage] = useState(1);

  // Whole-catalog counters for the header chips — the backend computes
  // these unfiltered by the current search/page (§PaginatedAdminCategories).
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalProducts: 0,
    orphanCount: 0,
  });

  // Plain 300ms debounce (same pattern as products/orders). Resets to page 1
  // on a new query.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter(filterInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filterInput]);

  const refreshCategories = () => {
    let active = true;
    setLoading(true);
    getAdminCategoriesAPI({
      search: filter || undefined,
      sort,
      page,
      limit: DEFAULT_PAGE_LIMIT,
    })
      .then((res) => {
        if (!active) return;
        setCategories(res.data);
        setTotal(res.total);
        setStats({
          totalCategories: res.totalCategories,
          totalProducts: res.totalProducts,
          orphanCount: res.orphanCount,
        });
      })
      .catch(() => {
        if (!active) return;
        showToast.error('Không tải được danh mục');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  };

  useEffect(refreshCategories, [filter, sort, page]);

  const handleSortChange = (value: AdminCategorySort) => {
    setSort(value);
    setPage(1);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || creating) return;

    setCreating(true);
    try {
      await createAdminCategoryAPI(name);
      refreshCategories();
      setNewName('');
      showToast.success('Đã tạo danh mục');
    } catch (err) {
      showToast.error(extractErrorMessage(err, 'Không tạo được danh mục'));
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (category: AdminCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleRename = async (id: number) => {
    const name = editingName.trim();
    if (!name || savingId !== null) return;

    setSavingId(id);
    try {
      await renameAdminCategoryAPI(id, name);
      refreshCategories();
      showToast.success('Đã cập nhật danh mục');
      cancelEditing();
    } catch (err) {
      showToast.error(extractErrorMessage(err, 'Không cập nhật được danh mục'));
    } finally {
      setSavingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deletingId !== null) return;
    const category = pendingDelete;

    setDeletingId(category.id);
    try {
      await deleteAdminCategoryAPI(category.id);
      refreshCategories();
      showToast.success('Đã xoá danh mục');
      setPendingDelete(null);
    } catch (err) {
      showToast.error(extractErrorMessage(err, 'Không xoá được danh mục'));
    } finally {
      setDeletingId(null);
    }
  };

  const maxProductCount = Math.max(1, ...categories.map((c) => c.productCount));
  const noMatches = !loading && categories.length === 0 && filter.length > 0;

  return (
    <div className="mx-auto flex w-full flex-col gap-[22px]">
      <AdminPageHeader title="Danh mục">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-caption text-ink-secondary">
            <span className="font-display text-[15px] text-ink">{stats.totalCategories}</span>
            danh mục
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-caption text-ink-secondary">
            <span className="font-display text-[15px] text-ink">{stats.totalProducts}</span>
            sản phẩm
          </span>
          {stats.orphanCount > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-alert-bg px-3.5 py-2 text-caption text-alert">
              {stats.orphanCount} danh mục trống
            </span>
          )}
        </div>
      </AdminPageHeader>

      <div
        className="grid items-center gap-3 motion-safe:animate-[rise_0.55s_cubic-bezier(0.16,1,0.3,1)_both] lg:grid-cols-[minmax(0,380px)_1fr]"
        style={{ animationDelay: '0.05s' }}
      >
        <form
          onSubmit={handleCreate}
          className="flex items-center gap-2.5 rounded-full border border-line bg-fill py-1.5 pl-[18px] pr-1.5 transition-all duration-200 focus-within:border-line-strong focus-within:bg-white"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên danh mục mới…"
            aria-label="Tên danh mục mới"
            disabled={creating}
            className="h-[38px] min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="inline-flex h-[42px] shrink-0 items-center gap-2.5 rounded-full bg-ink px-5 text-label-xs text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? 'Đang tạo' : 'Thêm'}
            <span aria-hidden="true" className="text-[13px] leading-none">
              ＋
            </span>
          </button>
        </form>

        <div className="flex items-center justify-end gap-2.5">
          <div className="flex items-center gap-2 border-b border-line px-0.5 pb-1 transition-colors duration-200 focus-within:border-accent">
            <FiSearch aria-hidden="true" size={14} className="text-ink-muted" />
            <input
              type="search"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Lọc danh mục"
              aria-label="Lọc danh mục"
              className="h-7 w-[150px] border-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
          <AdminSegmented
            options={[
              { value: 'name', label: 'A → Z' },
              { value: 'count', label: 'Nhiều nhất' },
            ]}
            value={sort}
            onChange={handleSortChange}
          />
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-body-md text-ink-muted">Đang tải danh mục…</p>
      ) : stats.totalCategories === 0 ? (
        <AdminEmptyState
          title="Chưa có danh mục nào"
          description="Tạo danh mục đầu tiên ở ô phía trên."
        />
      ) : (
        <>
          {categories.length > 0 && (
            <div
              className="grid gap-4 motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] min-[720px]:grid-cols-2 min-[1080px]:grid-cols-3"
              style={{ animationDelay: '0.1s' }}
            >
              {categories.map((category, i) => {
                const tint = TINTS[i % TINTS.length];
                const isEditing = editingId === category.id;
                const empty = category.productCount === 0;
                const pct = Math.max(3, Math.round((category.productCount / maxProductCount) * 100));

                return (
                  <div
                    key={category.id}
                    className="flex flex-col overflow-hidden rounded-[16px] border border-line bg-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[3px] hover:border-line-strong hover:shadow-card"
                  >
                    <div
                      className={`relative flex h-[104px] items-end justify-between gap-3 overflow-hidden px-[18px] pb-3.5 ${tint.bg}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute -top-[26px] -right-[18px] aspect-[0.74] w-[104px] rounded-t-[52px] border ${tint.arch}`}
                      />
                      <span className={`relative font-display text-[44px] leading-[0.8] ${tint.ink}`}>
                        {category.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="relative inline-flex items-baseline gap-[5px] rounded-full bg-white/72 px-[11px] py-[5px] text-[11px] text-ink-secondary">
                        <span className="font-display text-[14px] tabular-nums text-ink">
                          {category.productCount}
                        </span>
                        sp
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-3.5 px-[18px] py-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-2.5">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRename(category.id);
                              }
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            aria-label="Tên danh mục"
                            className="w-full border-0 border-b border-accent bg-transparent pb-[7px] font-display text-[21px] text-ink outline-none"
                          />
                          <span className="text-caption text-ink-muted">
                            Slug sẽ thành{' '}
                            <span className="text-ink-secondary">/{slugify(editingName) || '…'}</span>
                          </span>
                          <div className="flex gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleRename(category.id)}
                              disabled={savingId === category.id || !editingName.trim()}
                              className="flex h-[38px] flex-1 items-center justify-center rounded-full bg-ink text-label-xs text-white transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={savingId === category.id}
                              className="flex h-[38px] flex-1 items-center justify-center rounded-full border border-line-strong text-label-xs text-ink-secondary transition-colors duration-200 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-col gap-3.5">
                          <div className="flex flex-col gap-[5px]">
                            <span className="font-display text-[21px] text-ink">{category.name}</span>
                          </div>
                          <div className="mt-auto flex flex-col gap-3">
                            <span className="relative h-[3px] w-full rounded-full bg-line">
                              <span
                                className={`absolute top-0 left-0 h-full rounded-full ${empty ? 'bg-line-strong' : 'bg-accent'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <div className="flex items-center gap-3.5 border-t border-line pt-3">
                              <button
                                type="button"
                                onClick={() => startEditing(category)}
                                className="text-label-xs text-ink transition-colors duration-200 hover:text-accent"
                              >
                                Đổi tên
                              </button>
                              <span aria-hidden="true" className="size-[3px] rounded-full bg-line-strong" />
                              <button
                                type="button"
                                onClick={() => setPendingDelete(category)}
                                aria-label={`Xoá ${category.name}`}
                                className="text-label-xs text-ink-muted transition-colors duration-200 hover:text-error-strong"
                              >
                                Xoá
                              </button>
                              <Link
                                href={`/admin/products?categoryId=${category.id}`}
                                className="ml-auto text-label-xs text-ink-muted transition-colors duration-200 hover:text-accent"
                              >
                                Xem sản phẩm
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {noMatches && (
            <p className="py-10 text-center text-body-sm text-ink-muted">
              Không có danh mục nào khớp &ldquo;{filter}&rdquo;.
            </p>
          )}

          {total > 0 && (
            <AdminPagination
              page={page}
              total={total}
              limit={DEFAULT_PAGE_LIMIT}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <AdminConfirmDialog
        open={pendingDelete !== null}
        actionLabel="Xoá danh mục"
        title={pendingDelete?.name ?? ''}
        description={
          pendingDelete
            ? pendingDelete.productCount > 0
              ? `Danh mục này còn ${pendingDelete.productCount} sản phẩm. Xoá xong các sản phẩm đó sẽ không còn danh mục. Không thể hoàn tác.`
              : 'Danh mục trống, xoá an toàn. Không thể hoàn tác.'
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
