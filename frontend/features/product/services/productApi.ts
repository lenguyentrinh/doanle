import type {
  Product,
  ProductListResponse,
  ProductSort,
} from '@/types/product';
import type { CartLineProduct } from '@/types/cart';
import { API_BASE_URL } from '@/lib/config';

// RequestInit augmented with Next's fetch cache hint. Declared locally so the
// service type-checks under ts-jest without depending on Next's global fetch
// augmentation. The `next` property is read by the Next.js server and ignored
// by the browser, so the same function is safe on both sides.
type FetchInit = RequestInit & { next?: { revalidate?: number } };

export interface ProductQuery {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  lowStock?: boolean;
  newArrivals?: boolean;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

export interface ProductStats {
  designCount: number;
  totalStock: number;
  priceCeil: number;
  categories: { category: string; count: number }[];
}

// Build a `?a=1&b=2` query string, omitting undefined/null/empty values.
export function buildProductQueryString(query: ProductQuery = {}): string {
  const params = new URLSearchParams();
  (Object.keys(query) as (keyof ProductQuery)[]).forEach((key) => {
    const value = query[key];
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Fetch a paginated product list. Throws on a non-OK response so callers can
// catch and degrade gracefully (Server Components) or stop loading (client).
export async function getProducts(
  query: ProductQuery = {},
  options: { revalidate?: number } = {},
): Promise<ProductListResponse> {
  const url = `${API_BASE_URL}/api/products${buildProductQueryString(query)}`;
  const res = await fetch(url, {
    next: { revalidate: options.revalidate ?? 60 },
  } as FetchInit);
  if (!res.ok) {
    throw new Error(`Failed to load products (${res.status})`);
  }
  return res.json() as Promise<ProductListResponse>;
}

// Fetch the distinct active category names.
export async function getCategories(
  options: { revalidate?: number } = {},
): Promise<string[]> {
  const url = `${API_BASE_URL}/api/products/categories`;
  const res = await fetch(url, {
    next: { revalidate: options.revalidate ?? 300 },
  } as FetchInit);
  if (!res.ok) {
    throw new Error(`Failed to load categories (${res.status})`);
  }
  // Tolerate both the documented `{ data: string[] }` shape and a bare array,
  // so a contract drift can't crash the home page / generateStaticParams.
  const json = (await res.json()) as { data?: string[] } | string[];
  if (Array.isArray(json)) return json;
  return json.data ?? [];
}

// Storefront-wide counters (unfiltered) for the PLP header eyebrow and the
// sidebar's per-category counts — always reflects the whole active catalog,
// independent of whatever filters the current page view applies.
export async function getProductStats(
  options: { revalidate?: number } = {},
): Promise<ProductStats> {
  const url = `${API_BASE_URL}/api/products/stats`;
  const res = await fetch(url, {
    next: { revalidate: options.revalidate ?? 60 },
  } as FetchInit);
  if (!res.ok) {
    throw new Error(`Failed to load product stats (${res.status})`);
  }
  const json = (await res.json()) as { data?: ProductStats };
  return (
    json.data ?? {
      designCount: 0,
      totalStock: 0,
      priceCeil: 0,
      categories: [],
    }
  );
}

// Fetch a single product by id (Story 2.3 PDP). Returns `null` on a 404 so the
// page can render notFound() (branded 404); throws on any other non-OK status
// so the route error boundary catches a real backend failure. The detail
// endpoint returns `{ data: Product }` and 404s for inactive/soft-deleted rows.
export async function getProduct(
  id: string,
  options: { revalidate?: number } = {},
): Promise<Product | null> {
  const url = `${API_BASE_URL}/api/products/${id}`;
  const res = await fetch(url, {
    next: { revalidate: options.revalidate ?? 60 },
  } as FetchInit);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to load product (${res.status})`);
  }
  // Tolerate a malformed/empty 200 body: a non-JSON body or a missing `data`
  // resolves to null (→ the page renders the branded 404) rather than throwing
  // or returning undefined.
  const json = (await res.json().catch(() => null)) as {
    data?: Product;
  } | null;
  return json?.data ?? null;
}

// Fetch a single product by id for client-side reads (e.g., guest cart hydration).
// Unlike the SSR getProduct above, this uses plain fetch (no revalidate option).
// The backend GET /api/products/:id is unguarded (no JWT).
export async function getProductById(id: string): Promise<CartLineProduct> {
  const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch product ${id}`);
  }
  const json = await res.json();
  // The backend wraps single-product responses in { data: Product }.
  return json.data as CartLineProduct;
}

// Batch fetch multiple products by id (e.g., for populating a guest cart from localStorage).
// Returns successful fetches alongside the IDs that failed so callers can surface
// partial failures instead of silently showing an empty cart.
export async function getProductsByIds(
  ids: string[],
): Promise<{ products: CartLineProduct[]; failedIds: string[] }> {
  const unique = [...new Set(ids)];
  const results = await Promise.allSettled(
    unique.map((id) => getProductById(id)),
  );
  const products: CartLineProduct[] = [];
  const failedIds: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      products.push(r.value);
    } else {
      failedIds.push(unique[i]);
    }
  });
  return { products, failedIds };
}

// Re-export so consumers can import the type alongside the functions.
export type { Product };
