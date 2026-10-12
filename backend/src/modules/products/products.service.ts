import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { StorageService } from '../../common/storage/storage.service';
import { escapeLike } from '../../common/utils/string.utils';
import { createPaginatedResponse } from '../../common/utils/pagination.utils';
import { computeFinalPrice } from '../../common/utils/pricing.utils';
import { CategoriesService } from '../categories/categories.service';

// Public product shape: internal flags (`isActive`, `deletedAt`) are stripped
// at read time — they are constant for returned rows and not part of the API.
// `category` serializes as the category *name* (string), not the relation
// object or its raw id — the storefront contract predates the Category
// entity and stays string-based so it doesn't ripple across every PLP/PDP
// consumer.
export type ProductResponse = Omit<
  Product,
  'isActive' | 'deletedAt' | 'categoryId' | 'category'
> & {
  category: string;
  imageUrls: string[];
  discountPercentage: number | null;
  // Derived, never stored: `price` unchanged when discountPercentage is
  // null/0, otherwise price * (1 - discountPercentage / 100) rounded to 2dp.
  finalPrice: number;
};

// Admin product shape: everything shopper responses have, plus the internal
// flags the admin UI needs (Active/Inactive toggle, Archived badge) and the
// raw categoryId so the edit form can pre-select the right dropdown option.
export type AdminProductResponse = ProductResponse & {
  isActive: boolean;
  deletedAt: Date | null;
  categoryId: number;
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
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
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

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', { isActive: true });

    if (category) {
      qb.andWhere('category.name = :category', { category });
    }

    if (search) {
      // Escape LIKE wildcards so user input is matched literally (default
      // MySQL escape char is backslash); otherwise a lone `%` matches all rows.
      const escaped = escapeLike(search);
      qb.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search)',
        { search: `%${escaped}%` },
      );
    }

    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (inStock) {
      qb.andWhere('product.stockQuantity > 0');
    }

    if (lowStock) {
      qb.andWhere('product.stockQuantity > 0 AND product.stockQuantity < 5');
    }

    if (newArrivals) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      qb.andWhere('product.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo });
    }

    this.applySort(qb, sort);

    qb.skip((page - 1) * limit).take(limit);

    const [products, total] = await qb.getManyAndCount();

    return createPaginatedResponse(
      products.map((p) => this.toResponse(p)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: number): Promise<ProductResponse> {
    const product = await this.productsRepository.findOne({
      where: { id, isActive: true },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    }

    return this.toResponse(product);
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
    const totals = await this.productsRepository
      .createQueryBuilder('product')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(product.stockQuantity), 0)', 'totalStock')
      .addSelect('MAX(product.price)', 'maxPrice')
      .where('product.isActive = :isActive', { isActive: true })
      .getRawOne<{
        count: string;
        totalStock: string;
        maxPrice: string | null;
      }>();

    const categoryRows = await this.productsRepository
      .createQueryBuilder('product')
      .innerJoin('product.category', 'category')
      .select('category.name', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('product.isActive = :isActive', { isActive: true })
      .groupBy('category.id')
      .orderBy('category.name', 'ASC')
      .getRawMany<{ category: string; count: string }>();

    return {
      designCount: Number(totals?.count ?? 0),
      totalStock: Number(totals?.totalStock ?? 0),
      // Raw max — the client rounds it up to the nearest 100k for a clean
      // slider ceiling (the floor is always 0, not the cheapest item's
      // price) — purely a display concern, so it's not rounded here.
      priceCeil: totals?.maxPrice != null ? Number(totals.maxPrice) : 0,
      categories: categoryRows.map((r) => ({
        category: r.category,
        count: Number(r.count),
      })),
    };
  }

  // Admin list: must surface inactive AND archived (soft-deleted) products
  // (`.withDeleted()`, no `isActive` filter) — the opposite of `findAll`'s
  // shopper-scoped query. Default sort is always newest-first; this epic's
  // AC has no sort control for the admin table.
  async findAllForAdmin(
    query: AdminProductQueryDto,
  ): Promise<PaginatedAdminProducts> {
    const { search, categoryId, page, limit } = query;

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .withDeleted();

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (search) {
      const escaped = escapeLike(search);
      qb.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search)',
        { search: `%${escaped}%` },
      );
    }

    qb.orderBy('product.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [[products, total], globalStats] = await Promise.all([
      qb.getManyAndCount(),
      this.getGlobalStats(),
    ]);

    return {
      ...createPaginatedResponse(
        products.map((p) => this.toAdminResponse(p)),
        total,
        page,
        limit,
      ),
      ...globalStats,
    };
  }

  // Whole-catalog counters for the admin grid's stat strip — always
  // unfiltered/unpaginated (matches findAllForAdmin's own `.withDeleted()`
  // scope so archived products count toward `totalProducts`/`archivedCount`).
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
    const result = await this.productsRepository
      .createQueryBuilder('product')
      .withDeleted()
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN product.deletedAt IS NULL AND product.isActive = true THEN 1 ELSE 0 END)',
        'active',
      )
      .addSelect(
        'SUM(CASE WHEN product.deletedAt IS NULL AND product.isActive = false THEN 1 ELSE 0 END)',
        'hidden',
      )
      .addSelect(
        'SUM(CASE WHEN product.deletedAt IS NOT NULL THEN 1 ELSE 0 END)',
        'archived',
      )
      .addSelect(
        'SUM(CASE WHEN product.deletedAt IS NULL AND product.stockQuantity < 5 THEN 1 ELSE 0 END)',
        'lowStock',
      )
      .getRawOne<{
        total: string;
        active: string | null;
        hidden: string | null;
        archived: string | null;
        lowStock: string | null;
      }>();

    return {
      totalProducts: Number(result?.total ?? 0),
      activeCount: Number(result?.active ?? 0),
      hiddenCount: Number(result?.hidden ?? 0),
      archivedCount: Number(result?.archived ?? 0),
      lowStockCount: Number(result?.lowStock ?? 0),
    };
  }

  async getByIdForAdmin(id: number): Promise<AdminProductResponse> {
    const product = await this.reloadWithCategory(id);
    return this.toAdminResponse(product);
  }

  // Deliberately not `ProductsService.findOne()` — that method filters
  // `isActive: true`, which would 404 on a perfectly valid *inactive*
  // product an admin is trying to view/reactivate. Plain (non-query-builder)
  // `findOne` already excludes soft-deleted rows by default, which is the
  // only exclusion an admin lookup wants — an archived product still 404s.
  private async findOneForAdmin(id: number): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { id } });
  }

  // Refetches with the `category` relation joined, for building a response
  // after create/update. Deliberately not folded into findOneForAdmin: that
  // helper is also used right before mutating `categoryId`, and having a
  // stale `category` relation object loaded on the same entity would let
  // TypeORM's persistence layer prefer the (unchanged) relation's id over the
  // scalar column we just updated.
  private async reloadWithCategory(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    }
    return product;
  }

  async deleteProduct(id: number): Promise<{ message: string }> {
    const product = await this.findOneForAdmin(id);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    }

    await this.productsRepository.softDelete(id);
    return { message: 'Đã lưu trữ sản phẩm' };
  }

  async createProduct(
    dto: CreateProductDto,
    files: Express.Multer.File[],
  ): Promise<AdminProductResponse> {
    await this.categoriesService.assertExists(dto.categoryId);
    const imageKeys = await this.uploadAll(files);

    const product = this.productsRepository.create({
      name: dto.name,
      description: dto.description,
      categoryId: dto.categoryId,
      price: dto.price,
      stockQuantity: dto.stockQuantity,
      isActive: dto.isActive ?? true,
      imageKeys,
      discountPercentage: dto.discountPercentage ?? null,
    });

    const saved = await this.productsRepository.save(product);
    return this.toAdminResponse(await this.reloadWithCategory(saved.id));
  }

  async updateProduct(
    id: number,
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

    // Delete the on-disk file for any image the admin dropped — otherwise
    // it's orphaned on disk forever (only the failure/bound-violation paths
    // above ever call cleanupKeys today).
    const droppedKeys = product.imageKeys.filter(
      (key) => !keptKeys.includes(key),
    );

    Object.assign(product, {
      name: dto.name ?? product.name,
      description: dto.description ?? product.description,
      categoryId: dto.categoryId ?? product.categoryId,
      price: dto.price ?? product.price,
      stockQuantity: dto.stockQuantity ?? product.stockQuantity,
      isActive: dto.isActive ?? product.isActive,
      imageKeys,
      // See UpdateProductDto: field omitted (undefined) means "no change";
      // field explicitly cleared (null) means "remove the discount".
      discountPercentage:
        dto.discountPercentage !== undefined
          ? dto.discountPercentage
          : product.discountPercentage,
    });

    const saved = await this.productsRepository.save(product);
    if (droppedKeys.length > 0) {
      await this.cleanupKeys(droppedKeys);
    }
    return this.toAdminResponse(await this.reloadWithCategory(saved.id));
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
  // best-effort and the error propagates before touching the repository.
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

  private applySort(
    qb: ReturnType<Repository<Product>['createQueryBuilder']>,
    sort?: ProductSort,
  ): void {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        qb.orderBy('product.price', 'ASC');
        break;
      case ProductSort.PRICE_DESC:
        qb.orderBy('product.price', 'DESC');
        break;
      // TODO(epic-4): real popularity sort once order/sales data exists.
      // Until then popularity falls back to newest-first.
      case ProductSort.POPULARITY:
      case ProductSort.NEWEST:
      default:
        qb.orderBy('product.createdAt', 'DESC');
        break;
    }
  }

  /**
   * Generate public image URLs at read time — keys are never stored as URLs.
   * Internal flags (`isActive`, `deletedAt`) are intentionally not exposed.
   */
  private toResponse(product: Product): ProductResponse {
    const keys = product.imageKeys ?? [];
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stockQuantity: product.stockQuantity,
      category: product.category.name,
      imageKeys: product.imageKeys,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      imageUrls: keys.map((key) => this.storageService.resolveUrl(key)),
      discountPercentage: product.discountPercentage,
      finalPrice: computeFinalPrice(product.price, product.discountPercentage),
    };
  }

  // Bulk admin action for the "apply discount to many products" picker
  // screen — a single UPDATE ... WHERE id IN (...) rather than N
  // save() calls, since the set of ids can be large and there's nothing
  // per-row to validate beyond the shared discount value.
  async applyBulkDiscount(
    productIds: number[],
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

    const result = await this.productsRepository.update(
      { id: In(productIds) },
      { discountPercentage },
    );

    return {
      message: 'Đã áp dụng giảm giá',
      updatedCount: result.affected ?? 0,
    };
  }

  // Admin shape: like toResponse() but also exposes isActive/deletedAt/
  // categoryId, so the list/edit UI can render Active/Inactive and Archived
  // states and pre-select the right category in the edit form.
  private toAdminResponse(product: Product): AdminProductResponse {
    return {
      ...this.toResponse(product),
      isActive: product.isActive,
      deletedAt: product.deletedAt,
      categoryId: product.categoryId,
    };
  }
}
