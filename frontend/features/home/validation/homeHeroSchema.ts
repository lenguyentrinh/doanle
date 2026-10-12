import { z } from 'zod';
import { HERO_IMAGE_RULES, HERO_TEMPLATES } from '../types/homeHero';

// Internal paths ("/products") or absolute http(s) URLs.
const hrefSchema = z
  .string()
  .trim()
  .min(1, 'Đường dẫn không được để trống')
  .max(300, 'Đường dẫn quá dài')
  .refine((v) => /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v), {
    message: 'Đường dẫn phải bắt đầu bằng / hoặc http(s)://',
  });

const ctaSchema = z.object({
  label: z.string().trim().min(1, 'Nhãn nút không được để trống').max(40, 'Tối đa 40 ký tự'),
  href: hrefSchema,
});

export const homeHeroSchema = z
  .object({
    template: z.enum(HERO_TEMPLATES),
    eyebrow: z.string().trim().max(60, 'Tối đa 60 ký tự'),
    title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(120, 'Tối đa 120 ký tự'),
    subtitle: z.string().trim().max(300, 'Tối đa 300 ký tự'),
    primaryCta: ctaSchema,
    secondaryCta: ctaSchema,
    images: z.array(z.string().min(1)),
  })
  .superRefine((hero, ctx) => {
    const { min, max } = HERO_IMAGE_RULES[hero.template];
    const n = hero.images.length;
    if (n < min || n > max) {
      const message =
        min === max
          ? max === 0
            ? 'Mẫu này không dùng ảnh'
            : `Mẫu này cần đúng ${max} ảnh`
          : `Mẫu này cần từ ${min} đến ${max} ảnh`;
      ctx.addIssue({ code: 'custom', path: ['images'], message });
    }
  });

export type HomeHeroFormValues = z.infer<typeof homeHeroSchema>;
