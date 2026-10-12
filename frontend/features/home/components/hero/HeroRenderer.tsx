import type { Product } from '@/types/product';
import type { HomeHero } from '../../types/homeHero';
import SplitHero from './SplitHero';
import BannerHero from './BannerHero';
import SliderHero from './SliderHero';
import CenteredHero from './CenteredHero';
import GridHero from './GridHero';

// Picks the hero layout by template. `bestSeller` only applies to 'split'.
export default function HeroRenderer({
  hero,
  bestSeller,
}: {
  hero: HomeHero;
  bestSeller?: Product;
}) {
  switch (hero.template) {
    case 'banner':
      return <BannerHero hero={hero} />;
    case 'slider':
      return <SliderHero hero={hero} />;
    case 'centered':
      return <CenteredHero hero={hero} />;
    case 'grid':
      return <GridHero hero={hero} />;
    case 'split':
    default:
      return <SplitHero hero={hero} bestSeller={bestSeller} />;
  }
}
