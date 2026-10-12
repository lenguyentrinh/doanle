import { API_BASE_URL } from '@/lib/config';
import { isHeroTemplate, type HomeHero } from '../types/homeHero';

type FetchInit = RequestInit & { next?: { revalidate?: number } };

// Accepts a bare HomeHero or `{ data: HomeHero | null }`; anything malformed
// is treated as "no hero configured".
export function normalizeHomeHero(json: unknown): HomeHero | null {
  const raw =
    json && typeof json === 'object' && 'data' in json
      ? (json as { data: unknown }).data
      : json;
  if (!raw || typeof raw !== 'object') return null;
  const h = raw as Partial<HomeHero>;
  if (!isHeroTemplate(h.template) || typeof h.title !== 'string') return null;
  return {
    template: h.template,
    eyebrow: h.eyebrow ?? '',
    title: h.title,
    subtitle: h.subtitle ?? '',
    primaryCta: { label: h.primaryCta?.label ?? '', href: h.primaryCta?.href ?? '' },
    secondaryCta: { label: h.secondaryCta?.label ?? '', href: h.secondaryCta?.href ?? '' },
    images: Array.isArray(h.images) ? h.images : [],
  };
}

// Public fetch for the Server Component home page (ISR). Throws on non-OK so
// the page's try/catch can fall back to the default hero.
export async function getHomeHero(
  options: { revalidate?: number } = {},
): Promise<HomeHero | null> {
  const res = await fetch(`${API_BASE_URL}/api/home-hero`, {
    next: { revalidate: options.revalidate ?? 60 },
  } as FetchInit);
  if (!res.ok) throw new Error(`Failed to load home hero (${res.status})`);
  return normalizeHomeHero(await res.json());
}
