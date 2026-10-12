import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { QueryFilter, Model, PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { Category } from './entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AdminCategoryQueryDto } from './dto/admin-category-query.dto';
import { escapeRegex, toSlug } from '../../common/utils/string.utils';
import { isDuplicateKeyError } from '../../common/database/transaction';
import { isObjectIdString } from '../../common/pipes/parse-object-id.pipe';

export interface AdminCategoryResponse {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
  updatedAt?: Date;
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

// Case-insensitive ordering, matching the previous MySQL collation.
const NAME_COLLATION = { locale: 'en', strength: 2 } as const;

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    // Read-only access to products for counts/referential checks (archived
    // products included — the raw `products` collection, no soft-delete scope).
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {}

  private searchFilter(search?: string): QueryFilter<Category> {
    if (!search) return {};
    const re = new RegExp(escapeRegex(search), 'i');
    return { $or: [{ name: re }, { slug: re }] };
  }

  async findAllForAdmin(
    query: AdminCategoryQueryDto,
  ): Promise<PaginatedAdminCategories> {
    const { search, sort, page, limit } = query;

    const pipeline: PipelineStage[] = [
      { $match: this.searchFilter(search) },
      {
        $lookup: {
          from: this.productModel.collection.name,
          localField: '_id',
          foreignField: 'categoryId',
          pipeline: [{ $count: 'n' }],
          as: 'pc',
        },
      },
      {
        $addFields: {
          productCount: { $ifNull: [{ $first: '$pc.n' }, 0] },
        },
      },
      {
        $sort:
          sort === 'count'
            ? { productCount: -1, name: 1, _id: 1 }
            : { name: 1, _id: 1 },
      },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const [rows, total, globalStats] = await Promise.all([
      this.categoryModel
        .aggregate<{
          _id: Types.ObjectId;
          name: string;
          slug: string;
          productCount: number;
        }>(pipeline)
        .collation(NAME_COLLATION),
      this.categoryModel.countDocuments(this.searchFilter(search)),
      this.getGlobalStats(),
    ]);

    return {
      data: rows.map((r) => ({
        id: r._id.toString(),
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

  // Whole-catalog counters for the admin grid's header chips — always
  // unfiltered/unpaginated. Counts the raw products collection, so archived
  // (soft-deleted) products still count — same rationale as countProducts.
  private async getGlobalStats(): Promise<{
    totalCategories: number;
    totalProducts: number;
    orphanCount: number;
  }> {
    const [totalCategories, totalProducts, usedCategoryIds] = await Promise.all(
      [
        this.categoryModel.countDocuments(),
        this.productModel.countDocuments(),
        this.productModel.distinct('categoryId'),
      ],
    );
    const orphanCount = await this.categoryModel.countDocuments({
      _id: { $nin: usedCategoryIds },
    });

    return { totalCategories, totalProducts, orphanCount };
  }

  // Distinct category names with at least one *active* product — feeds the
  // shopper-facing PLP filter/category list (ProductsService.getCategories()).
  async findNamesForStorefront(): Promise<string[]> {
    const categoryIds = await this.productModel.distinct('categoryId', {
      isActive: true,
    });
    const rows = await this.categoryModel
      .find({ _id: { $in: categoryIds } }, { name: 1 })
      .sort({ name: 1 })
      .collation(NAME_COLLATION)
      .lean();

    return rows.map((r) => r.name);
  }

  // Resolves category ids to names (used to build product responses, which
  // expose the category *name* rather than the raw id).
  async findNamesByIds(
    ids: (Types.ObjectId | string)[],
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.categoryModel
      .find({ _id: { $in: ids } }, { name: 1 })
      .lean();
    return new Map(rows.map((r) => [r._id.toString(), r.name]));
  }

  // Exact (case-insensitive) name lookup for the storefront category filter.
  async findIdByName(name: string): Promise<Types.ObjectId | null> {
    const row = await this.categoryModel
      .findOne({ name }, { _id: 1 })
      .collation(NAME_COLLATION)
      .lean();
    return row?._id ?? null;
  }

  async create(dto: CreateCategoryDto): Promise<AdminCategoryResponse> {
    try {
      const saved = await this.categoryModel.create({
        name: dto.name,
        slug: toSlug(dto.name),
      });
      return this.toResponse(saved, 0);
    } catch (error) {
      this.rethrowIfDuplicate(error);
      throw error;
    }
  }

  async rename(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<AdminCategoryResponse> {
    const category = await this.findOrFail(id);

    category.name = dto.name;
    category.slug = toSlug(dto.name);

    try {
      const saved = await category.save();
      const productCount = await this.countProducts(id);
      return this.toResponse(saved, productCount);
    } catch (error) {
      this.rethrowIfDuplicate(error);
      throw error;
    }
  }

  // Emulates the old `products.category_id ... ON DELETE RESTRICT` FK: a
  // category that any product (archived included) still references can't go.
  async remove(id: string): Promise<{ message: string }> {
    const category = await this.findOrFail(id);

    const productCount = await this.countProducts(id);
    if (productCount > 0) {
      throw new ConflictException(
        `Không thể xoá: còn ${productCount} sản phẩm thuộc danh mục này`,
      );
    }

    await category.deleteOne();
    return { message: 'Đã xoá danh mục' };
  }

  // Used by ProductsService before create/update — referential check that
  // replaced the FK constraint: a friendly 404 at the point of submission.
  async assertExists(id: string): Promise<void> {
    const exists = isObjectIdString(id)
      ? await this.categoryModel.exists({ _id: id })
      : null;
    if (!exists) {
      throw new NotFoundException(`Không tìm thấy danh mục ${id}`);
    }
  }

  private async findOrFail(id: string) {
    const category = isObjectIdString(id)
      ? await this.categoryModel.findById(id)
      : null;
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục ${id}`);
    }
    return category;
  }

  private toResponse(
    category: {
      id: string;
      name: string;
      slug: string;
      createdAt: Date;
      updatedAt: Date;
    },
    productCount: number,
  ): AdminCategoryResponse {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      productCount,
    };
  }

  // Archived (soft-deleted) products still hold a real reference — count the
  // raw collection (no deletedAt filter) so an admin can't delete a category
  // an archived product still references.
  private countProducts(categoryId: string): Promise<number> {
    return this.productModel.countDocuments({ categoryId });
  }

  private rethrowIfDuplicate(error: unknown): void {
    if (isDuplicateKeyError(error)) {
      throw new ConflictException('Danh mục đã tồn tại');
    }
  }
}
