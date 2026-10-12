import { OrderStatus, ShippingAddressSnapshot } from '../entities/order.entity';

export class OrderItemResponseDto {
  id!: number;
  productId!: number;
  productName!: string;
  price!: number;
  quantity!: number;
  productImageUrl!: string | null;
}

export class OrderResponseDto {
  id!: number;
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
