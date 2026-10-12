// Format a numeric price as Vietnamese đồng (VND), e.g. 189000 -> "189.000 ₫".
// VND has no minor units, so the value is rounded to a whole đồng (e.g. 189.5 -> "190 ₫").
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

// Format an ISO 8601 date string as a short human-readable date, e.g.
// "2026-07-08T00:00:00.000Z" -> "Jul 8, 2026" (order history / detail pages).
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

// Format a Date as Vietnamese dd/MM/yyyy, e.g. new Date(2026, 7, 8) -> "08/08/2026"
// (admin dashboard's "Cập nhật {ngày}" note).
export function formatDateVi(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// Whether a product still counts as "Mới" (ProductCard badge). `now` defaults
// to the current time but is a parameter — not read via Date.now() inline —
// so components stay pure (react-hooks/purity) and callers that already have
// a request-scoped "now" (e.g. to keep a whole page's badges consistent) can
// pass it through instead of letting each card pick its own instant.
export function isNewProduct(createdAt: string, now: number = Date.now()): boolean {
  return now - new Date(createdAt).getTime() < NEW_WINDOW_MS;
}

// Client-side preview of the slug the backend will generate for a category
// name, e.g. "Áo khoác" -> "ao-khoac" ("đ"/"Đ" have no diacritic to strip, so
// they need their own replace before the NFD pass).
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Relative-time caption under an order's date in the admin orders table
// ("2 giờ trước", "hôm qua", "4 ngày trước"). `now` defaults to the current
// time but is a parameter for the same reason as `isNewProduct` — keeps the
// function pure and callable with a fixed instant.
export function formatRelativeVi(iso: string, now: number = Date.now()): string {
  const hours = Math.floor((now - new Date(iso).getTime()) / (60 * 60 * 1000));
  if (hours < 1) return 'vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'hôm qua' : `${days} ngày trước`;
}

// Mongo ObjectId: exactly 24 hex chars. Used to guard route params so a
// malformed id renders the branded 404 instead of hitting the backend.
export const isObjectId = (id: string): boolean => /^[0-9a-fA-F]{24}$/.test(id);
