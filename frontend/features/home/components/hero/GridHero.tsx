import type { HomeHero } from '../../types/homeHero';
import { HeroCtas, HeroEyebrow, HeroImage, HeroSubtitle, HeroTitle } from './heroParts';

// Copy on the left, 3-image mosaic on the right (1 large + 2 small). Fixed size on
// desktop, capped on tablet, hidden on mobile.
export default function GridHero({ hero }: { hero: HomeHero }) {
  const [large, smallTop, smallBottom] = hero.images;
  return (
    <section className="mx-auto grid w-full max-w-[1680px] grid-cols-1 items-center gap-10 px-[clamp(16px,3.4vw,44px)] pt-14 pb-16 scroll-mt-3 [scroll-snap-align:start] lg:min-h-[clamp(560px,calc(100vh-124px),760px)] lg:grid-cols-[1fr_1.1fr] lg:gap-14">
      <div className="flex max-w-[620px] flex-col gap-[30px]">
        <HeroEyebrow text={hero.eyebrow} />
        <HeroTitle text={hero.title} />
        <HeroSubtitle text={hero.subtitle} />
        <HeroCtas primary={hero.primaryCta} secondary={hero.secondaryCta} />
      </div>

      <div className="hidden aspect-[15/11] w-full max-w-[520px] grid-cols-[1.25fr_1fr] grid-rows-2 gap-4 justify-self-center md:grid lg:max-w-[900px]">
        <div className="relative row-span-2 overflow-hidden bg-fill-dark [border-radius:min(50%,260px)_min(50%,260px)_16px_16px]">
          <HeroImage src={large} priority sizes="(max-width: 1023px) 55vw, 30vw" className="motion-safe:animate-hero-reveal" />
        </div>
        <div className="relative overflow-hidden rounded-[16px] bg-fill-dark">
          <HeroImage src={smallTop} priority sizes="(max-width: 1023px) 45vw, 25vw" />
        </div>
        <div className="relative overflow-hidden rounded-[16px] bg-fill-dark">
          <HeroImage src={smallBottom} sizes="(max-width: 1023px) 45vw, 25vw" />
        </div>
      </div>
    </section>
  );
}
