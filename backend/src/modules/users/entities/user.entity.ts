import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { applyJsonTransform } from '../../../common/database/schema-options';
import { UserRole } from './user-role.enum';

@Schema({
  collection: 'users',
  timestamps: { createdAt: true, updatedAt: false },
})
export class User {
  id!: string;

  @Prop({ required: true })
  userName!: string;

  // Lower-cased + trimmed so uniqueness stays case-insensitive, matching the
  // previous MySQL (case-insensitive collation) behaviour.
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ type: String, default: null })
  birthDate!: string | null;

  @Prop({ type: String, default: null })
  phoneNumber!: string | null;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Prop({ default: false })
  emailVerified!: boolean;

  @Prop({ type: String, default: null })
  emailOtpCode!: string | null;

  @Prop({ type: Date, default: null })
  emailOtpExpires!: Date | null;

  @Prop({ default: 0 })
  emailOtpAttempts!: number;

  // Bumped by every address mutation inside its transaction so concurrent
  // address writes for one user conflict and serialize (replaces the old
  // SELECT ... FOR UPDATE on the user's address rows). Never exposed.
  @Prop({ default: 0, select: false })
  addressLockSeq!: number;

  createdAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
// Defence in depth: secrets are never serialized, even if a User document is
// returned directly from a handler.
export const UserSchema = applyJsonTransform(
  SchemaFactory.createForClass(User),
  [
    'password',
    'emailOtpCode',
    'emailOtpExpires',
    'emailOtpAttempts',
    'addressLockSeq',
  ],
);
