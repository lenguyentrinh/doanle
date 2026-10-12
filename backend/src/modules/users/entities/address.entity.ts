import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';

@Schema({
  collection: 'addresses',
  timestamps: { createdAt: true, updatedAt: false },
})
export class Address {
  id!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true })
  street!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ default: false })
  isDefault!: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  createdAt!: Date;
}

export type AddressDocument = HydratedDocument<Address>;
export const AddressSchema = applyJsonTransform(
  SchemaFactory.createForClass(Address),
);
