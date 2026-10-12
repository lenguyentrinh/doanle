import type { Metadata } from 'next';
import Link from 'next/link';
import { FiX } from 'react-icons/fi';
import ProductGrid from '@/features/product/components/ProductGrid';
import ProductPagination from '@/features/product/components/ProductPagination';
import ProductFilters from '@/features/product/components/ProductFilters';
import MobileFilterSheet from '@/features/product/components/MobileFilterSheet';
import PlpSortControl from '@/features/product/components/PlpSortControl';
import {
  getProducts,
  getProductStats,
} from '@/features/product/services/productApi';
import {
  buildProductsHref,
  parseProductFilters,
  SORT_LABELS,
  type CurrentFilters,
  type RawSearchParams,
} from '@/features/product/productFilters';
import { formatPrice } from '@/lib/helpers';

// Unified Product Listing Page (PLP). Single source of truth for browsing:
// category, search, price, in-stock, sort, and paging all live in the URL query
// (?category=&search=&minPrice=&maxPrice=&inStock=&lowStock=&newArrivals=&sort=&page=).
// Dynamically rendered per request (reads searchParams); getProducts keeps its
// own ISR hint.
const PAGE_LIMIT = 8;

// Canonical strategy: keep a small set of meaningful URLs indexable and
// canonicalise refinement permutations up to the nearest one, so equivalent
// content is not indexed many times.
//   - bare /products (all) and /products?category=X (pure category) = self-canonical
//   - anything with search / price / stock / sort / page > 1 canonicalises up
//     to the category view (if a category is set) or bare /products.
function canonicalFor(current: {
  category?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock: boolean;
  lowStock: boolean;
  newArrivals: boolean;
  sort?: string;
}, page: number): string {
  const isPureCategory =
    !current.q &&
    !current.minPrice &&
    !current.maxPrice &&
    !current.inStock &&
    !current.lowStock &&
    !current.newArrivals &&
    !current.sort &&
    page <= 1;
  if (current.category) {
    return `/products?category=${encodeURIComponent(current.category)}`;
  }
  if (isPureCategory) {
    return '/products';
  }
  return '/products';
}

interface ActiveFilterChip {
  key: string;
  label: string;
  href: string;
}

