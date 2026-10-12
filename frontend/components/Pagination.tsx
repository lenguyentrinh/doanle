import Link from 'next/link';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange?: (page: number) => void;
  buildHref?: (page: number) => string;
}

const btnBase =
  'inline-flex min-h-12 items-center justify-center border border-ink bg-transparent px-6 py-2.5 text-label-sm text-ink transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink';

export default function Pagination({ page, total, limit, onPageChange, buildHref }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      aria-label="Phân trang"
      className="flex items-center justify-between border-t mt-4 border-line pt-md"
    >
      {buildHref ? (
        <>
          {prevDisabled ? (
            <button type="button" disabled className={btnBase}>Trước</button>
          ) : (
            <Link href={buildHref(page - 1)} className={btnBase}>Trước</Link>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={prevDisabled}
          onClick={() => onPageChange!(page - 1)}
          className={btnBase}
        >
          Trước
        </button>
      )}

      <span className="text-label-sm text-ink-secondary">
        Trang {page} / {totalPages}
      </span>

      {buildHref ? (
        <>
          {nextDisabled ? (
            <button type="button" disabled className={btnBase}>Sau</button>
          ) : (
            <Link href={buildHref(page + 1)} className={btnBase}>Sau</Link>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => onPageChange!(page + 1)}
          className={btnBase}
        >
          Sau
        </button>
      )}
    </nav>
  );
}
