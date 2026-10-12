import Link from 'next/link';
import type { Product } from '@/types/product';
import { formatPrice } from '@/lib/helpers';
import type { HomeHero } from '../../types/homeHero';
import { HeroCtas, HeroEyebrow, HeroImage, HeroSubtitle, HeroTitle } from './heroParts';

// Full-bleed band, image column runs edge to edge on the right with no page
// padding. Left column staggers in; right column settles from a one-shot Ken
// Burns zoom. `bestSeller` floats over the image (split only).
export default function SplitHero({
  hero,
  bestSeller,
}: {
  hero: HomeHero;
  bestSeller?: Product;
}) {
  return (
    <section className="relative grid overflow-x-clip min-h-[clamp(560px,calc(100vh-124px),760px)] grid-cols-1 items-stretch pt-8 scroll-mt-3 [scroll-snap-align:start] lg:grid-cols-[1.05fr_1fr] lg:items-center">
      <span className="pointer-events-none absolute bottom-24 left-[34px] z-[5] hidden origin-bottom-left -rotate-90 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.32em] text-ink-muted lg:block">
        Thu 2026 — Tuyển chọn hàng tuần
      </span>

      <div className="flex max-w-[620px] flex-col justify-center gap-[34px] px-[clamp(16px,3.4vw,44px)] pt-14 pb-18 lg:pl-24 lg:pr-11">
        <HeroEyebrow text={hero.eyebrow} />
        <HeroTitle text={hero.title} />
        <HeroSubtitle text={hero.subtitle} />
        <HeroCtas primary={hero.primaryCta} secondary={hero.secondaryCta} />
      </div>

      {/* Arch scales with width at a fixed ratio, never with section height. Hidden below lg. */}
      <div className="hidden items-center justify-center px-8 pb-10 lg:flex">
        <div className="relative aspect-[4/5] w-full max-w-[560px] overflow-hidden [border-radius:min(50%,280px)_min(50%,280px)_18px_18px] bg-fill-dark shadow-[0_40px_80px_-40px_rgba(150,110,78,0.55)]">
        <HeroImage
          src={hero.images[0]}
          priority
          sizes="(max-width: 1535px) 40vw, 560px"
          className="object-[center_22%] motion-safe:animate-hero-reveal"
        />
        {bestSeller && (
          <div className="motion-safe:animate-fade-up motion-safe:[animation-delay:600ms] absolute bottom-9 left-10 flex items-center gap-3 whitespace-nowrap rounded-full bg-white/94 py-[11px] pl-[11px] pr-5 shadow-hero backdrop-blur-md">
            <span
              className="block h-[52px] w-11 rounded-t-full rounded-b-md bg-cover bg-center"
              style={{ backgroundImage: `url(${bestSeller.imageUrls?.[0] ?? ''})` }}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-label-xs text-ink-muted">Bán chạy tuần này</span>
              <span className="text-body-sm text-ink">
                {bestSeller.name} · {formatPrice(bestSeller.price)}
              </span>
            </span>
            <Link
              href={`/products/${bestSeller.id}`}
              aria-label="Xem"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-ink text-white transition-colors duration-200 hover:bg-accent"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M7 17L17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </Link>
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
