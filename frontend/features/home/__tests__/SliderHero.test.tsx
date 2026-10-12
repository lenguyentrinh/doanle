import { act, fireEvent, render, screen } from '@testing-library/react';
import SliderHero from '../components/hero/SliderHero';
import type { HomeHero } from '../types/homeHero';

jest.mock('../components/hero/heroParts', () => ({
  HeroCtas: () => null,
  HeroEyebrow: () => null,
  HeroSubtitle: () => null,
  HeroTitle: ({ text }: { text: string }) => <h1>{text}</h1>,
  HeroImage: ({ src }: { src: string }) => <span data-src={src} />,
}));

const hero: HomeHero = {
  template: 'slider',
  eyebrow: '',
  title: 'T',
  subtitle: '',
  primaryCta: { label: 'a', href: '/' },
  secondaryCta: { label: 'b', href: '/' },
  images: ['/1.png', '/2.png', '/3.png'],
};

function mockMotion(reduced: boolean) {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: reduced,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
}

const current = () =>
  screen
    .getAllByRole('button', { name: /Chuyển đến ảnh/ })
    .findIndex((b) => b.getAttribute('aria-current') === 'true');

beforeEach(() => {
  jest.useFakeTimers();
  mockMotion(false);
});
afterEach(() => jest.useRealTimers());

describe('SliderHero', () => {
  it('autoplays', () => {
    render(<SliderHero hero={hero} />);
    expect(current()).toBe(0);
    act(() => void jest.advanceTimersByTime(5600));
    expect(current()).toBe(1);
  });

  it('pauses on hover and resumes on leave', () => {
    const { container } = render(<SliderHero hero={hero} />);
    const section = container.querySelector('section')!;
    fireEvent.mouseEnter(section);
    act(() => void jest.advanceTimersByTime(20000));
    expect(current()).toBe(0);
    fireEvent.mouseLeave(section);
    act(() => void jest.advanceTimersByTime(5600));
    expect(current()).toBe(1);
  });

  it('pauses on focus', () => {
    const { container } = render(<SliderHero hero={hero} />);
    fireEvent.focus(container.querySelector('section')!);
    act(() => void jest.advanceTimersByTime(20000));
    expect(current()).toBe(0);
  });

  it('does not autoplay under prefers-reduced-motion', () => {
    mockMotion(true);
    render(<SliderHero hero={hero} />);
    act(() => void jest.advanceTimersByTime(20000));
    expect(current()).toBe(0);
  });

  it('wraps with prev/next buttons', () => {
    render(<SliderHero hero={hero} />);
    fireEvent.click(screen.getByLabelText('Ảnh trước'));
    expect(current()).toBe(2);
    fireEvent.click(screen.getByLabelText('Ảnh sau'));
    expect(current()).toBe(0);
  });

  it('shows no controls for a single image', () => {
    render(<SliderHero hero={{ ...hero, images: ['/1.png'] }} />);
    expect(screen.queryByLabelText('Ảnh sau')).toBeNull();
  });
});
