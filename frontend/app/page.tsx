import type { Metadata } from 'next';
import { getProducts, getProductStats } from '@/features/product/services/productApi';
import type { Product } from '@/types/product';
import NewArrivals from '@/features/product/components/NewArrivals';
import ScrollReveal from '@/features/product/components/ScrollReveal';
import SectionHeading from '@/features/home/components/SectionHeading';
import CategoryCarousel from '@/features/home/components/CategoryCarousel';
import HeroRenderer from '@/features/home/components/hero/HeroRenderer';
import { getHomeHero } from '@/features/home/services/homeHeroApi';
import {
  DEFAULT_HOME_HERO,
  hasValidHeroImages,
  type HomeHero,
} from '@/features/home/types/homeHero';

// ISR: cache the rendered page and revalidate periodically. The fetches below
// are wrapped in try/catch so `next build` succeeds even if the backend is
// unreachable at build time (degraded-but-valid page).
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Oren',
  description:
    'Oren — thiết kế trầm lặng mà sang trọng, làm theo lô nhỏ, để mặc đi mặc lại suốt nhiều năm.',
  openGraph: {
    title: 'Oren',
    description: 'Tuyển chọn những thiết kế trầm lặng mà sang trọng, làm theo lô nhỏ.',
    type: 'website',
  },
};

export default async function HomePage() {
  let newArrivals: Product[] = [];
  let categoryStats: { category: string; count: number }[] = [];
  let configuredHero: HomeHero | null = null;

  try {
    const [newestRes, stats, heroRes] = await Promise.all([
      getProducts({ limit: 8, sort: 'newest' }),
      getProductStats(),
      // A hero failure must not take down the catalogue sections.
      getHomeHero().catch(() => null),
    ]);
    configuredHero = heroRes;
    newArrivals = newestRes.data.slice(0, 8);
    categoryStats = stats.categories;
  } catch {
    // Degrade gracefully — render the page shell without catalogue data.
    newArrivals = [];
    categoryStats = [];
  }

  const shopCategories = categoryStats.slice(0, 6);

  // One representative photograph per category tile (ISR-cached alongside the
  // page). A failed lookup degrades that tile to a plain ink fill.
  const categoryImages = await Promise.all(
    shopCategories.map(async ({ category }) => {
      try {
        const res = await getProducts({ category, limit: 1 });
        return res.data[0]?.imageUrls?.[0] ?? null;
      } catch {
        return null;
      }
    }),
  );

  const bestSeller = newArrivals[0];
  const hero =
    configuredHero && hasValidHeroImages(configuredHero) ? configuredHero : DEFAULT_HOME_HERO;

  return (
    <>
      {/* Hero — template + copy configured in /admin/home; falls back to the
          original split hero when unconfigured or unusable. */}
      <HeroRenderer hero={hero} bestSeller={bestSeller} />

      {/* 01 — Vừa về */}
      <ScrollReveal className="scroll-mt-3 [scroll-snap-align:start]">
        <NewArrivals products={newArrivals} viewAllHref="/products" />
      </ScrollReveal>

      {/* 02 — Danh mục, auto-sliding carousel */}
      {shopCategories.length > 0 && (
        <ScrollReveal className="scroll-mt-3 [scroll-snap-align:start] mb-24">
          <section className="mx-auto w-full max-w-[1480px] px-[clamp(16px,3.4vw,44px)] pt-27">
            <div className="mb-[clamp(22px,3vw,38px)]">
              <SectionHeading
                num="02"
                title="Danh mục"
                right={
                  <span className="whitespace-nowrap text-label-xs text-ink-muted">
                    Tự chạy · dùng nút để lướt
                  </span>
                }
              />
            </div>
            <CategoryCarousel
              categories={shopCategories.map(({ category, count }, i) => ({
                category,
                count,
                imageUrl: categoryImages[i],
              }))}
            />
          </section>
        </ScrollReveal>
      )}
    </>
  );
}
