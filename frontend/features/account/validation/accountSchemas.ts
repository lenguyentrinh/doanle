import { z } from 'zod';

// Validation for the /account screens. Mirrors lib/validation/authSchemas.ts.

// Profile: Legal Name + phone are editable (email is immutable). Stitch
// "Account | Profile & Addresses" shows a single "Legal Name" field, mapped
// 1:1 to the auth `userName`.
export const profileSchema = z.object({
  userName: z.string().min(1, 'Tên không được để trống'),
  phoneNumber: z.string().optional(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

// Shipping address — field set per the Stitch "Account | Addresses" screen.
export const addressSchema = z.object({
  firstName: z.string().min(1, 'Họ không được để trống'),
  lastName: z.string().min(1, 'Tên không được để trống'),
  street: z.string().min(1, 'Địa chỉ không được để trống'),
  city: z.string().min(1, 'Thành phố không được để trống'),
  isDefault: z.boolean().optional(),
});
export type AddressValues = z.infer<typeof addressSchema>;
