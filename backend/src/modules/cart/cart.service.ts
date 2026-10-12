import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';
import { Types, mongo } from 'mongoose';
import { CartItem, CartItemDocument } from './entities/cart-item.entity';
import { Product, ProductDocument } from '../products/entities/product.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { StorageService } from '../../common/storage/storage.service';
import { resolveFirstImageUrl } from '../../common/utils/image.utils';
import { computeFinalPrice } from '../../common/utils/pricing.utils';
import {
  isDuplicateKeyError,
  runInTransaction,
} from '../../common/database/transaction';
import { isObjectIdString } from '../../common/pipes/parse-object-id.pipe';

export interface CartLine {
  // The cart item document id (ObjectId hex) — the frontend needs this to
  // target PATCH/DELETE /api/cart/:itemId (NOT the product id below).
  id: string;
  product: {
    id: string;
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
    @InjectModel(CartItem.name)
    private readonly cartItemModel: Model<CartItem>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly storageService: StorageService,
  ) {}

  // Read the authenticated user's cart. Returns items even when a product is
  // inactive or out of stock (incl. soft-deleted) so the UI can warn (Story 3.3).
  async getCart(userId: string): Promise<CartView> {
    return this.buildCartView(userId, new Map());
  }

  // Add a product to the cart (or increment an existing line). Wrapped in a
  // transaction so the stock check and the document upsert can't interleave
  // with a concurrent add and overbook (carry-forward from the 1.5 atomicity
  // finding). Concurrent writers to the same cart line conflict inside the
  // transaction and are retried against fresh data.
  async addItem(userId: string, dto: AddCartItemDto): Promise<CartView> {
    try {
      await this.withDuplicateRetry(() =>
        runInTransaction(this.connection, async (session) => {
          const product = await this.productModel
            .findOne({ _id: dto.productId, isActive: true, deletedAt: null })
            .session(session);
          if (!product) {
            throw new NotFoundException(
              `Không tìm thấy sản phẩm ${dto.productId}`,
            );
          }

          const existing = await this.cartItemModel
            .findOne({ userId, productId: dto.productId })
            .session(session);
          const targetQuantity = (existing?.quantity ?? 0) + dto.quantity;

          if (targetQuantity > product.stockQuantity) {
            throw new BadRequestException('Không đủ hàng tồn kho');
          }

          if (existing) {
            existing.quantity = targetQuantity;
            await existing.save({ session });
          } else {
            await this.cartItemModel.create(
              [
                {
                  userId: new Types.ObjectId(userId),
                  productId: new Types.ObjectId(dto.productId),
                  quantity: dto.quantity,
                },
              ],
              { session },
            );
          }
        }),
      );
    } catch (error) {
      throw this.toHttpException(error);
    }

    return this.getCart(userId);
  }

