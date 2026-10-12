import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateHomeHeroDto } from './update-home-hero.dto';

const base = {
  template: 'split',
  eyebrow: 'e',
  title: 't',
  subtitle: 's',
  primaryCta: { label: 'a', href: '/products' },
  secondaryCta: { label: 'b', href: 'https://x.com' },
  images: ['/images/home.png'],
};

const errorsFor = async (patch: Record<string, unknown>) =>
  (
    await validate(plainToInstance(UpdateHomeHeroDto, { ...base, ...patch }))
  ).map((e) => e.property);

describe('UpdateHomeHeroDto', () => {
  it('accepts local and http(s) images', async () => {
    expect(
      await errorsFor({
        images: ['/images/home.png', 'https://res.cloudinary.com/a.jpg'],
      }),
    ).toEqual([]);
  });

  it.each([
    '//evil.com/a.png',
    'data:image/png;base64,AAA',
    'ftp://x/a.png',
    'images/a.png',
  ])('rejects image %s', async (img) => {
    expect(await errorsFor({ images: [img] })).toContain('images');
  });

  it('matches frontend length limits', async () => {
    expect(
      await errorsFor({
        eyebrow: 'x'.repeat(60),
        title: 'x'.repeat(120),
        subtitle: 'x'.repeat(300),
      }),
    ).toEqual([]);
    expect(await errorsFor({ eyebrow: 'x'.repeat(61) })).toContain('eyebrow');
    expect(await errorsFor({ title: 'x'.repeat(121) })).toContain('title');
    expect(await errorsFor({ subtitle: 'x'.repeat(301) })).toContain(
      'subtitle',
    );
  });
});
