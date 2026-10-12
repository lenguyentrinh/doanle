import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { QueryFilter, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { Product, ProductDocument } from './entities/product.entity';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StorageService } from '../../common/storage/storage.service';
import { escapeRegex } from '../../common/utils/string.utils';
import { createPaginatedResponse } from '../../common/utils/pagination.utils';
import { computeFinalPrice } from '../../common/utils/pricing.utils';
import { isObjectIdString } from '../../common/pipes/parse-object-id.pipe';
import { CategoriesService } from '../categories/categories.service';

// Public product shape: internal flags (`isActive`, `deletedAt`) are stripped
// at read time — they are constant for returned rows and not part of the API.
// `category` serializes as the category *name* (string), not the raw id — the
// storefront contract predates the Category entity and stays string-based so
// it doesn't ripple across every PLP/PDP consumer.
export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  imageKeys: string[];
  createdAt: Date;
  updatedAt: Date;
  imageUrls: string[];
  discountPercentage: number | null;
  // Derived, never stored: `price` unchanged when discountPercentage is
  // null/0, otherwise price * (1 - discountPercentage / 100) rounded to 2dp.
  finalPrice: number;
}

// Admin product shape: everything shopper responses have, plus the internal
// flags the admin UI needs (Active/Inactive toggle, Archived badge) and the
// raw categoryId (ObjectId string) so the edit form can pre-select the right
// dropdown option.
export type AdminProductResponse = ProductResponse & {
  isActive: boolean;
  deletedAt: Date | null;
  categoryId: string;
};

export interface PaginatedProducts {
  data: ProductResponse[];
  total: number;
  page: number;
  limit: number;
}

// `total` counts products matching the current search/category filter
// (drives the admin grid's own pagination); the four global fields are
// deliberately unfiltered — they always reflect the whole catalog so the
// stat strip doesn't shift as the admin searches or switches category.
export interface PaginatedAdminProducts {
  data: AdminProductResponse[];
  total: number;
  page: number;
  limit: number;
  totalProducts: number;
  activeCount: number;
  hiddenCount: number;
  archivedCount: number;
  lowStockCount: number;
}

