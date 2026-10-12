import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';

// Singleton document: its `_id` is always AUTH_LOOKBOOK_ROW_ID (a fixed
// string, not an ObjectId), upserted by AuthLookbookService.
@Schema({
  collection: 'auth_lookbook',
  timestamps: { createdAt: false, updatedAt: true },
})
export class AuthLookbookEntity {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: String, maxlength: 2048, default: null })
  imageUrl!: string | null;

  @Prop({ type: String, maxlength: 200, default: null })
  caption!: string | null;

  @Prop({ type: String, maxlength: 40, default: null })
  label!: string | null;

  updatedAt!: Date;
}

export type AuthLookbookDocument = HydratedDocument<AuthLookbookEntity>;
export const AuthLookbookSchema = applyJsonTransform(
  SchemaFactory.createForClass(AuthLookbookEntity),
);