// One removable pill per active refinement, so the results header shows at a
// glance why the grid looks the way it does. Order mirrors the sidebar
// (category, price, stock), then sort; search is included last since it's
// owned by the header search bar rather than the panel itself.
function buildActiveFilterChips(current: CurrentFilters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (current.category) {
    chips.push({
      key: 'category',
      label: current.category,
      href: buildProductsHref({ ...current, category: undefined }),
    });
  }
  if (current.minPrice || current.maxPrice) {
    const min = current.minPrice ? Number(current.minPrice) : undefined;
    const max = current.maxPrice ? Number(current.maxPrice) : undefined;
    chips.push({
      key: 'price',
      label:
        min !== undefined && max !== undefined
          ? `${formatPrice(min)} - ${formatPrice(max)}`
          : max !== undefined
            ? `Đến ${formatPrice(max)}`
            : `Từ ${formatPrice(min ?? 0)}`,
      href: buildProductsHref({
        ...current,
        minPrice: undefined,
        maxPrice: undefined,
      }),
    });
  }
  if (current.inStock) {
    chips.push({
      key: 'inStock',
      label: 'Chỉ hàng còn sẵn',
      href: buildProductsHref({ ...current, inStock: false }),
    });
  }
  if (current.lowStock) {
    chips.push({
      key: 'lowStock',
      label: 'Sắp hết (dưới 5 chiếc)',
      href: buildProductsHref({ ...current, lowStock: false }),
    });
  }
  if (current.newArrivals) {
    chips.push({
      key: 'newArrivals',
      label: 'Lô mới nhất',
      href: buildProductsHref({ ...current, newArrivals: false }),
    });
  }
  if (current.sort) {
    chips.push({
      key: 'sort',
      label: SORT_LABELS[current.sort],
      href: buildProductsHref({ ...current, sort: undefined }),
    });
  }
  if (current.q) {
    chips.push({
      key: 'search',
      label: `"${current.q}"`,
      href: buildProductsHref({ ...current, q: undefined }),
    });
  }
  return chips;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const { current } = parseProductFilters(sp);
  const page = Number(
    (Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? '1',
  );

  let title = 'Tất cả sản phẩm - Oren';
  let description = 'Khám phá bộ sưu tập thời trang nữ cao cấp được tuyển chọn tại Oren.';
  if (current.category) {
    title = `${current.category} - Oren`;
    description = `Mua sắm bộ sưu tập ${current.category} tại Oren.`;
  } else if (current.q) {
    title = `Tìm kiếm: ${current.q} - Oren`;
    description = `Kết quả tìm kiếm cho “${current.q}” tại Oren.`;
  }

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    alternates: { canonical: canonicalFor(current, Number.isFinite(page) ? page : 1) },
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const { current, query } = parseProductFilters(sp);
  const page = Number(
    (Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? '1',
  );

  // Storefront-wide counters (unfiltered) — supplementary, so degrade to a
  // zeroed shape on failure rather than breaking the page.
  const stats = await getProductStats().catch(() => ({
    designCount: 0,
    totalStock: 0,
    priceCeil: 0,
    categories: [] as { category: string; count: number }[],
  }));

  // Slider floor is always 0 (not the cheapest item's price) so a shopper
  // can select "everything up to X"; the ceiling rounds the real catalog max
  // out to a clean 100k step (4.15M → 4.2M) — computed server-side over the
  // whole active catalog, never from the current page's 8 products (that
  // would make the range shift per page).
  const PRICE_ROUND_STEP = 100_000;
  const priceFloor = 0;
  const priceCeil = Math.max(
    priceFloor + PRICE_ROUND_STEP,
    Math.ceil(stats.priceCeil / PRICE_ROUND_STEP) * PRICE_ROUND_STEP,
  );

  // NOT wrapped in try/catch: a real failure should surface via error.tsx.
  const res = await getProducts({ ...query, page, limit: PAGE_LIMIT });

  const heading = current.category
    ? current.category
    : current.q
      ? `Kết quả cho "${current.q}"`
      : 'Tất cả sản phẩm';

  // Re-seeds both the sidebar and the sheet's draft whenever the active
  // filters change (e.g. navigating between categories).
  const filterKey = `${current.q ?? ''}|${current.category ?? ''}|${current.minPrice ?? ''}|${current.maxPrice ?? ''}|${current.inStock}|${current.lowStock}|${current.newArrivals}|${current.sort ?? ''}`;
  const activeFilterChips = buildActiveFilterChips(current);
  // Panel-owned refinements only (search belongs to the header, not the sheet).
  const activeFilterCount = [
    current.category,
    current.minPrice || current.maxPrice,
    current.inStock,
    current.lowStock,
    current.newArrivals,
    current.sort,
  ].filter(Boolean).length;

  return (
    <section className="mx-auto w-full max-w-[1480px] px-[clamp(16px,3.4vw,44px)] pb-[clamp(64px,8vw,110px)]">
      {/* Breadcrumb — quiet wayfinding above the display heading */}
      <nav aria-label="Điều hướng breadcrumb" className="flex items-center gap-2 pt-[26px] text-[12.5px] text-ink-muted">
        <Link href="/" className="transition-colors duration-200 hover:text-accent">
          Trang chủ
        </Link>
        <span aria-hidden="true">/</span>
        {current.category || current.q ? (
          <Link href="/products" className="transition-colors duration-200 hover:text-accent">
            Sản phẩm
          </Link>
        ) : (
          <span className="text-ink">Sản phẩm</span>
        )}
        {current.category && (
          <>
            <span aria-hidden="true">/</span>
            <span className="text-ink">{current.category}</span>
          </>
        )}
        {current.q && (
          <>
            <span aria-hidden="true">/</span>
            <span className="text-ink">Tìm kiếm</span>
          </>
        )}
      </nav>

      {/* Page header — full width, above the sidebar+content split */}
      <div className="mt-6 flex flex-col gap-6 border-b border-line-strong pb-[26px] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-[14px]">
          <span className="flex items-center gap-2.5 text-label-xs text-accent">
            <span aria-hidden="true" className="h-px w-[26px] bg-accent" />
            Chào mừng đến Oren
          </span>
          <h1 className="font-display text-[clamp(34px,5.2vw,62px)] font-medium leading-none tracking-[-0.022em] text-ink">
            {heading}
          </h1>
        </div>

        <div className="flex items-center gap-5 pb-1">
          <span className="text-[13px] tabular-nums text-ink-muted">
            Hiện {res.data.length} / {res.total}
          </span>
          <div className="hidden w-[220px] md:block">
            <PlpSortControl current={current} />
          </div>
        </div>
      </div>

      {/* Sidebar (248px) | content (1fr) */}
      <div className="mt-8 md:grid md:grid-cols-[248px_1fr] md:items-start md:gap-x-[44px]">
        {/* Refine panel — desktop only; mobile gets the bottom sheet below */}
        <div className="hidden md:block">
          <ProductFilters
            key={filterKey}
            categories={stats.categories}
            totalDesignCount={stats.designCount}
            priceFloor={priceFloor}
            priceCeil={priceCeil}
            current={current}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-[26px] motion-safe:animate-fade-up">
          <MobileFilterSheet
            categories={stats.categories}
            totalDesignCount={stats.designCount}
            priceFloor={priceFloor}
            priceCeil={priceCeil}
            current={current}
            activeCount={activeFilterCount}
            filterKey={filterKey}
          />

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5" aria-label="Bộ lọc đang áp dụng">
              <span className="text-[12.5px] text-ink-muted">Đang lọc:</span>
              {activeFilterChips.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-[15px] py-2 text-[12.5px] text-ink-secondary transition-colors duration-200 hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  {chip.label}
                  <FiX aria-hidden="true" size={10} className="text-ink-muted" />
                </Link>
              ))}
              <Link
                href="/products"
                className="text-[12.5px] text-accent transition-colors duration-200 hover:text-accent-strong"
              >
                Xoá tất cả
              </Link>
            </div>
          )}

          {res.total === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3.5 rounded-2xl bg-fill px-6 py-[88px] text-center">
              <p className="font-display text-[28px] font-medium text-ink">Không tìm thấy sản phẩm nào</p>
              <p className="text-body-md text-ink-muted">
                Thử nới khoảng giá hoặc bỏ bộ lọc danh mục.
              </p>
              <Link
                href="/products"
                className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-ink px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Xoá bộ lọc
              </Link>
            </div>
          ) : (
            <>
              <ProductGrid products={res.data} />
              <ProductPagination
                page={page}
                total={res.total}
                limit={PAGE_LIMIT}
                current={current}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
