/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await -- test doubles */
import 'reflect-metadata';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import type { AddressInfo } from 'net';
import { HomeHeroAdminController } from './home-hero.admin.controller';
import { HomeHeroController } from './home-hero.controller';
import { HomeHeroService } from './home-hero.service';
import { UserRole } from '../users/entities/user-role.enum';

// Real Nest HTTP pipeline (guards, ValidationPipe, multer) over a loopback
// port; only the service and JWT auth are stubbed. Role comes from a header.
class FakeJwt implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const role = req.headers['x-role'];
    if (!role) return false;
    req.user = { role };
    return true;
  }
}

describe('home-hero HTTP', () => {
  let app: INestApplication;
  let base: string;
  const service = {
    get: jest.fn(async () => null),
    upsert: jest.fn(async (d) => d),
    uploadImage: jest.fn(async () => ({ url: 'https://cdn/x' })),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [HomeHeroController, HomeHeroAdminController],
      providers: [{ provide: HomeHeroService, useValue: service }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useClass(FakeJwt)
      .compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  afterAll(() => app.close());

  const body = {
    template: 'split',
    eyebrow: '',
    title: 't',
    subtitle: '',
    primaryCta: { label: 'a', href: '/p' },
    secondaryCta: { label: 'b', href: '/q' },
    images: ['/images/home.png'],
  };
  const put = (role: string | null, b: unknown = body) =>
    fetch(`${base}/admin/home-hero`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        ...(role ? { 'x-role': role } : {}),
      },
      body: JSON.stringify(b),
    });
  const upload = (
    type: string,
    bytes: Uint8Array,
    role = UserRole.ADMIN as string,
  ) => {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type }), 'f');
    return fetch(`${base}/admin/home-hero/images`, {
      method: 'POST',
      headers: { 'x-role': role },
      body: form,
    });
  };

  it('GET returns the literal JSON null', async () => {
    const res = await fetch(`${base}/home-hero`);
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it('PUT: guest 403, customer 403, admin 200 with local image', async () => {
    expect((await put(null)).status).toBe(403);
    expect((await put(UserRole.CUSTOMER)).status).toBe(403);
    expect((await put(UserRole.ADMIN)).status).toBe(200);
  });

  it('PUT rejects invalid images and over-long text', async () => {
    expect(
      (await put(UserRole.ADMIN, { ...body, images: ['//evil.com/a.png'] }))
        .status,
    ).toBe(400);
    expect(
      (await put(UserRole.ADMIN, { ...body, title: 'x'.repeat(121) })).status,
    ).toBe(400);
  });

  it('upload: non-admin blocked', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
    expect((await upload('image/png', png, UserRole.CUSTOMER)).status).toBe(
      403,
    );
  });

  it('upload: accepts valid PNG, rejects wrong MIME, wrong magic bytes and >5MB', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
    expect((await upload('image/png', png)).status).toBe(201);
    expect((await upload('image/gif', png)).status).toBe(400);
    expect((await upload('image/jpeg', png)).status).toBe(400);
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(png);
    expect((await upload('image/png', big)).status).toBe(413);
  });
});
