import type { Model } from 'mongoose';
import type { Product } from '../products/entities/product.entity';
import type { OrderDocument } from './entities/order.entity';
import type {
  OrderItemResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';
import type { StorageService } from '../../common/storage/storage.service';
import { resolveFirstImageUrl } from '../../common/utils/image.utils';

// Shared by OrdersService (shopper views) and OrdersAdminService (admin
// detail) — both build the same order response shape.

// productId (hex) -> image keys. Archived (soft-deleted) products are
// included, so their order thumbnails still resolve.
export async function loadProductImageMap(
  productModel: Model<Product>,
  orders: OrderDocument[],
): Promise<Map<string, string[]>> {
  const productIds = [
    ...new Set(
      orders.flatMap((o) => o.items?.map((i) => i.productId.toString()) ?? []),
    ),
  ];
  if (productIds.length === 0) return new Map();
  const products = await productModel
    .find({ _id: { $in: productIds } }, { imageKeys: 1 })
    .lean();
  return new Map(products.map((p) => [p._id.toString(), p.imageKeys]));
}

export function mapItemsWithImages(
  order: OrderDocument,
  productImageMap: Map<string, string[]>,
  storageService: StorageService,
): OrderItemResponseDto[] {
  return (order.items ?? []).map((item) => ({
    id: item.id,
    productId: item.productId.toString(),
    productName: item.productName,
    price: item.price,
    quantity: item.quantity,
    productImageUrl: resolveFirstImageUrl(
      productImageMap.get(item.productId.toString()),
      storageService,
    ),
  }));
}

export function toOrderResponseDto(
  order: OrderDocument,
  items: OrderItemResponseDto[],
): OrderResponseDto {
  return {
    id: order.id,
    status: order.status,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    tax: order.tax,
    total: order.total,
    shippingAddress: {
      firstName: order.shippingAddress.firstName,
      lastName: order.shippingAddress.lastName,
      street: order.shippingAddress.street,
      city: order.shippingAddress.city,
    },
    items,
    confirmedAt: order.confirmedAt ?? null,
    shippedAt: order.shippedAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
