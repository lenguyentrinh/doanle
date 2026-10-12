import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, QueryFilter, Model } from 'mongoose';
import { Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { UserService } from '../users/user.service';
import { MailService } from '../mail/mail.service';
import { InventoryService } from '../inventory/inventory.service';
import type { OrderCreatedItem } from './order-events.types';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import {
  loadProductImageMap,
  mapItemsWithImages,
  toOrderResponseDto,
} from './orders.mapper';
import { StorageService } from '../../common/storage/storage.service';
import { createPaginatedResponse } from '../../common/utils/pagination.utils';
import { escapeRegex } from '../../common/utils/string.utils';
import { computeFinalPrice } from '../../common/utils/pricing.utils';
import {
  isDuplicateKeyError,
  runInTransaction,
} from '../../common/database/transaction';
import { isObjectIdString } from '../../common/pipes/parse-object-id.pipe';

// Must match frontend/features/cart/constants.ts so the checkout total the
// customer confirms equals the total the backend computes and persists.
const SHIPPING_FEE = 30000; // ₫30.000 flat
const TAX_RATE = 0.1;

// VND has no minor units, so amounts round to a whole đồng — matching
// frontend/features/cart/constants.ts's calcTax (Math.round(subtotal * TAX_RATE)).
function roundVnd(value: number): number {
  return Math.round(value);
}

export interface CreateOrderResult {
  // ObjectId hex string.
  orderId: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(CartItem.name)
    private readonly cartItemModel: Model<CartItem>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly inventoryService: InventoryService,
    private readonly storageService: StorageService,
  ) {}

  // Places a Cash-on-Delivery order. Payment is collected by the courier on
  // delivery (handled outside this system), so there is no gateway step —
  // placing the order IS the commit. In a single transaction this validates
  // stock, snapshots items + server-computed totals, persists the order at
  // status PENDING ("awaiting admin confirmation"), reserves stock (decrement),
  // and clears the ordered items from the cart. Idempotent by
  // (userId, idempotencyKey): a repeat POST returns the existing order.
  async createOrder(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<CreateOrderResult> {
    const existing = await this.orderModel.findOne({
      userId,
      idempotencyKey: dto.idempotencyKey,
    });
    if (existing) {
      return { orderId: existing.id };
    }

    // Resolve the owned address up front (throws generic 404 if not owned).
    const address = await this.userService.getOwnedAddress(
      userId,
      dto.shippingAddressId,
    );

    let order: OrderDocument;
    let stockLevels: OrderCreatedItem[];
    try {
      ({ order, stockLevels } = await this.placeOrder(userId, dto, address));
    } catch (err) {
      // Two concurrent requests with the same idempotency key can both pass
      // the pre-check above and both enter the transaction; the loser hits
      // the unique index `uq_orders_user_idempotency_key` instead of a
      // stock/validation error. That's a benign replay, not a real failure
      // — return the winner's order instead of bubbling a 500.
      if (this.isDuplicateIdempotencyKeyError(err)) {
        const winner = await this.orderModel.findOne({
          userId,
          idempotencyKey: dto.idempotencyKey,
        });
        if (winner) {
          return { orderId: winner.id };
        }
      }
      throw err;
    }

    // Confirmation email — recipient resolved first (awaited), the SMTP send
    // itself is fire-and-forget (same resilience pattern as status updates).
    await this.dispatchOrderConfirmationEmail(order);

    // Low-stock alerting — independent of the email above, handled
    // in-process by InventoryModule. Never blocks/fails order placement.
    await this.recordLowStockAlerts(order, stockLevels);

    return { orderId: order.id };
  }

  private isDuplicateIdempotencyKeyError(err: unknown): boolean {
    if (!isDuplicateKeyError(err)) return false;
    const message = (err as Error).message ?? '';
    return (
      message.includes('uq_orders_user_idempotency_key') ||
      message.includes('idempotencyKey')
    );
  }

  private async placeOrder(
    userId: string,
    dto: CreateOrderDto,
    address: {
      firstName: string;
      lastName: string;
      street: string;
      city: string;
    },
  ): Promise<{ order: OrderDocument; stockLevels: OrderCreatedItem[] }> {
    // Merge duplicate productId lines before validating — otherwise each
    // line would be checked/decremented separately against the same stock
    // (e.g. two lines of quantity 5 against a stock of 6).
    const quantityByProductId = new Map<string, number>();
    for (const line of dto.cartItems) {
      const key = String(line.productId).toLowerCase();
      quantityByProductId.set(
        key,
        (quantityByProductId.get(key) ?? 0) + line.quantity,
      );
    }
    const productIds = Array.from(quantityByProductId.keys());

    return runInTransaction(this.connection, async (session) => {
      const orderItems: {
        productId: Types.ObjectId;
        productName: string;
        price: number;
        quantity: number;
      }[] = [];
      const stockLevels: OrderCreatedItem[] = [];
      let subtotal = 0;

      for (const [productId, quantity] of quantityByProductId) {
        // Atomic conditional decrement: the filter only matches an active,
        // non-archived product with enough stock, so two concurrent checkouts
        // can never both succeed past zero (no oversell) — a MongoDB
        // equivalent of the old SELECT ... FOR UPDATE + check + decrement.
        // Inside the transaction, a failure on a later line rolls back the
        // decrements of earlier lines.
        const product = await this.productModel.findOneAndUpdate(
          {
            _id: productId,
            isActive: true,
            deletedAt: null,
            stockQuantity: { $gte: quantity },
          },
          { $inc: { stockQuantity: -quantity } },
          { returnDocument: 'after', session },
        );

        if (!product) {
          // Work out why, to keep the original per-reason messages.
          const current = await this.productModel
            .findOne({ _id: productId, deletedAt: null })
            .session(session);
          if (!current || !current.isActive) {
            throw new BadRequestException(
              `Sản phẩm ${productId} hiện không khả dụng`,
            );
          }
          throw new BadRequestException(
            `Không đủ hàng tồn kho cho sản phẩm ${productId}`,
          );
        }

        // Snapshot the price actually charged (post-discount) — order
        // history must keep showing what the customer paid even if the
        // product's discount later changes or is removed.
        const price = computeFinalPrice(
          Number(product.price),
          product.discountPercentage ?? null,
        );
        subtotal += price * quantity;

        orderItems.push({
          productId: product._id,
          productName: product.name,
          price,
          quantity,
        });
        // Post-decrement stock snapshot for low-stock alerting.
        stockLevels.push({
          productId: product.id,
          productName: product.name,
          quantityOrdered: quantity,
          remainingStock: product.stockQuantity,
        });
      }

      subtotal = roundVnd(subtotal);
      const tax = roundVnd(subtotal * TAX_RATE);
      const total = roundVnd(subtotal + SHIPPING_FEE + tax);

      const [saved] = await this.orderModel.create(
        [
          {
            userId: new Types.ObjectId(userId),
            status: OrderStatus.PENDING,
            subtotal,
            shippingFee: SHIPPING_FEE,
            tax,
            total,
            shippingAddress: {
              firstName: address.firstName,
              lastName: address.lastName,
              street: address.street,
              city: address.city,
            },
            idempotencyKey: dto.idempotencyKey,
            paymentReference: null,
            items: orderItems,
          },
        ],
        { session },
      );

      // Remove the ordered items from this user's cart.
      await this.cartItemModel.deleteMany(
        { userId, productId: { $in: productIds } },
        { session },
      );

      return { order: saved, stockLevels };
    });
  }

  // Paginated order history for the caller (newest first), optionally
  // narrowed by status. Never returns another user's orders. Items carry a
  // resolved `productImageUrl` so the history list can render a product
  // thumbnail per order, matching the detail view.
  async findAllForUser(
    userId: string,
    query: OrderQueryDto,
  ): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, search, sort, page, limit } = query;

    const filter: QueryFilter<Order> = { userId };

    if (status) {
      filter.status = status;
    }

    if (search) {
      const trimmed = search.trim().replace(/^#/, '');

      if (isObjectIdString(trimmed)) {
        // Order-number search: exact order id.
        filter._id = trimmed;
      } else {
        // Product-name search across the order's items (EXISTS semantics).
        filter['items.productName'] = new RegExp(escapeRegex(trimmed), 'i');
      }
    }

    const direction = sort === 'oldest' ? 1 : -1;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: direction, _id: direction })
        .skip((page - 1) * limit)
        .limit(limit),
      this.orderModel.countDocuments(filter),
    ]);

    const productImageMap = await loadProductImageMap(
      this.productModel,
      orders,
    );

    const data = orders.map((order) =>
      toOrderResponseDto(
        order,
        mapItemsWithImages(order, productImageMap, this.storageService),
      ),
    );

    return createPaginatedResponse(data, total, page, limit);
  }

  // Fetch an order owned by the caller with its items (generic 404
  // otherwise) — used by GET /api/orders/:id (order-confirmation page, and
  // the order-detail page in Story 4.4). Each item's `productImageUrl` is
  // resolved from the product's first image key (null if the product can't
  // be resolved or has no images).
  async getOrderForUser(
    userId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const order = isObjectIdString(orderId)
      ? await this.orderModel.findById(orderId)
      : null;
    if (!order || order.userId.toString() !== String(userId)) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const productImageMap = await loadProductImageMap(this.productModel, [
      order,
    ]);
    return toOrderResponseDto(
      order,
      mapItemsWithImages(order, productImageMap, this.storageService),
    );
  }

  // Order-confirmation email sent at placement. Recipient resolved first
  // (awaited, fast local read); only the SMTP send is fire-and-forget. The
  // order is already committed, so a lookup/send failure here must never fail
  // an order that was successfully placed.
  private async dispatchOrderConfirmationEmail(
    order: OrderDocument,
  ): Promise<void> {
    try {
      const user = await this.userService.findById(order.userId.toString());
      if (user) {
        this.mailService
          .sendOrderConfirmation(order, user.email)
          .catch((err) => {
            this.logger.error(
              `sendOrderConfirmation failed for order ${order.id}`,
              err instanceof Error ? err.stack : String(err),
            );
          });
      } else {
        this.logger.warn(
          `sendOrderConfirmation skipped: no user found for order ${order.id}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `sendOrderConfirmation skipped: failed to resolve recipient for order ${order.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  // Low-stock alerting — same resilience shape as
  // dispatchOrderConfirmationEmail above. A failure here must never fail an
  // order that was already committed.
  private async recordLowStockAlerts(
    order: OrderDocument,
    stockLevels: OrderCreatedItem[],
  ): Promise<void> {
    try {
      await this.inventoryService.handleOrderCreated({
        orderId: order.id,
        items: stockLevels,
      });
    } catch (err) {
      this.logger.error(
        `low-stock alert recording failed for order ${order.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
