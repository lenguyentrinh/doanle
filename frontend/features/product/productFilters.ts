import type { ProductQuery } from '@/features/product/services/productApi';
import type { ProductSort } from '@/types/product';

// The four sort options the UI offers (Story 2.4). `popularity` is a
// createdAt-DESC proxy server-side until sales data exists (Story 2.1).
export const PRODUCT_SORTS: ProductSort[] = [
  'price_asc',
  'price_desc',
  'newest',
  'popularity',
];

export const SORT_LABELS: Record<ProductSort, string> = {
  price_asc: 'Giá: Thấp đến cao',
  price_desc: 'Giá: Cao đến thấp',
  newest: 'Mới nhất',
  popularity: 'Phổ biến nhất',
};

// Raw Next.js searchParams shape (every value is string | string[] | undefined).
export type RawSearchParams = Record<string, string | string[] | undefined>;

// Display-facing view of the active filters (strings, for inputs/chips).
export interface CurrentFilters {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock: boolean;
  lowStock: boolean;
  newArrivals: boolean;
  sort?: ProductSort;
}

function firstString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function nonNegativeNumber(
  value: string | string[] | undefined,
): number | undefined {
  const str = firstString(value);
  if (str === undefined) return undefined;
  const n = Number(str);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Parse raw searchParams into a display view (`current`) and the API query
// (`query`). Pure + defensive so it can be unit-tested and reused across the
// unified /products PLP. Accepts `search` as the canonical query key, with `q`
// kept as a legacy alias (old /search?q= links redirect through here).
export function parseProductFilters(sp: RawSearchParams): {
  current: CurrentFilters;
  query: ProductQuery;
} {
  const q = firstString(sp.search) ?? firstString(sp.q);
  const category = firstString(sp.category);
  const minPrice = nonNegativeNumber(sp.minPrice);
  let maxPrice = nonNegativeNumber(sp.maxPrice);

  // Drop an inverted upper bound rather than send min>max (the backend 400s on
  // it). Guards a hand-edited URL from tripping the error boundary.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    maxPrice = undefined;
  }

  const inStock = firstString(sp.inStock) === 'true';
  const lowStock = firstString(sp.lowStock) === 'true';
  const newArrivals = firstString(sp.newArrivals) === 'true';

  const sortRaw = firstString(sp.sort);
  const sort = PRODUCT_SORTS.includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : undefined;

  const current: CurrentFilters = {
    q,
    category,
    minPrice: minPrice?.toString(),
    maxPrice: maxPrice?.toString(),
    inStock,
    lowStock,
    newArrivals,
    sort,
  };

  const query: ProductQuery = {
    search: q,
    category,
    minPrice,
    maxPrice,
    inStock: inStock || undefined,
    lowStock: lowStock || undefined,
    newArrivals: newArrivals || undefined,
    sort,
  };

  return { current, query };
}

// Builds a /products URL from a (possibly partial) filter set — used to link
// to "this view minus one filter" (removable chips) without touching the
// draft-then-apply state that ProductFilters owns.
export function buildProductsHref(filters: Partial<CurrentFilters> & { page?: number }): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('search', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.lowStock) params.set('lowStock', 'true');
  if (filters.newArrivals) params.set('newArrivals', 'true');
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  const qs = params.toString();
  return qs ? `/products?${qs}` : '/products';
}
