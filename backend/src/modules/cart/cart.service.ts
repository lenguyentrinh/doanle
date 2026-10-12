import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { StorageService } from '../../common/storage/storage.service';
import { resolveFirstImageUrl } from '../../common/utils/image.utils';
import { computeFinalPrice } from '../../common/utils/pricing.utils';

export interface CartLine {
  // The cart_items row id — the frontend needs this to target
  // PATCH/DELETE /api/cart/:itemId (NOT the product id below).
  id: number;
  product: {
    id: number;
    name: string;
    // Original unit price — always the product's list price, discounted or
    // not. `finalPrice` is what the customer actually pays per unit; the
    // subtotal below is computed from `finalPrice`, not `price`.
    price: number;
    discountPercentage: number | null;
    finalPrice: number;
    imageUrl: string | null;
    stockQuantity: number;
    isActive: boolean;
  };
  quantity: number;
}

export interface CartView {
  items: CartLine[];
  subtotal: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
  ) {}

  // Read the authenticated user's cart. Returns items even when a product is
  // inactive or out of stock (incl. soft-deleted) so the UI can warn (Story 3.3).
  async getCart(userId: number): Promise<CartView> {
    const items = await this.cartItemRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });

    if (items.length === 0) {
      return { items: [], subtotal: 0 };
    }

    const productIds = items.map((i) => i.productId);
    const products = await this.productRepository.find({
      where: { id: In(productIds) },
      withDeleted: true,
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines: CartLine[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = byId.get(item.productId);
      // FK is ON DELETE CASCADE, so a hard-deleted product removes its cart
      // rows; a missing product here means a data anomaly — skip defensively.
      if (!product) continue;

      const price = Number(product.price);
      const finalPrice = computeFinalPrice(price, product.discountPercentage);
      subtotal += finalPrice * item.quantity;

      lines.push({
        id: item.id,
        product: {
          id: product.id,
          name: product.name,
          price,
          discountPercentage: product.discountPercentage,
          finalPrice,
          imageUrl: resolveFirstImageUrl(
            product.imageKeys,
            this.storageService,
          ),
          stockQuantity: product.stockQuantity,
          isActive: product.isActive,
        },
        quantity: item.quantity,
      });
    }

    return { items: lines, subtotal };
  }

  // Add a product to the cart (or increment an existing line). Wrapped in a
  // transaction so the stock check and the row upsert can't interleave with a
  // concurrent add and overbook (carry-forward from the 1.5 atomicity finding).
  async addItem(userId: number, dto: AddCartItemDto): Promise<CartView> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: dto.productId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) {
        throw new NotFoundException(`Không tìm thấy sản phẩm ${dto.productId}`);
      }

      const existing = await queryRunner.manager.findOne(CartItem, {
        where: { userId, productId: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });
      const targetQuantity = (existing?.quantity ?? 0) + dto.quantity;

      if (targetQuantity > product.stockQuantity) {
        throw new BadRequestException('Không đủ hàng tồn kho');
      }

      if (existing) {
        existing.quantity = targetQuantity;
        await queryRunner.manager.save(existing);
      } else {
        const item = queryRunner.manager.create(CartItem, {
          userId,
          productId: dto.productId,
          quantity: dto.quantity,
        });
        await queryRunner.manager.save(item);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw this.toHttpException(error);
    } finally {
      await queryRunner.release();
    }

    return this.getCart(userId);
  }

  // Update a cart line's quantity. quantity === 0 removes the line.
  async updateItem(
    userId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartView> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the cart item row inside the transaction so a concurrent update
      // (e.g. quantity change from another tab) does not cause a lost write.
      const item = await queryRunner.manager.findOne(CartItem, {
        where: { id: itemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item || item.userId !== userId) {
        throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
      }

      if (dto.quantity === 0) {
        await queryRunner.manager.remove(item);
        await queryRunner.commitTransaction();
        return this.getCart(userId);
      }

      const product = await queryRunner.manager.findOne(Product, {
        where: { id: item.productId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) {
        throw new NotFoundException(
          'Không tìm thấy sản phẩm hoặc đã ngừng kinh doanh',
        );
      }
      if (dto.quantity > product.stockQuantity) {
        throw new BadRequestException('Không đủ hàng tồn kho');
      }

      item.quantity = dto.quantity;
      await queryRunner.manager.save(item);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw this.toHttpException(error);
    } finally {
      await queryRunner.release();
    }

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<CartView> {
    const item = await this.findOwnedItem(userId, itemId);
    try {
      await this.cartItemRepository.remove(item);
    } catch (error) {
      throw this.toHttpException(error);
    }
    return this.getCart(userId);
  }

  // Merge a guest (localStorage) cart into the server cart after login.
  // Batches product + existing-item lookups and saves instead of N+1
  // per line (2 locked SELECT + save each). Runs in a transaction.
  // Reuses the already-loaded product data to avoid an extra getCart call.
  async mergeCart(userId: number, dto: MergeCartDto): Promise<CartView> {
    if (!dto.items || dto.items.length === 0) {
      return this.getCart(userId);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let mergedProductMap: Map<number, Product>;

    try {
      const mergeProductIds = dto.items.map((i) => i.productId);
      const products = await queryRunner.manager.find(Product, {
        where: { id: In(mergeProductIds) },
        lock: { mode: 'pessimistic_write' },
      });
      mergedProductMap = new Map(products.map((p) => [p.id, p]));

      const existingItems = await queryRunner.manager.find(CartItem, {
        where: { userId, productId: In(mergeProductIds) },
        lock: { mode: 'pessimistic_write' },
      });
      const existingByProductId = new Map(
        existingItems.map((i) => [i.productId, i]),
      );

      // Dedupe/aggregate merge items by productId — the guest cart may contain
      // multiple entries for the same product (e.g. re-added before sync).
      // Without this aggregation, the 2nd+ entry for a productId would violate
      // the unique constraint `uq_cart_items_user_product`.
      const aggregated = new Map<number, number>();
      for (const mergeItem of dto.items) {
        aggregated.set(
          mergeItem.productId,
          (aggregated.get(mergeItem.productId) ?? 0) + mergeItem.quantity,
        );
      }

      const toSave: CartItem[] = [];

      for (const [productId, quantity] of aggregated) {
        const product = mergedProductMap.get(productId);
        if (!product || !product.isActive || product.stockQuantity <= 0) {
          continue;
        }

        const existing = existingByProductId.get(productId);
        const targetQuantity = Math.min(
          (existing?.quantity ?? 0) + quantity,
          product.stockQuantity,
        );

        if (existing) {
          existing.quantity = targetQuantity;
          toSave.push(existing);
        } else {
          toSave.push(
            queryRunner.manager.create(CartItem, {
              userId,
              productId,
              quantity: targetQuantity,
            }),
          );
        }
      }

      if (toSave.length > 0) {
        await queryRunner.manager.save(toSave);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw this.toHttpException(error);
    } finally {
      await queryRunner.release();
    }

    // Build cart view from already-loaded products + remaining items
    // instead of calling getCart() which would re-query everything.
    return this.buildCartView(userId, mergedProductMap!);
  }

  // Lightweight cart view builder that reuses pre-loaded product data.
  // Loads only cart items (1 query) and fills product details from
  // knownProductMap where possible, querying only unknown products.
  private async buildCartView(
    userId: number,
    knownProductMap: Map<number, Product>,
  ): Promise<CartView> {
    const items = await this.cartItemRepository.find({
      where: { userId },
      order: { id: 'ASC' },
    });

    if (items.length === 0) {
      return { items: [], subtotal: 0 };
    }

    const unknownIds = items
      .map((i) => i.productId)
      .filter((id) => !knownProductMap.has(id));

    if (unknownIds.length > 0) {
      const unknownProducts = await this.productRepository.find({
        where: { id: In(unknownIds) },
        withDeleted: true,
        select: [
          'id',
          'name',
          'price',
          'discountPercentage',
          'imageKeys',
          'stockQuantity',
          'isActive',
        ],
      });
      for (const p of unknownProducts) {
        knownProductMap.set(p.id, p);
      }
    }

    const lines: CartLine[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = knownProductMap.get(item.productId);
      if (!product) continue;

      const price = Number(product.price);
      const finalPrice = computeFinalPrice(price, product.discountPercentage);
      subtotal += finalPrice * item.quantity;

      lines.push({
        id: item.id,
        product: {
          id: product.id,
          name: product.name,
          price,
          discountPercentage: product.discountPercentage,
          finalPrice,
          imageUrl: resolveFirstImageUrl(
            product.imageKeys,
            this.storageService,
          ),
          stockQuantity: product.stockQuantity,
          isActive: product.isActive,
        },
        quantity: item.quantity,
      });
    }

    return { items: lines, subtotal };
  }

  // Ownership check — never leak another user's rows (generic 404).
  private async findOwnedItem(
    userId: number,
    itemId: number,
  ): Promise<CartItem> {
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId },
    });
    if (!item || item.userId !== userId) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }
    return item;
  }

  // Preserve HTTP exceptions; convert DB-level failures to a clean 400.
  private toHttpException(error: unknown): unknown {
    if (error instanceof HttpException) {
      return error;
    }
    if (error instanceof QueryFailedError) {
      return new BadRequestException('Thao tác giỏ hàng thất bại');
    }
    return error;
  }
}