const MIN_IMAGES = 1;
const MAX_IMAGES = 5;

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    private readonly storageService: StorageService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findAll(query: ProductQueryDto): Promise<PaginatedProducts> {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      inStock,
      lowStock,
      newArrivals,
      sort,
      page,
      limit,
    } = query;

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new BadRequestException('minPrice không được lớn hơn maxPrice');
    }

    // Storefront scope: active and not archived (soft-deleted).
    const filter: QueryFilter<Product> = { isActive: true, deletedAt: null };

    if (category) {
      const categoryId = await this.categoriesService.findIdByName(category);
      if (!categoryId) {
        return createPaginatedResponse([], 0, page, limit);
      }
      filter.categoryId = categoryId;
    }

    if (search) {
      // Escaped so user input is matched literally (a lone `%` or `.` must
      // not act as a wildcard).
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: re }, { description: re }];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {
        ...(minPrice !== undefined ? { $gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
      };
    }

    if (lowStock) {
      filter.stockQuantity = { $gt: 0, $lt: 5 };
    } else if (inStock) {
      filter.stockQuantity = { $gt: 0 };
    }

    if (newArrivals) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filter.createdAt = { $gte: thirtyDaysAgo };
    }

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(this.sortSpec(sort))
        .skip((page - 1) * limit)
        .limit(limit),
      this.productModel.countDocuments(filter),
    ]);

    const names = await this.categoryNamesFor(products);
    return createPaginatedResponse(
      products.map((p) => this.toResponse(p, names)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string): Promise<ProductResponse> {
    const product = isObjectIdString(id)
      ? await this.productModel.findOne({
          _id: id,
          isActive: true,
          deletedAt: null,
        })
      : null;

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    }

    return this.toResponse(product, await this.categoryNamesFor([product]));
  }

  async getCategories(): Promise<string[]> {
    return this.categoriesService.findNamesForStorefront();
  }

  // Storefront-wide counters for the PLP header eyebrow ("còn N / total
  // chiếc") and the sidebar's per-category counts — deliberately unfiltered
  // by the current query (always reflects the whole active catalog), so it
  // needs its own aggregate rather than reusing findAll()'s paginated total.
  async getStorefrontStats(): Promise<{
    designCount: number;
    totalStock: number;
    priceCeil: number;
    categories: { category: string; count: number }[];
  }> {
    const activeScope = { isActive: true, deletedAt: null };

    const [totalsRows, categoryRows] = await Promise.all([
      this.productModel.aggregate<{
        count: number;
        totalStock: number;
        maxPrice: number | null;
      }>([
        { $match: activeScope },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalStock: { $sum: '$stockQuantity' },
            maxPrice: { $max: '$price' },
          },
        },
      ]),
      this.productModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: activeScope },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
    ]);
    const totals = totalsRows[0];

    const names = await this.categoriesService.findNamesByIds(
      categoryRows.map((r) => r._id),
    );
    // inner join semantics: a product whose category no longer exists isn't
    // counted under any category.
    const categories = categoryRows
      .filter((r) => names.has(r._id.toString()))
      .map((r) => ({
        category: names.get(r._id.toString())!,
        count: Number(r.count),
      }))
      .sort((a, b) =>
        a.category.localeCompare(b.category, 'en', { sensitivity: 'accent' }),
      );

    return {
      designCount: Number(totals?.count ?? 0),
      totalStock: Number(totals?.totalStock ?? 0),
      // Raw max — the client rounds it up to the nearest 100k for a clean
      // slider ceiling (the floor is always 0, not the cheapest item's
      // price) — purely a display concern, so it's not rounded here.
      priceCeil: totals?.maxPrice != null ? Number(totals.maxPrice) : 0,
      categories,
    };
  }

  // Admin list: must surface inactive AND archived (soft-deleted) products
  // (no `deletedAt` / `isActive` filter) — the opposite of `findAll`'s
  // shopper-scoped query. Default sort is always newest-first; this epic's
  // AC has no sort control for the admin table.
  async findAllForAdmin(
    query: AdminProductQueryDto,
  ): Promise<PaginatedAdminProducts> {
    const { search, categoryId, page, limit } = query;

    const filter: QueryFilter<Product> = {};

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: re }, { description: re }];
    }

    const [products, total, globalStats] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.productModel.countDocuments(filter),
      this.getGlobalStats(),
    ]);

    const names = await this.categoryNamesFor(products);
    return {
      ...createPaginatedResponse(
        products.map((p) => this.toAdminResponse(p, names)),
        total,
        page,
        limit,
      ),
      ...globalStats,
    };
  }

  // Whole-catalog counters for the admin grid's stat strip — always
  // unfiltered/unpaginated (matches findAllForAdmin's own scope so archived
  // products count toward `totalProducts`/`archivedCount`).
  // Low-stock threshold (<5) mirrors the shopper-facing `lowStock` filter
  // above rather than AdminDashboardService's configurable threshold — this
  // strip predates that config knob and isn't wired to it.
  private async getGlobalStats(): Promise<{
    totalProducts: number;
    activeCount: number;
    hiddenCount: number;
    archivedCount: number;
    lowStockCount: number;
  }> {
    const notArchived = { $eq: ['$deletedAt', null] };
    const count = (cond: object) => ({
      $sum: { $cond: [cond, 1, 0] },
    });
    const [result] = await this.productModel.aggregate<{
      total: number;
      active: number;
      hidden: number;
      archived: number;
      lowStock: number;
    }>([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: count({ $and: [notArchived, { $eq: ['$isActive', true] }] }),
          hidden: count({ $and: [notArchived, { $eq: ['$isActive', false] }] }),
          archived: count({ $ne: ['$deletedAt', null] }),
          lowStock: count({
            $and: [notArchived, { $lt: ['$stockQuantity', 5] }],
          }),
        },
      },
    ]);

    return {
      totalProducts: Number(result?.total ?? 0),
      activeCount: Number(result?.active ?? 0),
      hiddenCount: Number(result?.hidden ?? 0),
      archivedCount: Number(result?.archived ?? 0),
      lowStockCount: Number(result?.lowStock ?? 0),
    };
  }

  async getByIdForAdmin(id: string): Promise<AdminProductResponse> {
    const product = await this.reloadWithCategory(id);
    return this.toAdminResponse(
      product,
      await this.categoryNamesFor([product]),
    );
  }

  // Deliberately not `ProductsService.findOne()` — that method filters
  // `isActive: true`, which would 404 on a perfectly valid *inactive*
  // product an admin is trying to view/reactivate. An archived product still
  // 404s: `deletedAt: null` is the only exclusion an admin lookup wants.
  private async findOneForAdmin(id: string): Promise<ProductDocument | null> {
    if (!isObjectIdString(id)) return null;
    return this.productModel.findOne({ _id: id, deletedAt: null });
  }

  // Refetches (fresh state) for building a response after create/update.
  private async reloadWithCategory(id: string): Promise<ProductDocument> {
    const product = await this.findOneForAdmin(id);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    }
    return product;
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    const product = await this.findOneForAdmin(id);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    }

    // Soft delete ("archive"): order lines keep referencing the product, so
    // it is never hard-deleted (the old schema's ON DELETE RESTRICT).
    await this.productModel.updateOne(
      { _id: product._id },
      { $set: { deletedAt: new Date() } },
    );
    return { message: 'Đã lưu trữ sản phẩm' };
  }

  async createProduct(
    dto: CreateProductDto,
    files: Express.Multer.File[],
  ): Promise<AdminProductResponse> {
    await this.categoriesService.assertExists(dto.categoryId);
    const imageKeys = await this.uploadAll(files);

    const saved = await this.productModel.create({
      name: dto.name,
      description: dto.description,
      categoryId: new Types.ObjectId(dto.categoryId),
      price: dto.price,
      stockQuantity: dto.stockQuantity,
      isActive: dto.isActive ?? true,
      imageKeys,
      discountPercentage: dto.discountPercentage ?? null,
    });
    return this.toAdminResponse(saved, await this.categoryNamesFor([saved]));
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    newFiles: Express.Multer.File[],
  ): Promise<AdminProductResponse> {
    const product = await this.findOneForAdmin(id);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    }

    if (dto.categoryId !== undefined) {
      await this.categoriesService.assertExists(dto.categoryId);
    }

    let keptKeys = product.imageKeys;
    if (dto.existingImageKeys !== undefined) {
      keptKeys = this.parseExistingImageKeys(
        dto.existingImageKeys,
        product.imageKeys,
      );
    }

    const uploadedKeys = await this.uploadAll(newFiles);
    const imageKeys = [...keptKeys, ...uploadedKeys];

    if (imageKeys.length < MIN_IMAGES || imageKeys.length > MAX_IMAGES) {
      await this.cleanupKeys(uploadedKeys);
      throw new BadRequestException(
        `Sản phẩm phải có từ ${MIN_IMAGES} đến ${MAX_IMAGES} hình ảnh`,
      );
    }

    // Delete the stored file for any image the admin dropped — otherwise
    // it's orphaned forever (only the failure/bound-violation paths above
    // ever call cleanupKeys today).
    const droppedKeys = product.imageKeys.filter(
      (key) => !keptKeys.includes(key),
    );

    product.name = dto.name ?? product.name;
    product.description = dto.description ?? product.description;
    if (dto.categoryId !== undefined) {
      product.categoryId = new Types.ObjectId(dto.categoryId);
    }
    product.price = dto.price ?? product.price;
    product.stockQuantity = dto.stockQuantity ?? product.stockQuantity;
    product.isActive = dto.isActive ?? product.isActive;
    product.imageKeys = imageKeys;
    // See UpdateProductDto: field omitted (undefined) means "no change";
    // field explicitly cleared (null) means "remove the discount".
    if (dto.discountPercentage !== undefined) {
      product.discountPercentage = dto.discountPercentage;
    }

    const saved = await product.save();
    if (droppedKeys.length > 0) {
      await this.cleanupKeys(droppedKeys);
    }
    return this.toAdminResponse(saved, await this.categoryNamesFor([saved]));
  }

  // Parses the JSON-stringified existingImageKeys field and validates it is
  // an array of strings, each one actually belonging to this product —
  // valid-but-wrong-shaped JSON (e.g. "42", "{}") must not silently crash
  // the later array-spread, and an admin request must not be able to attach
  // another product's image key by passing an arbitrary string.
  private parseExistingImageKeys(raw: string, ownedKeys: string[]): string[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException(
        'existingImageKeys phải là một mảng chuỗi được mã hóa JSON',
      );
    }

    if (
      !Array.isArray(parsed) ||
      !parsed.every((key) => typeof key === 'string')
    ) {
      throw new BadRequestException(
        'existingImageKeys phải là một mảng chuỗi được mã hóa JSON',
      );
    }

    if (!parsed.every((key) => ownedKeys.includes(key))) {
      throw new BadRequestException(
        'existingImageKeys chỉ được tham chiếu đến hình ảnh của chính sản phẩm này',
      );
    }

    return parsed;
  }

  // Uploads run to completion before any DB write ("if image upload fails
  // the product is not created/updated", epic AC, literal) — if any upload
  // throws, files already written for *this* request are cleaned up
  // best-effort and the error propagates before touching the database.
  private async uploadAll(files: Express.Multer.File[]): Promise<string[]> {
    const uploadedKeys: string[] = [];
    try {
      for (const file of files) {
        uploadedKeys.push(await this.storageService.upload(file));
      }
    } catch (err) {
      await this.cleanupKeys(uploadedKeys);
      throw err;
    }
    return uploadedKeys;
  }

  private async cleanupKeys(keys: string[]): Promise<void> {
    await Promise.allSettled(
      keys.map((key) => this.storageService.remove(key)),
    );
  }

  private sortSpec(sort?: ProductSort): Record<string, SortOrder> {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        return { price: 1, _id: 1 };
      case ProductSort.PRICE_DESC:
        return { price: -1, _id: -1 };
      // TODO(epic-4): real popularity sort once order/sales data exists.
      // Until then popularity falls back to newest-first.
      case ProductSort.POPULARITY:
      case ProductSort.NEWEST:
      default:
        return { createdAt: -1, _id: -1 };
    }
  }

  private async categoryNamesFor(
    products: ProductDocument[],
  ): Promise<Map<string, string>> {
    const ids = [...new Set(products.map((p) => p.categoryId.toString()))];
    return this.categoriesService.findNamesByIds(ids);
  }

  /**
   * Generate public image URLs at read time — keys are never stored as URLs.
   * Internal flags (`isActive`, `deletedAt`) are intentionally not exposed.
   */
  private toResponse(
    product: ProductDocument,
    categoryNames: Map<string, string>,
  ): ProductResponse {
    const keys = product.imageKeys ?? [];
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stockQuantity: product.stockQuantity,
      category: categoryNames.get(product.categoryId.toString()) ?? '',
      imageKeys: product.imageKeys,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      imageUrls: keys.map((key) => this.storageService.resolveUrl(key)),
      discountPercentage: product.discountPercentage ?? null,
      finalPrice: computeFinalPrice(
        product.price,
        product.discountPercentage ?? null,
      ),
    };
  }

  // Bulk admin action for the "apply discount to many products" picker
  // screen — a single updateMany ({ _id: { $in: ids } }) rather than N
  // save() calls, since the set of ids can be large and there's nothing
  // per-row to validate beyond the shared discount value.
  async applyBulkDiscount(
    productIds: string[],
    discountPercentage: number | null,
  ): Promise<{ message: string; updatedCount: number }> {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestException('Cần chọn ít nhất một sản phẩm');
    }

    if (
      discountPercentage !== null &&
      (discountPercentage < 0 || discountPercentage > 100)
    ) {
      throw new BadRequestException('Phần trăm giảm giá phải từ 0 đến 100');
    }

    const result = await this.productModel.updateMany(
      { _id: { $in: productIds } },
      { $set: { discountPercentage } },
    );

    return {
      message: 'Đã áp dụng giảm giá',
      updatedCount: result.matchedCount,
    };
  }

  // Admin shape: like toResponse() but also exposes isActive/deletedAt/
  // categoryId, so the list/edit UI can render Active/Inactive and Archived
  // states and pre-select the right category in the edit form.
  private toAdminResponse(
    product: ProductDocument,
    categoryNames: Map<string, string>,
  ): AdminProductResponse {
    return {
      ...this.toResponse(product, categoryNames),
      isActive: product.isActive,
      deletedAt: product.deletedAt ?? null,
      categoryId: product.categoryId.toString(),
    };
  }
}
