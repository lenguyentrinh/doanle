// Cart shapes returned by the backend Cart API (Story 3.1).
// Mirrors the serialized response EXACTLY — see
// backend/src/modules/cart/cart.service.ts (CartLine / CartView).

export interface CartLineProduct {
  id: string; // product id — the `productId` for POST /api/cart
  name: string;
  price: number; // original unit price — a NUMBER (ColumnNumericTransformer parses the DECIMAL)
  discountPercentage: number | null;
  finalPrice: number; // per-unit price actually charged; equals price when discountPercentage is null/0
  imageUrl: string | null; // computed at read time; may be null
  stockQuantity: number;
  isActive: boolean;
}

export interface CartLine {
  // The cart_items ROW id — this is the `:itemId` for PATCH/DELETE /api/cart/:itemId.
  // NOT the same as `product.id` (the productId used for POST). Never cross them.
  id: string;
  product: CartLineProduct;
  quantity: number;
}

export interface CartView {
  items: CartLine[];
  subtotal: number;
}
