/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await -- test doubles */
import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { HomeHeroService } from './home-hero.service';
import { HomeHeroController } from './home-hero.controller';
import { HomeHeroAdminController } from './home-hero.admin.controller';
import {
  HOME_HERO_IMAGE_LIMITS,
  HOME_HERO_ROW_ID,
  HOME_HERO_TEMPLATES,
} from './home-hero.constants';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user-role.enum';
import type { UpdateHomeHeroDto } from './dto/update-home-hero.dto';

const cta = { label: 'a', href: '/p' };
const dto = (template: UpdateHomeHeroDto['template'], n: number) =>
  ({
    template,
    eyebrow: '',
    title: 't',
    subtitle: '',
    primaryCta: cta,
    secondaryCta: cta,
    images: Array.from({ length: n }, (_, i) => `/images/${i}.png`),
  }) as UpdateHomeHeroDto;

function makeService() {
  let row: any = null;
  const repo = {
    findOne: jest.fn(async () => row),
    findOneOrFail: jest.fn(async () => row),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => (row = v)),
  };
  const storage = {
    upload: jest.fn(async () => 'k'),
    remove: jest.fn(async () => undefined),
    resolveUrl: jest.fn((k: string) => `https://cdn/${k}`),
  };
  return {
    svc: new HomeHeroService(repo as any, storage as any),
    repo,
    storage,
  };
}

describe('HomeHeroService', () => {
  it('get() returns null when nothing is configured', async () => {
    expect(await makeService().svc.get()).toBeNull();
  });

  it.each(HOME_HERO_TEMPLATES)(
    '%s enforces its image count',
    async (template) => {
      const { min, max } = HOME_HERO_IMAGE_LIMITS[template];
      const { svc, repo } = makeService();
      await expect(svc.upsert(dto(template, min))).resolves.toMatchObject({
        template,
      });
      await expect(svc.upsert(dto(template, max))).resolves.toBeDefined();
      await expect(svc.upsert(dto(template, max + 1))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      if (min > 0) {
        await expect(svc.upsert(dto(template, min - 1))).rejects.toBeInstanceOf(
          BadRequestException,
        );
      }
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: HOME_HERO_ROW_ID }),
      );
    },
  );

  it('removes only dropped Cloudinary images after saving', async () => {
    const { svc, storage } = makeService();
    const a =
      'https://res.cloudinary.com/demo/image/upload/v12/products/aaa.jpg';
    const b =
      'https://res.cloudinary.com/demo/image/upload/v12/products/bbb.png';
    await svc.upsert({
      ...dto('slider', 0),
      images: ['/images/home.png', a, b],
    });
    expect(storage.remove).not.toHaveBeenCalled();
    await svc.upsert({ ...dto('slider', 0), images: [b] });
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith('products/aaa');
  });

  it('uploadImage resolves the storage url', async () => {
    expect(await makeService().svc.uploadImage({} as any)).toEqual({
      url: 'https://cdn/k',
    });
  });
});

describe('HomeHeroController (public)', () => {
  it('sends literal JSON null when unconfigured', async () => {
    const res = { json: jest.fn() };
    await new HomeHeroController({ get: async () => null } as any).get(
      res as any,
    );
    expect(res.json).toHaveBeenCalledWith(null);
  });
});

describe('HomeHeroAdminController', () => {
  it('is admin-only (RolesGuard + ADMIN role)', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      HomeHeroAdminController,
    ) as unknown[];
    expect(guards).toContain(RolesGuard);
    expect(Reflect.getMetadata(ROLES_KEY, HomeHeroAdminController)).toEqual([
      UserRole.ADMIN,
    ]);
  });

  const ctrl = new HomeHeroAdminController({
    uploadImage: jest.fn(async () => ({ url: 'u' })),
  } as any);
  const file = (mimetype: string, bytes: number[]) =>
    ({ mimetype, buffer: Buffer.from(bytes) }) as Express.Multer.File;

  it('rejects a missing file', async () => {
    await expect(ctrl.uploadImage(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects mismatched magic bytes', async () => {
    await expect(
      ctrl.uploadImage(file('image/png', [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a real JPEG header', async () => {
    await expect(
      ctrl.uploadImage(
        file('image/jpeg', [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]),
      ),
    ).resolves.toEqual({ url: 'u' });
  });
});
