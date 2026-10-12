import { api } from '@/services/api';
import type { HomeHero } from '@/features/home/types/homeHero';
import { normalizeHomeHero } from '@/features/home/services/homeHeroApi';
import type {
  OrderStatus,
  OrderItem,
  ShippingAddressSnapshot,
} from '@/features/orders/services/ordersAPI';

// Admin dashboard API (Story 5.1). Uses the shared cookie-JWT axios instance
// (`services/api.ts`, withCredentials: true) — no manual Authorization
// header, same pattern as ordersAPI.ts.

export interface RecentOrderSummary {
  id: number;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  itemCount: number;
}

export interface LowStockProductSummary {
  id: number;
  name: string;
  category: string;
  stockQuantity: number;
}

export interface AdminDashboardStats {
  totalOrdersToday: number;
  pendingOrders: number;
  lowStockCount: number;
  totalRevenue: number;
  recentOrders: RecentOrderSummary[];
  lowStockProducts: LowStockProductSummary[];
  previousMonthRevenue: number;
  revenueDaily: { date: string; total: number }[];
  averageOrderValue: number;
  deliveredOrders: number;
  cancelRate: number;
  ordersTodayDelta: number;
  oldestPendingHours: number | null;
  ordersLast7Days: number[];
}

export const getAdminDashboardStatsAPI = async (): Promise<AdminDashboardStats> => {
  const res = await api.get('/api/admin/dashboard/stats');
  return (res.data as { data: AdminDashboardStats }).data;
};

// Admin product management (Story 5.2).

export interface AdminProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  categoryId: number;
  imageKeys: string[];
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  deletedAt: string | null;
  discountPercentage: number | null;
  finalPrice: number;
}

// `total` counts products matching the current search/category filter (for
// pagination); the four `*Count`/`totalProducts` fields are unfiltered —
// always the whole catalog, for the stat strip.
export interface PaginatedAdminProducts {
  data: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  totalProducts: number;
  activeCount: number;
  hiddenCount: number;
  archivedCount: number;
  lowStockCount: number;
}

export const getAdminProductsAPI = async (params: {
  search?: string;
  categoryId?: number;
  page?: number;
  limit?: number;
}): Promise<PaginatedAdminProducts> => {
  const query: Record<string, string | number> = {};
  if (params.search) query.search = params.search;
  if (params.categoryId) query.categoryId = params.categoryId;
  if (params.page !== undefined) query.page = params.page;
  if (params.limit !== undefined) query.limit = params.limit;

  const res = await api.get('/api/admin/products', { params: query });
  return res.data as PaginatedAdminProducts;
};

// Admin category management.

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

export type AdminCategorySort = 'name' | 'count';

// `total` counts categories matching the current search filter (for
// pagination); `totalCategories`/`totalProducts`/`orphanCount` are
// unfiltered — always the whole catalog, for the header chips.
export interface PaginatedAdminCategories {
  data: AdminCategory[];
  total: number;
  page: number;
  limit: number;
  totalCategories: number;
  totalProducts: number;
  orphanCount: number;
}

export const getAdminCategoriesAPI = async (params: {
  search?: string;
  sort?: AdminCategorySort;
  page?: number;
  limit?: number;
}): Promise<PaginatedAdminCategories> => {
  const query: Record<string, string | number> = {};
  if (params.search) query.search = params.search;
  if (params.sort) query.sort = params.sort;
  if (params.page !== undefined) query.page = params.page;
  if (params.limit !== undefined) query.limit = params.limit;

  const res = await api.get('/api/admin/categories', { params: query });
  return res.data as PaginatedAdminCategories;
};

export const createAdminCategoryAPI = async (
  name: string,
): Promise<AdminCategory> => {
  const res = await api.post('/api/admin/categories', { name });
  return (res.data as { data: AdminCategory }).data;
};

export const renameAdminCategoryAPI = async (
  id: number,
  name: string,
): Promise<AdminCategory> => {
  const res = await api.patch(`/api/admin/categories/${id}`, { name });
  return (res.data as { data: AdminCategory }).data;
};

export const deleteAdminCategoryAPI = async (
  id: number,
): Promise<{ message: string }> => {
  const res = await api.delete(`/api/admin/categories/${id}`);
  return res.data as { message: string };
};

export const getAdminProductByIdAPI = async (id: number): Promise<AdminProduct> => {
  const res = await api.get(`/api/admin/products/${id}`);
  return (res.data as { data: AdminProduct }).data;
};

export interface ProductFormPayload {
  name: string;
  description: string;
  categoryId: number;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  /** Percent, 0–100; null/undefined means "no discount". */
  discountPercentage?: number | null;
  newImages: File[];
  /** Edit mode only — keys of existing images the admin chose to keep. */
  existingImageKeys?: string[];
}

function buildProductFormData(payload: ProductFormPayload): FormData {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('description', payload.description);
  formData.append('categoryId', String(payload.categoryId));
  formData.append('price', String(payload.price));
  formData.append('stockQuantity', String(payload.stockQuantity));
  formData.append('isActive', String(payload.isActive));
  // `existingImageKeys` is only ever passed in edit mode — reuse that as the
  // edit/create signal for the discount field's own convention: omitting the
  // field means "leave unchanged" on update, so edit mode must always send
  // something (an explicit '' clears it); create mode only sends a value
  // when the admin actually set one, matching "omit if no discount" on create.
  const isEditing = payload.existingImageKeys !== undefined;
  if (isEditing) {
    formData.append(
      'discountPercentage',
      payload.discountPercentage === null || payload.discountPercentage === undefined
        ? ''
        : String(payload.discountPercentage),
    );
  } else if (payload.discountPercentage !== null && payload.discountPercentage !== undefined) {
    formData.append('discountPercentage', String(payload.discountPercentage));
  }
  if (payload.existingImageKeys !== undefined) {
    formData.append('existingImageKeys', JSON.stringify(payload.existingImageKeys));
  }
  payload.newImages.forEach((file) => formData.append('images', file));
  return formData;
}

