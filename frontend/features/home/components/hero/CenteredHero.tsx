import type { HomeHero } from '../../types/homeHero';
import { HeroCtas, HeroEyebrow, HeroSubtitle, HeroTitle } from './heroParts';

// Text-only hero: large centered heading, no imagery.
export default function CenteredHero({ hero }: { hero: HomeHero }) {
  return (
    <section className="relative flex min-h-[clamp(440px,calc(100vh-200px),640px)] items-center justify-center px-[clamp(16px,3.4vw,44px)] py-20 text-center scroll-mt-3 [scroll-snap-align:start]">
      <div className="flex w-full max-w-[1000px] flex-col items-center gap-[30px] [&_p]:mx-auto [&_p]:max-w-[52ch] [&>div]:justify-center">
        <HeroEyebrow text={hero.eyebrow} />
        <HeroTitle text={hero.title} size="xl" className="max-w-[16ch] text-balance" />
        <HeroSubtitle text={hero.subtitle} />
        <HeroCtas primary={hero.primaryCta} secondary={hero.secondaryCta} />
      </div>
    </section>
  );
}
