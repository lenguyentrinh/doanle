import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';
import { OrderItem, OrderItemSchema } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// Snapshot of the user's owned saved address (Story 1.5 shape).
export interface ShippingAddressSnapshot {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
}

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  id!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Prop({ required: true })
  subtotal!: number;

  @Prop({ default: 30000 })
  shippingFee!: number;

  @Prop({ required: true })
  tax!: number;

  @Prop({ required: true })
  total!: number;

  @Prop({
    type: {
      firstName: String,
      lastName: String,
      street: String,
      city: String,
    },
    _id: false,
    required: true,
  })
  shippingAddress!: ShippingAddressSnapshot;

  // Payment reference from an external gateway. Unused under the current
  // Cash-on-Delivery model (payment is collected by the courier on delivery),
  // so it stays null; retained as the seam a future online gateway would fill.
  @Prop({ type: String, maxlength: 255, default: null })
  paymentReference!: string | null;

  @Prop({ type: String, required: true, maxlength: 255 })
  idempotencyKey!: string;

  // Per-status-transition timestamps for the order-detail status timeline
  // (Story 4.4). All start null on a freshly placed (pending) order and are
  // stamped as an admin advances the order forward
  // (confirmed→shipped→delivered) via updateOrderStatus.
  @Prop({ type: Date, default: null })
  confirmedAt!: Date | null;

  @Prop({ type: Date, default: null })
  shippedAt!: Date | null;

  @Prop({ type: Date, default: null })
  deliveredAt!: Date | null;

  // Items are embedded in the order document (they're only ever read/written
  // with their order), so the old order_items table's CASCADE is implicit.
  @Prop({ type: [OrderItemSchema], default: [] })
  items!: OrderItem[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = applyJsonTransform(
  SchemaFactory.createForClass(Order),
);
OrderSchema.index({ userId: 1 }, { name: 'idx_orders_user_id' });
OrderSchema.index(
  { status: 1, createdAt: 1 },
  { name: 'idx_orders_status_created_at' },
);
OrderSchema.index({ confirmedAt: 1 }, { name: 'idx_orders_confirmed_at' });
OrderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, name: 'uq_orders_user_idempotency_key' },
);
OrderSchema.index(
  { 'items.productId': 1 },
  { name: 'idx_order_items_product_id' },
);
