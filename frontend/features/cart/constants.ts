// Cart / order pricing constants (Story 3.2).
//
// The cart subtotal comes from the backend (GET /api/cart). Shipping and tax
// are computed client-side in the cart summary and reused by Epic 4 (orders).
//
// NOTE (Story 3.2 Question #2): Epic 3.2 specifies "flat shipping $5, 10% tax",
// but the app displays VND (formatPrice → ₫). A literal "$5" is currency-
// mismatched, so SHIPPING_FEE is expressed in đồng. The value below is an
// assumed default (a flat domestic shipping fee) pending team confirmation —
// adjust here in one place if the business sets a different number.
export const TAX_RATE = 0.1; // 10% of subtotal
export const SHIPPING_FEE = 30000; // ₫30.000 flat (assumed — see Q2)

// Standard-shipping fee is waived above this subtotal (cart drawer's
// free-shipping progress bar). Matches the design handoff's default.
export const FREE_SHIPPING_THRESHOLD = 1_500_000;

// Tax is rounded to a whole đồng (VND has no minor units).
export function calcTax(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE);
}

// total = subtotal + flat shipping + tax. Shipping is only charged on a
// non-empty cart (an empty cart's total is 0).
export function calcTotal(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal + SHIPPING_FEE + calcTax(subtotal);
}
