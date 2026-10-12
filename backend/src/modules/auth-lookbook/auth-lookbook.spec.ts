/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await -- test doubles */
import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthLookbookService } from './auth-lookbook.service';
import { AuthLookbookController } from './auth-lookbook.controller';
import { AuthLookbookAdminController } from './auth-lookbook.admin.controller';
import { AUTH_LOOKBOOK_ROW_ID } from './auth-lookbook.constants';
import { UpdateAuthLookbookDto } from './dto/update-auth-lookbook.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user-role.enum';

function makeService() {
  let row: any = null;
  const model = {
    findById: jest.fn(async () => row),
    findOneAndUpdate: jest.fn(async (_filter: any, update: any) => {
      row = {
        _id: AUTH_LOOKBOOK_ROW_ID,
        imageUrl: null,
        caption: null,
        label: null,
        ...row,
        ...update.$set,
      };
      return row;
    }),
  };
  const storage = {
    upload: jest.fn(async () => 'k'),
    remove: jest.fn(async () => undefined),
    resolveUrl: jest.fn((k: string) => `https://cdn/${k}`),
  };
  return {
    svc: new AuthLookbookService(model as any, storage as any),
    model,
    storage,
  };
}

const cloud = (n: string) =>
  `https://res.cloudinary.com/demo/image/upload/v12/products/${n}.jpg`;

describe('AuthLookbookService', () => {
  it('get() returns all-null fields when nothing is configured', async () => {
    expect(await makeService().svc.get()).toEqual({
      imageUrl: null,
      caption: null,
      label: null,
    });
  });

  it('upsert writes only provided fields and keeps the rest', async () => {
    const { svc, model } = makeService();
    await svc.upsert({
      imageUrl: '/images/a.png',
      caption: 'c',
      label: 'N 1',
    });
    const out = await svc.upsert({ caption: 'new' });
    expect(out).toEqual({
      imageUrl: '/images/a.png',
      caption: 'new',
      label: 'N 1',
    });
    expect(model.findOneAndUpdate).toHaveBeenLastCalledWith(
      { _id: AUTH_LOOKBOOK_ROW_ID },
      { $set: { caption: 'new' } },
      expect.objectContaining({ upsert: true }),
    );
  });

  it('null clears the image and removes the old Cloudinary upload', async () => {
    const { svc, storage } = makeService();
    await svc.upsert({ imageUrl: cloud('aaa') });
    expect(storage.remove).not.toHaveBeenCalled();
    const out = await svc.upsert({ imageUrl: null });
    expect(out.imageUrl).toBeNull();
    expect(storage.remove).toHaveBeenCalledWith('products/aaa');
  });

  it('does not remove an unchanged or local image', async () => {
    const { svc, storage } = makeService();
    await svc.upsert({ imageUrl: cloud('aaa') });
    await svc.upsert({ caption: 'x' });
    expect(storage.remove).not.toHaveBeenCalled();
    await svc.upsert({ imageUrl: '/images/local.png' });
    expect(storage.remove).toHaveBeenCalledTimes(1);
    await svc.upsert({ imageUrl: null });
    expect(storage.remove).toHaveBeenCalledTimes(1);
  });

  it('uploadImage resolves the storage url', async () => {
    expect(await makeService().svc.uploadImage({} as any)).toEqual({
      url: 'https://cdn/k',
    });
  });
});

describe('UpdateAuthLookbookDto', () => {
  const errs = (o: object) =>
    validate(plainToInstance(UpdateAuthLookbookDto, o));

  it('accepts empty body, nulls, local paths and http(s) urls', async () => {
    expect(await errs({})).toHaveLength(0);
    expect(
      await errs({ imageUrl: null, caption: null, label: null }),
    ).toHaveLength(0);
    expect(await errs({ imageUrl: '/images/a.png' })).toHaveLength(0);
    expect(await errs({ imageUrl: 'https://x.com/a.png' })).toHaveLength(0);
  });

  it('rejects data URIs, protocol-relative urls and long text', async () => {
    expect(
      await errs({ imageUrl: 'data:image/png;base64,AA' }),
    ).not.toHaveLength(0);
    expect(await errs({ imageUrl: '//evil.com/a.png' })).not.toHaveLength(0);
    expect(await errs({ caption: 'a'.repeat(201) })).not.toHaveLength(0);
    expect(await errs({ label: 'a'.repeat(41) })).not.toHaveLength(0);
  });
});

describe('AuthLookbookController (public)', () => {
  it('returns the service result', async () => {
    const value = { imageUrl: null, caption: null, label: null };
    const ctrl = new AuthLookbookController({ get: async () => value } as any);
    expect(await ctrl.get()).toBe(value);
  });
});

describe('AuthLookbookAdminController', () => {
  it('is admin-only (RolesGuard + ADMIN role)', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AuthLookbookAdminController,
    ) as unknown[];
    expect(guards).toContain(RolesGuard);
    expect(Reflect.getMetadata(ROLES_KEY, AuthLookbookAdminController)).toEqual(
      [UserRole.ADMIN],
    );
  });

  const ctrl = new AuthLookbookAdminController({
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
