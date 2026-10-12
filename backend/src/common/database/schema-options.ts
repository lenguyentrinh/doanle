import type { Schema } from 'mongoose';

/**
 * Shared API serialization contract for every Mongoose schema (top-level and
 * embedded): `_id` is exposed as a string `id` (ObjectId hex) and neither
 * `_id` nor `__v` ever reaches a response. `hiddenFields` are additionally
 * stripped (secrets that must never serialize).
 */
export function applyJsonTransform<T extends Schema>(
  schema: T,
  hiddenFields: string[] = [],
): T {
  schema.set('versionKey', false);
  schema.set('toJSON', {
    virtuals: false,
    versionKey: false,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      if (ret._id !== undefined) {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
      }
      delete ret.__v;
      for (const field of hiddenFields) delete ret[field];
      return ret;
    },
  });
  schema.set('toObject', { virtuals: false, versionKey: false });
  return schema;
}
