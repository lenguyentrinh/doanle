// Product shapes returned by the backend Products API (Story 2.1).
// Mirrors the serialized response exactly — see
// backend/src/modules/products/products.service.ts (toResponse).

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // a NUMBER (backend ColumnNumericTransformer parses the MySQL DECIMAL)
  stockQuantity: number;
  category: string;
  imageKeys: string[]; // storage keys only, e.g. ['gold-choker.png']
  imageUrls: string[]; // computed at read time, e.g. ['/images/products/gold-choker.png']
  discountPercentage: number | null;
  finalPrice: number; // equals price when discountPercentage is null/0
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt: string | null;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export type ProductSort = 'price_asc' | 'price_desc' | 'newest' | 'popularity';
