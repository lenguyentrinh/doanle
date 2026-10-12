import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';

// Standalone alert log — no reference enforcement to orders/products, not a
// joined view of order/product state.
@Schema({
  collection: 'low_stock_alerts',
  timestamps: { createdAt: true, updatedAt: false },
})
export class LowStockAlert {
  id!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  orderId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true })
  productName!: string;

  @Prop({ required: true })
  remainingStock!: number;

  createdAt!: Date;
}

export type LowStockAlertDocument = HydratedDocument<LowStockAlert>;
export const LowStockAlertSchema = applyJsonTransform(
  SchemaFactory.createForClass(LowStockAlert),
);
LowStockAlertSchema.index(
  { productId: 1 },
  { name: 'idx_low_stock_alerts_product_id' },
);
