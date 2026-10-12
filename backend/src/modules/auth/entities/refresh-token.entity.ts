import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';

@Schema({
  collection: 'refresh_tokens',
  timestamps: { createdAt: true, updatedAt: false },
})
export class RefreshToken {
  id!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ default: false })
  isRevoked!: boolean;

  // Set alongside isRevoked whenever rotation revokes this row — lets
  // rotateRefreshToken tell "just rotated a moment ago by a legitimate
  // concurrent request" apart from "replayed well after the fact" when
  // deciding whether to treat a revoked-token replay as reuse.
  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;

  // The row rotation produced when it revoked this one. Diagnostic only.
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  replacedByTokenId!: Types.ObjectId | null;

  createdAt!: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
export const RefreshTokenSchema = applyJsonTransform(
  SchemaFactory.createForClass(RefreshToken),
);
