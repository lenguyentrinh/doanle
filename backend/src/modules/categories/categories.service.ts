import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AdminCategoryQueryDto } from './dto/admin-category-query.dto';
import { escapeLike, toSlug } from '../../common/utils/string.utils';

export interface AdminCategoryResponse {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

// `total` counts categories matching the current search filter (drives the
// admin grid's own pagination); the three `total*`/`orphanCount` fields are
// deliberately unfiltered — they always reflect the whole catalog so the
// header chips don't shift as the admin types into the filter box.
export interface PaginatedAdminCategories {
  data: AdminCategoryResponse[];
  total: number;
  page: number;
  limit: number;
  totalCategories: number;
  totalProducts: number;
  orphanCount: number;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async findAllForAdmin(
    query: AdminCategoryQueryDto,
  ): Promise<PaginatedAdminCategories> {
    const { search, sort, page, limit } = query;

    const qb = this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoin('products', 'product', 'product.category_id = category.id')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('category.slug', 'slug')
      .addSelect('COUNT(product.id)', 'productCount')
      .groupBy('category.id');

    if (search) {
      const escaped = escapeLike(search);
      qb.andWhere(
        '(category.name LIKE :search OR category.slug LIKE :search)',
        { search: `%${escaped}%` },
      );
    }

    if (sort === 'count') {
      qb.orderBy('productCount', 'DESC').addOrderBy('category.name', 'ASC');
    } else {
      qb.orderBy('category.name', 'ASC');
    }

    // GROUP BY means getManyAndCount()'s single-query count would count
    // grouped rows, not matching categories — .limit()/.offset() (not
    // .skip()/.take()) apply LIMIT/OFFSET to the grouped result set itself,
    // and the filtered total is counted separately below.
    qb.limit(limit).offset((page - 1) * limit);

    const rows = await qb.getRawMany<{
      id: number;
      name: string;
      slug: string;
      productCount: string;
    }>();

    const [total, globalStats] = await Promise.all([
      this.countFiltered(search),
      this.getGlobalStats(),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        productCount: Number(r.productCount),
      })),
      total,
      page,
      limit,
      ...globalStats,
    };
  }

  // Counts categories matching `search` alone (no join needed — name/slug
  // live on the category row itself), independent of the grouped/paginated
  // query above.
  private async countFiltered(search?: string): Promise<number> {
    const qb = this.categoriesRepository.createQueryBuilder('category');
    if (search) {
      const escaped = escapeLike(search);
      qb.andWhere(
        '(category.name LIKE :search OR category.slug LIKE :search)',
        { search: `%${escaped}%` },
      );
    }
    return qb.getCount();
  }

  // Whole-catalog counters for the admin grid's header chips — always
  // unfiltered/unpaginated. Joins the raw `products` table (like
  // countProducts()) rather than the Product repository, so archived
  // (soft-deleted) products still count — same rationale as countProducts.
  private async getGlobalStats(): Promise<{
    totalCategories: number;
    totalProducts: number;
    orphanCount: number;
  }> {
    const [totalCategories, totalProductsResult, orphanResult] =
      await Promise.all([
        this.categoriesRepository.count(),
        this.categoriesRepository.manager
          .createQueryBuilder()
          .select('COUNT(*)', 'count')
          .from('products', 'product')
          .getRawOne<{ count: string }>(),
        this.categoriesRepository
          .createQueryBuilder('category')
          .leftJoin('products', 'product', 'product.category_id = category.id')
          .select('COUNT(*)', 'count')
          .where('product.id IS NULL')
          .getRawOne<{ count: string }>(),
      ]);

    return {
      totalCategories,
      totalProducts: Number(totalProductsResult?.count ?? 0),
      orphanCount: Number(orphanResult?.count ?? 0),
    };
  }

  // Distinct category names with at least one *active* product — feeds the
  // shopper-facing PLP filter/category list (ProductsService.getCategories()).
  async findNamesForStorefront(): Promise<string[]> {
    const rows = await this.categoriesRepository
      .createQueryBuilder('category')
      .innerJoin(
        'products',
        'product',
        'product.category_id = category.id AND product.isActive = :isActive',
        { isActive: true },
      )
      .select('DISTINCT category.name', 'name')
      .orderBy('category.name', 'ASC')
      .getRawMany<{ name: string }>();

    return rows.map((r) => r.name);
  }

  async create(dto: CreateCategoryDto): Promise<AdminCategoryResponse> {
    const category = this.categoriesRepository.create({
      name: dto.name,
      slug: toSlug(dto.name),
    });

    try {
      const saved = await this.categoriesRepository.save(category);
      return { ...saved, productCount: 0 };
    } catch (error) {
      this.rethrowIfDuplicate(error);
      throw error;
    }
  }

  async rename(
    id: number,
    dto: UpdateCategoryDto,
  ): Promise<AdminCategoryResponse> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục ${id}`);
    }

    category.name = dto.name;
    category.slug = toSlug(dto.name);

    try {
      const saved = await this.categoriesRepository.save(category);
      const productCount = await this.countProducts(id);
      return { ...saved, productCount };
    } catch (error) {
      this.rethrowIfDuplicate(error);
      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục ${id}`);
    }

    const productCount = await this.countProducts(id);
    if (productCount > 0) {
      throw new ConflictException(
        `Không thể xoá: còn ${productCount} sản phẩm thuộc danh mục này`,
      );
    }

    await this.categoriesRepository.remove(category);
    return { message: 'Đã xoá danh mục' };
  }

  // Used by ProductsService before create/update — turns a raw FK-constraint
  // failure into a friendly 400/404 at the point of submission.
  async assertExists(id: number): Promise<void> {
    const exists = await this.categoriesRepository.exist({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Không tìm thấy danh mục ${id}`);
    }
  }

  // Archived (soft-deleted) products still hold a real FK — must count via
  // raw query against `products` (bypassing the Product repository's default
  // scope) so an admin can't delete a category an archived product still
  // references.
  private async countProducts(categoryId: number): Promise<number> {
    const result = await this.categoriesRepository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('products', 'product')
      .where('product.category_id = :categoryId', { categoryId })
      .getRawOne<{ count: string }>();
    return Number(result?.count ?? 0);
  }

  private rethrowIfDuplicate(error: unknown): void {
    if (!(error instanceof QueryFailedError)) return;
    const driverError = error.driverError as { code?: string };
    const msg = error.message;
    if (
      msg.includes('duplicate') ||
      msg.includes('unique') ||
      driverError.code === '23505' ||
      driverError.code === 'ER_DUP_ENTRY'
    ) {
      throw new ConflictException('Danh mục đã tồn tại');
    }
  }
}
