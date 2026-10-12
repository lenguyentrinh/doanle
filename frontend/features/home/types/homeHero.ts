export const HERO_TEMPLATES = ['split', 'banner', 'slider', 'centered', 'grid'] as const;
export type HeroTemplate = (typeof HERO_TEMPLATES)[number];

export interface HeroCta {
  label: string;
  href: string;
}

// Mirrors the backend contract for GET /home-hero and PUT /admin/home-hero.
export interface HomeHero {
  template: HeroTemplate;
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: HeroCta;
  secondaryCta: HeroCta;
  images: string[];
}

// Allowed image count per template (inclusive range).
export const HERO_IMAGE_RULES: Record<HeroTemplate, { min: number; max: number }> = {
  split: { min: 1, max: 1 },
  banner: { min: 1, max: 1 },
  slider: { min: 1, max: 5 },
  centered: { min: 0, max: 0 },
  grid: { min: 3, max: 3 },
};

export const HERO_TEMPLATE_LABELS: Record<HeroTemplate, { name: string; hint: string }> = {
  split: { name: 'Chia đôi', hint: 'Chữ bên trái, ảnh vòm bên phải' },
  banner: { name: 'Sân khấu', hint: 'Ảnh vòm ở giữa, tiêu đề tách hai bên' },
  slider: { name: 'Trình chiếu', hint: 'Tự chuyển 1–5 ảnh, chữ phủ lên trên' },
  centered: { name: 'Chỉ chữ', hint: 'Tiêu đề lớn căn giữa, không ảnh' },
  grid: { name: 'Lưới ảnh', hint: 'Chữ kèm 3 ảnh: 1 lớn, 2 nhỏ' },
};

export function isHeroTemplate(value: unknown): value is HeroTemplate {
  return typeof value === 'string' && (HERO_TEMPLATES as readonly string[]).includes(value);
}

// True when the hero's image list satisfies its template's count rule.
export function hasValidHeroImages(hero: Pick<HomeHero, 'template' | 'images'>): boolean {
  const rule = HERO_IMAGE_RULES[hero.template];
  return (
    Array.isArray(hero.images) &&
    hero.images.length >= rule.min &&
    hero.images.length <= rule.max &&
    hero.images.every((src) => typeof src === 'string' && src.length > 0)
  );
}

// The hardcoded hero the storefront has always shown; used whenever the API
// returns null/fails or the configured hero is unusable.
export const DEFAULT_HOME_HERO: HomeHero = {
  template: 'split',
  eyebrow: 'Hàng về mỗi thứ Năm',
  title: 'Chúng tôi lựa,\nbạn chỉ việc mặc',
  subtitle:
    'Mỗi tuần chúng tôi xem qua hàng nghìn mẫu và chỉ giữ lại số ít thật sự đáng mặc. Kiểm từng chiếc trước khi lên kệ, để bạn không phải đoán.',
  primaryCta: { label: 'Xem hàng vừa về', href: '/products' },
  secondaryCta: { label: 'Xem tất cả', href: '/products' },
  images: ['/images/home.png'],
};
