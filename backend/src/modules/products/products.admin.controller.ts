import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { ProductsService } from './products.service';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkDiscountDto } from './dto/bulk-discount.dto';
import { MulterExceptionFilter } from './filters/multer-exception.filter';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;

// Shared by POST and PATCH — configured fully here (mime/size/count) because
// this is the one and only place multer is used in this codebase. Story
// 5.3's epic AC lists near-identical-sounding multer validation wording, but
// it confirms this configuration rather than introducing it — don't redo it.
export const IMAGES_INTERCEPTOR_OPTIONS = {
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(
        new BadRequestException(
          'Chỉ chấp nhận hình ảnh định dạng JPEG, PNG hoặc WebP',
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
};

// Verify magic bytes for uploaded images to reject files with spoofed MIME
// types. This is a defence-in-depth measure — the admin-only route + server-
// side Cloudinary re-validation absorb most of the risk on their own.
//
// Multer's `Options` type has no post-upload hook (no `transform`), so this
// cannot live on IMAGES_INTERCEPTOR_OPTIONS — it must run explicitly in the
// controller after @UploadedFiles() populates `file.buffer`.
const MAGIC_BYTES: Record<string, Uint8Array> = {
  'image/jpeg': new Uint8Array([0xff, 0xd8, 0xff]),
  'image/png': new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  'image/webp': new Uint8Array([0x52, 0x49, 0x46, 0x46]),
};

export function assertValidImageMagicBytes(file: Express.Multer.File): void {
  const expected = MAGIC_BYTES[file.mimetype];
  const buf = file.buffer;
  if (!expected || buf.length < expected.length) {
    throw new BadRequestException('File hình ảnh bị hỏng hoặc không đầy đủ');
  }
  for (let i = 0; i < expected.length; i++) {
    if (buf[i] !== expected[i]) {
      throw new BadRequestException(
        'Nội dung file không khớp với định dạng hình ảnh đã khai báo',
      );
    }
  }
}

// AuthGuard('jwt') must run before RolesGuard so req.user is populated
// before the role check (Story 5.1 precedent). Shares the one ProductsService
// with products.controller.ts — same-module reuse, not a parallel service.
@ApiTags('admin-products')
@Controller('admin/products')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@UseFilters(MulterExceptionFilter)
export class ProductsAdminController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: AdminProductQueryDto) {
    return this.productsService.findAllForAdmin(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.productsService.getByIdForAdmin(id) };
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES, IMAGES_INTERCEPTOR_OPTIONS),
  )
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Cần ít nhất một hình ảnh sản phẩm');
    }
    files.forEach(assertValidImageMagicBytes);
    const data = await this.productsService.createProduct(dto, files);
    return { data, message: 'Đã tạo sản phẩm' };
  }

  // Must be declared before `@Patch(':id')` below — Nest/Express registers
  // routes in declaration order, and `:id` would otherwise swallow requests
  // to `discount/bulk` (ParseIntPipe would then 400 on "discount").
  @Patch('discount/bulk')
  async applyBulkDiscount(@Body() dto: BulkDiscountDto) {
    return this.productsService.applyBulkDiscount(
      dto.productIds,
      dto.discountPercentage ?? null,
    );
  }

  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES, IMAGES_INTERCEPTOR_OPTIONS),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    (files ?? []).forEach(assertValidImageMagicBytes);
    const data = await this.productsService.updateProduct(id, dto, files ?? []);
    return { data, message: 'Đã cập nhật sản phẩm' };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deleteProduct(id);
  }
}
