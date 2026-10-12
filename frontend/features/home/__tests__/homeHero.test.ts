import { normalizeHomeHero } from '../services/homeHeroApi';
import { homeHeroSchema } from '../validation/homeHeroSchema';
import { HERO_IMAGE_RULES, HERO_TEMPLATES } from '../types/homeHero';

const cta = { label: 'a', href: '/products' };
const valid = (template: (typeof HERO_TEMPLATES)[number], n: number) => ({
  template,
  eyebrow: '',
  title: 't',
  subtitle: '',
  primaryCta: cta,
  secondaryCta: cta,
  images: Array.from({ length: n }, (_, i) => `/images/${i}.png`),
});

describe('normalizeHomeHero', () => {
  it.each([null, undefined, 'x', {}, { data: null }, { template: 'nope', title: 't' }])(
    'returns null for %p',
    (input) => expect(normalizeHomeHero(input)).toBeNull(),
  );

  it('unwraps { data } and fills defaults', () => {
    const hero = normalizeHomeHero({ data: { template: HERO_TEMPLATES[0], title: 'T' } });
    expect(hero).toMatchObject({ title: 'T', eyebrow: '', images: [] });
  });
});

describe('homeHeroSchema', () => {
  it.each(HERO_TEMPLATES)('%s enforces its image count', (template) => {
    const { min, max } = HERO_IMAGE_RULES[template];
    expect(homeHeroSchema.safeParse(valid(template, min)).success).toBe(true);
    expect(homeHeroSchema.safeParse(valid(template, max)).success).toBe(true);
    expect(homeHeroSchema.safeParse(valid(template, max + 1)).success).toBe(false);
    if (min > 0) expect(homeHeroSchema.safeParse(valid(template, min - 1)).success).toBe(false);
  });

  it('enforces text limits at the boundary', () => {
    const t = HERO_TEMPLATES[0];
    const n = HERO_IMAGE_RULES[t].min;
    const ok = { ...valid(t, n), eyebrow: 'x'.repeat(60), title: 'x'.repeat(120), subtitle: 'x'.repeat(300) };
    expect(homeHeroSchema.safeParse(ok).success).toBe(true);
    expect(homeHeroSchema.safeParse({ ...ok, eyebrow: 'x'.repeat(61) }).success).toBe(false);
    expect(homeHeroSchema.safeParse({ ...ok, title: 'x'.repeat(121) }).success).toBe(false);
    expect(homeHeroSchema.safeParse({ ...ok, subtitle: 'x'.repeat(301) }).success).toBe(false);
  });
});
