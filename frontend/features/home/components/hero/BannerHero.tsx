import type { HomeHero } from '../../types/homeHero';
import {
  HeroCtas,
  HeroEyebrow,
  HeroImage,
  HeroSplitLead,
  HeroSplitTail,
  HeroSubtitle,
  HeroTitle,
} from './heroParts';

function ArchFrame({ src, className, priority = false }: { src: string; className: string; priority?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden [border-radius:min(50%,260px)_min(50%,260px)_18px_18px] bg-fill-dark shadow-[0_40px_80px_-40px_rgba(150,110,78,0.55)] ${className}`}
    >
      <HeroImage src={src} priority={priority} sizes="(max-width: 1023px) 80vw, 30vw" className="object-[center_18%] motion-safe:animate-hero-reveal" />
    </div>
  );
}

// "Sân khấu": arched photo centred, the title split either side of it.
export default function BannerHero({ hero }: { hero: HomeHero }) {
  return (
    <section className="relative scroll-mt-3 overflow-hidden [scroll-snap-align:start]">
      {/* Mobile: single centred column */}
      <div className="flex flex-col items-center gap-6 px-[clamp(16px,3.4vw,44px)] py-12 text-center lg:hidden">
        <ArchFrame src={hero.images[0]} className="aspect-[380/540] w-[min(320px,80vw)]" />
        <HeroEyebrow text={hero.eyebrow} />
        <HeroTitle text={hero.title} />
        <HeroSubtitle text={hero.subtitle} />
        <HeroCtas primary={hero.primaryCta} secondary={hero.secondaryCta} className="justify-center" />
      </div>

      {/* Desktop: title | arch | copy */}
      <div className="relative hidden min-h-[clamp(560px,calc(100vh-124px),760px)] items-center gap-12 px-14 py-14 lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(340px,30vw,520px)_minmax(0,1fr)]">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 size-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fill"
        />
        <div className="relative flex flex-col items-end gap-7 text-right">
          <HeroEyebrow text={hero.eyebrow} />
          <HeroSplitLead text={hero.title} />
        </div>
        <div className="relative flex flex-col items-center gap-4">
          <ArchFrame src={hero.images[0]} priority className="aspect-[380/540] w-full" />
          <span className="font-display text-[15px] italic text-ink-muted">N° 26 — Thu Đông</span>
        </div>
        <div className="relative flex flex-col items-start gap-7">
          <HeroSplitTail text={hero.title} />
          <HeroSubtitle text={hero.subtitle} className="max-w-[32ch] text-[16px]" />
          <HeroCtas primary={hero.primaryCta} secondary={hero.secondaryCta} />
        </div>
      </div>
    </section>
  );
}
