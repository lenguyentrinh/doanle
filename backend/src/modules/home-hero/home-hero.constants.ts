export const HOME_HERO_TEMPLATES = [
  'split',
  'banner',
  'slider',
  'centered',
  'grid',
] as const;

export type HomeHeroTemplate = (typeof HOME_HERO_TEMPLATES)[number];

// Inclusive [min, max] image count allowed per template.
export const HOME_HERO_IMAGE_LIMITS: Record<
  HomeHeroTemplate,
  { min: number; max: number }
> = {
  split: { min: 1, max: 1 },
  banner: { min: 1, max: 1 },
  slider: { min: 1, max: 5 },
  centered: { min: 0, max: 0 },
  grid: { min: 3, max: 3 },
};

// The table holds exactly one row, always at this id.
export const HOME_HERO_ROW_ID = 1;
