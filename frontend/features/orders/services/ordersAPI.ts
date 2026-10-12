import { AxiosError } from 'axios';
import { api } from '@/services/api';

// Orders API (Story 4.1a contract). Uses the shared cookie-JWT axios
// instance (`services/api.ts`, withCredentials: true) — no manual
// Authorization header. Controller-level `api/` prefix, like /api/cart.
//
// 4.4 will extend this file with GET /api/orders (list).

export interface CreateOrderPayload {
  cartItems: { productId: number; quantity: number }[];
  shippingAddressId: number;
  idempotencyKey: string;
}

export interface CreateOrderResult {
  orderId: number;
}

export const createOrderAPI = async (
  payload: CreateOrderPayload,
): Promise<CreateOrderResult> => {
  const res = await api.post('/api/orders', payload);
  return res.data as CreateOrderResult;
};

// Matches the Order/OrderItem entities' JSON shape (backend/src/modules/orders).
export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  // Resolved from the joined product's first image key (Story 4.4);
  // null when the product can't be resolved or has no images.
  productImageUrl: string | null;
}

export interface ShippingAddressSnapshot {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  shippingAddress: ShippingAddressSnapshot;
  paymentReference: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface PaginatedOrders {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

// Paginated order history for the caller (Story 4.4). No 404-to-null branch —
// an authenticated user's own list endpoint has no "not found" case, only
// "empty" (data: []); a real error rethrows for the caller to handle.
export const getOrdersAPI = async (params: {
  status?: OrderStatus;
  search?: string;
  sort?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}): Promise<PaginatedOrders> => {
  const query: Record<string, string | number> = {};
  if (params.status) query.status = params.status;
  if (params.search) query.search = params.search;
  if (params.sort) query.sort = params.sort;
  if (params.page !== undefined) query.page = params.page;
  if (params.limit !== undefined) query.limit = params.limit;

  const res = await api.get('/api/orders', { params: query });
  return res.data as PaginatedOrders;
};

// Fetch a single order owned by the caller (Story 4.3). Returns `null` on a
// 404 (not found or not owned — the backend gives a generic 404 for both) so
// the confirmation page can render its own "Order not found" state; rethrows
// on any other error (mirrors `productApi.ts`'s `getProduct` contract).
export const getOrderByIdAPI = async (
  orderId: number,
): Promise<Order | null> => {
  try {
    const res = await api.get(`/api/orders/${orderId}`);
    return (res.data as { data: Order }).data;
  } catch (err: unknown) {
    if (err instanceof AxiosError && err.response?.status === 404) return null;
    throw err;
  }
};
