import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';

// Embedded in Order.items (no collection of its own). Each line keeps its own
// `_id`, exposed as `id` in responses. Deleting a product that an order line
// references is prevented by archiving (soft delete) — products are never
// hard-deleted by the app, matching the old ON DELETE RESTRICT.
@Schema()
export class OrderItem {
  id!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  // Snapshotted at order time so historical orders survive product edits.
  @Prop({ required: true })
  productName!: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  quantity!: number;
}

export const OrderItemSchema = applyJsonTransform(
  SchemaFactory.createForClass(OrderItem),
);
