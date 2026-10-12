import { z } from 'zod';

// Validation for the admin ProductForm (create + edit share this schema).
// Image count/type/size are validated separately, client-side, in
// ProductForm itself — they aren't react-hook-form fields.
export const productSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  categoryId: z
    .number({ error: 'Vui lòng chọn danh mục' })
    .int('Vui lòng chọn danh mục')
    .positive('Vui lòng chọn danh mục'),
  price: z
    .number({ error: 'Giá không được để trống' })
    .positive('Giá phải lớn hơn 0'),
  stockQuantity: z
    .number({ error: 'Số lượng tồn kho không được để trống' })
    .int('Số lượng tồn kho phải là số nguyên')
    .min(0, 'Số lượng tồn kho không được là số âm'),
  isActive: z.boolean(),
  discountPercentage: z
    .number()
    .min(0, 'Giảm giá phải từ 0 đến 100%')
    .max(100, 'Giảm giá phải từ 0 đến 100%')
    .nullable()
    .optional(),
});
export type ProductFormValues = z.infer<typeof productSchema>;
