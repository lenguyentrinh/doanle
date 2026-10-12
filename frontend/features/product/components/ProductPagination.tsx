import Link from 'next/link';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { buildProductsHref, type CurrentFilters } from '@/features/product/productFilters';

interface ProductPaginationProps {
  page: number;
  total: number;
  limit: number;
  current: CurrentFilters;
}

type PageToken = number | 'ellipsis';

// Always shows page 1, the last page, and a window around the current page;
// collapses any gap wider than one page into a single "…" token.
function buildPageTokens(page: number, totalPages: number): PageToken[] {
  const tokens: PageToken[] = [];
  const window = new Set([1, totalPages, page - 1, page, page + 1]);
  let prev = 0;
  for (let p = 1; p <= totalPages; p += 1) {
    if (!window.has(p) || p < 1) continue;
    if (prev && p - prev > 1) tokens.push('ellipsis');
    tokens.push(p);
    prev = p;
  }
  return tokens;
}

export default function ProductPagination({
  page,
  total,
  limit,
  current,
}: ProductPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) return null;

  const rangeStart = (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);
  const tokens = buildPageTokens(page, totalPages);

  const pillBase =
    'inline-flex h-[42px] min-w-[42px] items-center justify-center rounded-full px-3 text-label-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2';

  return (
    <nav
      aria-label="Phân trang"
      className="mt-[18px] flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"
    >
      <p className="text-[13px] tabular-nums text-ink-muted">
        Hiển thị {rangeStart}–{rangeEnd} trên {total} thiết kế
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={buildProductsHref({ ...current, page: page - 1 })}
            aria-label="Trang trước"
            className={`${pillBase} border border-line text-ink-secondary hover:border-line-strong hover:text-ink`}
          >
            <FiChevronLeft aria-hidden="true" size={16} />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${pillBase} text-line-strong`}>
            <FiChevronLeft size={16} />
          </span>
        )}

        {tokens.map((token, i) =>
          token === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              aria-hidden="true"
              className={`${pillBase} text-line-strong`}
            >
              …
            </span>
          ) : (
            <Link
              key={token}
              href={buildProductsHref({ ...current, page: token })}
              aria-current={token === page ? 'page' : undefined}
              className={`${pillBase} ${
                token === page
                  ? 'bg-ink text-white'
                  : 'border border-line text-ink-secondary hover:border-line-strong hover:text-ink'
              }`}
            >
              {token}
            </Link>
          ),
        )}

        {page < totalPages ? (
          <Link
            href={buildProductsHref({ ...current, page: page + 1 })}
            aria-label="Trang sau"
            className={`${pillBase} border border-line text-ink-secondary hover:border-line-strong hover:text-ink`}
          >
            <FiChevronRight aria-hidden="true" size={16} />
          </Link>
        ) : (
          <span aria-hidden="true" className={`${pillBase} text-line-strong`}>
            <FiChevronRight size={16} />
          </span>
        )}
      </div>
    </nav>
  );
}
