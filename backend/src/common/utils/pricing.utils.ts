// Shared by ProductsService (storefront/admin product responses) and
// CartService (cart line pricing) — both need to turn a product's raw price
// + optional discountPercentage into the price the customer actually pays,
// and must agree on the exact rounding or the same product could show a
// different final price on the PDP vs. in the cart.
export function computeFinalPrice(
  price: number,
  discountPercentage: number | null,
): number {
  if (!discountPercentage) {
    return price;
  }
  return Math.round(price * (1 - discountPercentage / 100) * 100) / 100;
}