// `api`'s shared instance sets a default `Content-Type: application/json`
// header — for a FormData body that must be unset per-request (not just
// left alone) so the browser can generate the multipart boundary itself;
// otherwise the request would go out as JSON-labeled multipart bytes and
// the backend's multer parser would never see the files.
const MULTIPART_CONFIG = { headers: { 'Content-Type': undefined } };

export const createAdminProductAPI = async (
  payload: ProductFormPayload,
): Promise<AdminProduct> => {
  const res = await api.post(
    '/api/admin/products',
    buildProductFormData(payload),
    MULTIPART_CONFIG,
  );
  return (res.data as { data: AdminProduct }).data;
};

export const updateAdminProductAPI = async (
  id: number,
  payload: ProductFormPayload,
): Promise<AdminProduct> => {
  const res = await api.patch(
    `/api/admin/products/${id}`,
    buildProductFormData(payload),
    MULTIPART_CONFIG,
  );
  return (res.data as { data: AdminProduct }).data;
};

// Admin product soft delete / archive (Story 5.3).
export const deleteAdminProductAPI = async (
  id: number,
): Promise<{ message: string }> => {
  const res = await api.delete(`/api/admin/products/${id}`);
  return res.data as { message: string };
};

// Admin order management (Story 5.4). Mirrors the backend
// OrdersAdminController (/api/admin/orders): list with status filter +
// search (by order id or customer name) + sort, detail, forward-only status
// transition, and pending-only cancel.

export type AdminOrderSort = 'newest' | 'oldest';

// Row shape returned by GET /api/admin/orders (AdminOrderSummary).
export interface AdminOrderSummary {
  id: number;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

// `total` counts orders matching the current filter/search (for pagination);
// `totalOrders`/`pendingOrders`/`shippedOrders`/`revenue` are unfiltered —
// always every order, for the header chip and stat strip.
export interface PaginatedAdminOrders {
  data: AdminOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  revenue: number;
}

// Detail shape from GET /api/admin/orders/:id (AdminOrderDetail): the shopper
// detail fields plus admin-only customerEmail/customerPhone/paymentStatus.
export interface AdminOrderDetail {
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
  customerEmail: string | null;
  customerPhone: string | null;
  paymentStatus: 'paid' | 'unpaid';
}

// The list endpoint returns the paginated envelope directly (not wrapped in
// `{ data }`), matching getAdminProductsAPI.
export const getAdminOrdersAPI = async (params: {
  status?: OrderStatus;
  search?: string;
  sort?: AdminOrderSort;
  page?: number;
  limit?: number;
}): Promise<PaginatedAdminOrders> => {
  const query: Record<string, string | number> = {};
  if (params.status) query.status = params.status;
  if (params.search) query.search = params.search;
  if (params.sort) query.sort = params.sort;
  if (params.page !== undefined) query.page = params.page;
  if (params.limit !== undefined) query.limit = params.limit;

  const res = await api.get('/api/admin/orders', { params: query });
  return res.data as PaginatedAdminOrders;
};

// The detail endpoint wraps its payload in `{ data }` (unlike the list).
export const getAdminOrderByIdAPI = async (
  id: number,
): Promise<AdminOrderDetail> => {
  const res = await api.get(`/api/admin/orders/${id}`);
  return (res.data as { data: AdminOrderDetail }).data;
};

export const updateAdminOrderStatusAPI = async (
  id: number,
  status: OrderStatus,
): Promise<{ message: string }> => {
  const res = await api.patch(`/api/admin/orders/${id}/status`, { status });
  return res.data as { message: string };
};

export const cancelAdminOrderAPI = async (
  id: number,
): Promise<{ message: string }> => {
  const res = await api.patch(`/api/admin/orders/${id}/cancel`);
  return res.data as { message: string };
};

// Admin bulk discount (Discount manager, /admin/discounts). `null` clears
// the discount for every listed product.
export const bulkApplyDiscountAPI = async (
  productIds: number[],
  discountPercentage: number | null,
): Promise<{ message: string; updatedCount: number }> => {
  const res = await api.patch('/api/admin/products/discount/bulk', {
    productIds,
    discountPercentage,
  });
  return res.data as { message: string; updatedCount: number };
};

// Admin homepage hero (/admin/home). The public read lives in
// features/home/services/homeHeroApi.ts; the admin page reads through the
// shared axios instance so it is always fresh (no ISR cache).
export const getAdminHomeHeroAPI = async (): Promise<HomeHero | null> => {
  const res = await api.get('/api/home-hero');
  return normalizeHomeHero(res.data);
};

export const updateAdminHomeHeroAPI = async (hero: HomeHero): Promise<HomeHero> => {
  const res = await api.put('/api/admin/home-hero', hero);
  return normalizeHomeHero(res.data) ?? hero;
};

export const uploadAdminHomeHeroImageAPI = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/api/admin/home-hero/images', formData, MULTIPART_CONFIG);
  const body = res.data as { url?: string; data?: { url?: string } };
  const url = body.url ?? body.data?.url;
  if (!url) throw new Error('Upload response missing url');
  return url;
};