  // Update a cart line's quantity. quantity === 0 removes the line.
  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartView> {
    try {
      await runInTransaction(this.connection, async (session) => {
        // Read inside the transaction so a concurrent update (e.g. quantity
        // change from another tab) conflicts and retries instead of causing
        // a lost write.
        const item = await this.findOwnedItem(userId, itemId, session);

        if (dto.quantity === 0) {
          await item.deleteOne({ session });
          return;
        }

        const product = await this.productModel
          .findOne({ _id: item.productId, isActive: true, deletedAt: null })
          .session(session);
        if (!product) {
          throw new NotFoundException(
            'Không tìm thấy sản phẩm hoặc đã ngừng kinh doanh',
          );
        }
        if (dto.quantity > product.stockQuantity) {
          throw new BadRequestException('Không đủ hàng tồn kho');
        }

        item.quantity = dto.quantity;
        await item.save({ session });
      });
    } catch (error) {
      throw this.toHttpException(error);
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartView> {
    const item = await this.findOwnedItem(userId, itemId);
    try {
      await item.deleteOne();
    } catch (error) {
      throw this.toHttpException(error);
    }
    return this.getCart(userId);
  }

  // Merge a guest (localStorage) cart into the server cart after login.
  // Batches product + existing-item lookups and writes (one bulkWrite)
  // instead of N+1 per line. Runs in a transaction. Reuses the already-loaded
  // product data to avoid an extra lookup when building the response.
  async mergeCart(userId: string, dto: MergeCartDto): Promise<CartView> {
    if (!dto.items || dto.items.length === 0) {
      return this.getCart(userId);
    }

    let mergedProductMap: Map<string, ProductDocument>;

    try {
      mergedProductMap = await this.withDuplicateRetry(() =>
        runInTransaction(this.connection, async (session) => {
          const mergeProductIds = [
            ...new Set(dto.items.map((i) => i.productId)),
          ];
          const products = await this.productModel
            .find({ _id: { $in: mergeProductIds }, deletedAt: null })
            .session(session);
          const productMap = new Map(products.map((p) => [p.id, p]));

          const existingItems = await this.cartItemModel
            .find({ userId, productId: { $in: mergeProductIds } })
            .session(session);
          const existingByProductId = new Map(
            existingItems.map((i) => [i.productId.toString(), i]),
          );

          // Dedupe/aggregate merge items by productId — the guest cart may
          // contain multiple entries for the same product (e.g. re-added
          // before sync). Without this aggregation, the 2nd+ entry for a
          // productId would violate the unique index
          // `uq_cart_items_user_product`.
          const aggregated = new Map<string, number>();
          for (const mergeItem of dto.items) {
            const key = String(mergeItem.productId).toLowerCase();
            aggregated.set(
              key,
              (aggregated.get(key) ?? 0) + mergeItem.quantity,
            );
          }

          const ops: Parameters<Model<CartItem>['bulkWrite']>[0] = [];

          for (const [productId, quantity] of aggregated) {
            const product = productMap.get(productId);
            if (!product || !product.isActive || product.stockQuantity <= 0) {
              continue;
            }

            const existing = existingByProductId.get(productId);
            const targetQuantity = Math.min(
              (existing?.quantity ?? 0) + quantity,
              product.stockQuantity,
            );

            if (existing) {
              ops.push({
                updateOne: {
                  filter: { _id: existing._id },
                  update: { $set: { quantity: targetQuantity } },
                },
              });
            } else {
              ops.push({
                insertOne: {
                  document: {
                    userId: new Types.ObjectId(userId),
                    productId: new Types.ObjectId(productId),
                    quantity: targetQuantity,
                  },
                },
              });
            }
          }

          if (ops.length > 0) {
            await this.cartItemModel.bulkWrite(ops, { session });
          }

          return productMap;
        }),
      );
    } catch (error) {
      throw this.toHttpException(error);
    }

    // Build cart view from already-loaded products + remaining items
    // instead of re-querying everything.
    return this.buildCartView(userId, mergedProductMap);
  }

  // Cart view builder that reuses pre-loaded product data. Loads the cart
  // items (1 query) and fills product details from knownProductMap where
  // possible, querying only unknown products (archived ones included).
  private async buildCartView(
    userId: string,
    knownProductMap: Map<string, ProductDocument>,
  ): Promise<CartView> {
    const items = await this.cartItemModel.find({ userId }).sort({ _id: 1 });

    if (items.length === 0) {
      return { items: [], subtotal: 0 };
    }

    const unknownIds = items
      .map((i) => i.productId.toString())
      .filter((id) => !knownProductMap.has(id));

    if (unknownIds.length > 0) {
      const unknownProducts = await this.productModel.find({
        _id: { $in: unknownIds },
      });
      for (const p of unknownProducts) {
        knownProductMap.set(p.id, p);
      }
    }

    const lines: CartLine[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = knownProductMap.get(item.productId.toString());
      // Hard-deleting a product used to cascade to its cart rows; here a
      // missing product means a data anomaly — skip defensively.
      if (!product) continue;

      const price = Number(product.price);
      const discountPercentage = product.discountPercentage ?? null;
      const finalPrice = computeFinalPrice(price, discountPercentage);
      subtotal += finalPrice * item.quantity;

      lines.push({
        id: item.id,
        product: {
          id: product.id,
          name: product.name,
          price,
          discountPercentage,
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
    userId: string,
    itemId: string,
    session?: ClientSession,
  ): Promise<CartItemDocument> {
    const item = isObjectIdString(itemId)
      ? await this.cartItemModel.findById(itemId).session(session ?? null)
      : null;
    if (!item || item.userId.toString() !== String(userId)) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }
    return item;
  }

  // Two concurrent first-time adds of the same product can both try to insert
  // the (userId, productId) row; the loser hits the unique index. Re-running
  // the whole operation turns it into the normal "increment existing" path.
  private async withDuplicateRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (isDuplicateKeyError(error)) return fn();
      throw error;
    }
  }

  // Preserve HTTP exceptions; convert DB-level failures to a clean 400.
  private toHttpException(error: unknown): unknown {
    if (error instanceof HttpException) {
      return error;
    }
    if (error instanceof mongo.MongoServerError) {
      return new BadRequestException('Thao tác giỏ hàng thất bại');
    }
    return error;
  }
}
