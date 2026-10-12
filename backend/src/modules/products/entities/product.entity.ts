import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';

@Schema({ collection: 'products', timestamps: true })
export class Product {
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  // Prices are VND amounts stored as plain numbers (BSON double).
  @Prop({ required: true })
  price!: number;

  @Prop({ default: 0 })
  stockQuantity!: number;

  // Per-product discount, admin-editable one-at-a-time or in bulk. `null`
  // means "no discount configured" — distinct from `0`, which is a valid
  // (if pointless) 0% discount. See UpdateProductDto for the clear-vs-omit
  // convention used when this travels over multipart form fields.
  @Prop({ type: Number, default: null })
  discountPercentage!: number | null;

  // Referential integrity (ON DELETE RESTRICT in the old schema) is enforced
  // in CategoriesService.remove().
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  categoryId!: Types.ObjectId;

  /**
   * Storage object keys only (e.g. "product-placeholder.svg") — NEVER full URLs.
   * Public URLs are generated at read time in ProductsService.
   */
  @Prop({ type: [String], default: [] })
  imageKeys!: string[];

  @Prop({ default: true })
  isActive!: boolean;

  // Soft delete ("archived"): every storefront/admin lookup that used
  // TypeORM's default soft-delete scope now filters `deletedAt: null`
  // explicitly.
  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ProductDocument = HydratedDocument<Product>;
export const ProductSchema = applyJsonTransform(
  SchemaFactory.createForClass(Product),
);
ProductSchema.index({ categoryId: 1 }, { name: 'idx_products_category_id' });
ProductSchema.index({ isActive: 1 }, { name: 'idx_products_isActive' });
