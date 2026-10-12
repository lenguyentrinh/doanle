import { OrderStatus, ShippingAddressSnapshot } from '../entities/order.entity';

// All ids are ObjectId hex strings.
export class OrderItemResponseDto {
  id!: string;
  productId!: string;
  productName!: string;
  price!: number;
  quantity!: number;
  productImageUrl!: string | null;
}

export class OrderResponseDto {
  id!: string;
  status!: OrderStatus;
  subtotal!: number;
  shippingFee!: number;
  tax!: number;
  total!: number;
  shippingAddress!: ShippingAddressSnapshot;
  items!: OrderItemResponseDto[];
  confirmedAt!: Date | null;
  shippedAt!: Date | null;
  deliveredAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AdminOrderDetailResponseDto extends OrderResponseDto {
  customerEmail!: string | null;
  customerPhone!: string | null;
  paymentStatus!: 'paid' | 'unpaid';
}
