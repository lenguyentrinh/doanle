// Page-numbered (Prev/Next + dots) pagination control. Originally built for
// the admin data tables, and reused as-is by the shopper-facing /orders page
// (jump-to-page there too, replacing its earlier "Load more" button) — this
// component has no admin-specific behavior, so there's nothing to fork.
// The PLP still uses its own link-based ProductPagination (URL-driven, for
// shareable filtered pages), which this doesn't replace.
interface AdminPaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

// Beyond 9 pages, showing every dot would overflow the row — keep the
// first/last two and a window around the current page (§Pagination's own
// "rút gọn dot" note for totalPages > 9).
function getPageDots(totalPages: number, page: number): number[] {
  if (totalPages <= 9) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const keep = new Set([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages]);
  return Array.from(keep)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
}

const NAV_BUTTON_CLASSES =
  'inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-transparent px-6 py-2.5 text-label-sm text-ink transition-all duration-300 hover:border-accent hover:bg-fill hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong disabled:hover:bg-transparent disabled:hover:text-ink';
export default function AdminPagination({
  page,
  total,
  limit,
  onPageChange,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <nav
      aria-label="Phân trang"
      className="flex items-center justify-between border-t mt-4 border-line pt-md"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={NAV_BUTTON_CLASSES}
      >
        Trước
      </button>

      <span className="flex items-center gap-3.5">
        {totalPages > 1 && (
          <span className="flex items-center gap-1.5">
            {getPageDots(totalPages, page).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                aria-label={`Trang ${n}`}
                aria-current={n === page ? 'page' : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  n === page ? 'w-5 bg-accent' : 'w-1.5 bg-line-strong'
                }`}
              />
            ))}
          </span>
        )}
        <span className="text-label-sm tabular-nums text-ink-secondary">
          Trang {page}/{totalPages}
        </span>
      </span>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={NAV_BUTTON_CLASSES}
      >
        Sau
      </button>
    </nav>
  );
}
