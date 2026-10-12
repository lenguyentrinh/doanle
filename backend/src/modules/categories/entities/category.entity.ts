import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';

@Schema({ collection: 'categories', timestamps: true })
export class Category {
  id!: string;

  @Prop({ required: true, maxlength: 100, unique: true })
  name!: string;

  @Prop({ required: true, maxlength: 120, unique: true })
  slug!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = applyJsonTransform(
  SchemaFactory.createForClass(Category),
);
