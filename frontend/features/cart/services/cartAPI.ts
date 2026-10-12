import { api } from "@/services/api";
import type { CartView } from "@/types/cart";

// Cart API (Story 3.1 contract). Uses the shared cookie-JWT axios instance
// (`services/api.ts`, withCredentials: true) — the cart is authenticated, so the
// HttpOnly JWT cookie rides along automatically (no Authorization header).
//
// IMPORTANT path prefix: the cart controller is `@Controller('api/cart')`, so
// every path carries the `/api` prefix (like /api/products) — UNLIKE the
// unprefixed /auth/* and /users/* routes. There is NO /api/cart/items,
// /api/cart/clear, or /api/cart/merge (merge is Story 3.3). Only these four:

export const getCartAPI = async (): Promise<CartView> => {
  const res = await api.get("/api/cart");
  return res.data as CartView;
};

export const addCartItemAPI = async (
  productId: string,
  quantity: number,
): Promise<CartView> => {
  const res = await api.post("/api/cart", { productId, quantity });
  return res.data as CartView;
};

export const updateCartItemAPI = async (
  itemId: string,
  quantity: number,
): Promise<CartView> => {
  const res = await api.patch(`/api/cart/${itemId}`, { quantity });
  return res.data as CartView;
};

export const removeCartItemAPI = async (itemId: string): Promise<CartView> => {
  const res = await api.delete(`/api/cart/${itemId}`);
  return res.data as CartView;
};

export const mergeCartAPI = async (
  items: { productId: string; quantity: number }[],
): Promise<CartView> => {
  const res = await api.post('/api/cart/merge', { items });
  return res.data as CartView;
};
