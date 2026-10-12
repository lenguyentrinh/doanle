/* eslint-disable react/display-name -- inline mock components */
import { render, screen } from '@testing-library/react';

const getHomeHero = jest.fn();
jest.mock('@/features/home/services/homeHeroApi', () => ({
  getHomeHero: (...a: unknown[]) => getHomeHero(...a),
}));
jest.mock('@/features/product/services/productApi', () => ({
  getProducts: jest.fn(async () => ({ data: [] })),
  getProductStats: jest.fn(async () => ({ categories: [] })),
}));
jest.mock('@/features/home/components/hero/HeroRenderer', () => ({
  __esModule: true,
  default: ({ hero }: { hero: { title: string } }) => <div data-testid="hero">{hero.title}</div>,
}));
jest.mock('@/features/product/components/NewArrivals', () => () => null);
jest.mock('@/features/product/components/ScrollReveal', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('@/features/home/components/SectionHeading', () => () => null);
jest.mock('@/features/home/components/CategoryCarousel', () => () => null);

import HomePage from '@/app/page';
import { DEFAULT_HOME_HERO } from '@/features/home/types/homeHero';

const renderPage = async () => render(await HomePage());
const heroTitle = () => screen.getByTestId('hero').textContent;

describe('HomePage hero fallback', () => {
  beforeEach(() => getHomeHero.mockReset());

  it('uses the configured hero', async () => {
    getHomeHero.mockResolvedValue({ ...DEFAULT_HOME_HERO, title: 'Custom' });
    await renderPage();
    expect(heroTitle()).toBe('Custom');
  });

  it.each([
    ['API rejects', () => getHomeHero.mockRejectedValue(new Error('down'))],
    ['not configured (null)', () => getHomeHero.mockResolvedValue(null)],
    [
      'invalid image count in DB',
      () => getHomeHero.mockResolvedValue({ ...DEFAULT_HOME_HERO, template: 'grid', title: 'Bad', images: ['/a.png'] }),
    ],
  ])('falls back to the default hero when %s', async (_n, arrange) => {
    arrange();
    await renderPage();
    expect(heroTitle()).toBe(DEFAULT_HOME_HERO.title);
  });
});
