import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';

// One document per (user, product) — add-to-cart increments an existing one.
@Schema({ collection: 'cart_items', timestamps: true })
export class CartItem {
  id!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true })
  quantity!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type CartItemDocument = HydratedDocument<CartItem>;
export const CartItemSchema = applyJsonTransform(
  SchemaFactory.createForClass(CartItem),
);
CartItemSchema.index(
  { userId: 1, productId: 1 },
  { unique: true, name: 'uq_cart_items_user_product' },
);
CartItemSchema.index({ userId: 1 }, { name: 'idx_cart_items_user_id' });
CartItemSchema.index({ productId: 1 }, { name: 'idx_cart_items_product_id' });
