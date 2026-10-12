import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { UserService } from '../users/user.service';
import { MailService } from '../mail/mail.service';
import { InventoryService } from '../inventory/inventory.service';
import type { OrderCreatedItem } from './order-events.types';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  OrderResponseDto,
  AdminOrderDetailResponseDto,
} from './dto/order-response.dto';
import { StorageService } from '../../common/storage/storage.service';
import { resolveFirstImageUrl } from '../../common/utils/image.utils';
import { createPaginatedResponse } from '../../common/utils/pagination.utils';
import { escapeLike } from '../../common/utils/string.utils';
import { computeFinalPrice } from '../../common/utils/pricing.utils';

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
  orderId: number;
}

// An order item with its thumbnail resolved (Story 4.4 order-detail page).
// `product` may be missing (unresolvable / soft-deleted) — productImageUrl
// falls back to null rather than throwing, the frontend renders a placeholder.
export type OrderItemWithImage = OrderItem & { productImageUrl: string | null };
export type OrderWithItemImages = Omit<Order, 'items'> & {
  items: OrderItemWithImage[];
};

// Admin order-list row (Story 5.4). Deliberately duplicated rather than
// imported from AdminDashboardService — that module already injects
// Order/Product repositories directly instead of depending on this service,
// the same "no cross-feature-module service coupling" precedent this
// mirrors in the other direction.
export interface AdminOrderSummary {
  id: number;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
}

export interface PaginatedAdminOrders {
  data: AdminOrderSummary[];
  total: number;
  page: number;
  limit: number;
}

// Admin order detail (Story 5.4): everything the shopper detail view has,
// plus fields only an admin needs. `customerEmail`/`customerPhone` come from
// `User` (never in `shippingAddress`'s JSON snapshot or on `Order` itself);
// `paymentStatus` is derived from `paymentReference` — no dedicated column.
export type AdminOrderDetail = OrderWithItemImages & {
  customerEmail: string | null;
  customerPhone: string | null;
  paymentStatus: 'paid' | 'unpaid';
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
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
    userId: number,
    dto: CreateOrderDto,
  ): Promise<CreateOrderResult> {
    const existing = await this.orderRepository.findOne({
      where: { userId, idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return { orderId: existing.id };
    }

    // Resolve the owned address up front (throws generic 404 if not owned).
    const address = await this.userService.getOwnedAddress(
      userId,
      dto.shippingAddressId,
    );

    let order: Order;
    let stockLevels: OrderCreatedItem[];
    try {
      ({ order, stockLevels } = await this.placeOrder(userId, dto, address));
    } catch (err) {
      // Two concurrent requests with the same idempotency key can both pass
      // the pre-check above and both enter the transaction; the loser hits
      // `uq_orders_user_idempotency_key` (DB-level, see CreateOrders
      // migration) instead of a stock/validation error. That's a benign
      // replay, not a real failure — return the winner's order instead of
      // bubbling a 500.
      if (this.isDuplicateIdempotencyKeyError(err)) {
        const winner = await this.orderRepository.findOne({
          where: { userId, idempotencyKey: dto.idempotencyKey },
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
    if (!(err instanceof QueryFailedError)) return false;
    const code = (err as QueryFailedError & { driverError?: { code?: string } })
      .driverError?.code;
    return code === 'ER_DUP_ENTRY' && err.message.includes('idempotency_key');
  }

  private async placeOrder(
    userId: number,
    dto: CreateOrderDto,
    address: Awaited<ReturnType<UserService['getOwnedAddress']>>,
  ): Promise<{ order: Order; stockLevels: OrderCreatedItem[] }> {
    return this.dataSource.transaction(async (manager) => {
      // Merge duplicate productId lines before validating — otherwise each
      // line is checked against the same un-decremented stockQuantity, so
      // e.g. two lines of quantity 5 against a stock of 6 both "pass" and
      // the stock update below decrements the same row twice (oversell).
      const quantityByProductId = new Map<number, number>();
      for (const line of dto.cartItems) {
        quantityByProductId.set(
          line.productId,
          (quantityByProductId.get(line.productId) ?? 0) + line.quantity,
        );
      }
      const productIds = Array.from(quantityByProductId.keys());
      // Lock the product rows for the duration of the transaction
      // (SELECT ... FOR UPDATE). Without this, two concurrent checkouts could
      // both pass the `quantity <= stockQuantity` check below and decrement
      // past zero (oversell). InnoDB acquires the row locks in primary-key
      // order, so concurrent orders lock in a consistent order and don't
      // deadlock on overlapping products. Matches CartService's locking.
      const products = await manager.find(Product, {
        where: { id: In(productIds) },
        lock: { mode: 'pessimistic_write' },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      const orderItems: OrderItem[] = [];
      // Products to decrement once the order row is saved. Collected during
      // validation so the reserve step below needs no second lookup.
      const stockUpdates: { product: Product; quantity: number }[] = [];
      let subtotal = 0;

      for (const [productId, quantity] of quantityByProductId) {
        const product = byId.get(productId);
        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Sản phẩm ${productId} hiện không khả dụng`,
          );
        }
        if (quantity > product.stockQuantity) {
          throw new BadRequestException(
            `Không đủ hàng tồn kho cho sản phẩm ${productId}`,
          );
        }

        // Snapshot the price actually charged (post-discount) — order
        // history must keep showing what the customer paid even if the
        // product's discount later changes or is removed.
        const price = computeFinalPrice(
          Number(product.price),
          product.discountPercentage,
        );
        subtotal += price * quantity;

        orderItems.push(
          manager.create(OrderItem, {
            productId: product.id,
            productName: product.name,
            price,
            quantity,
          }),
        );
        stockUpdates.push({ product, quantity });
      }

      subtotal = roundVnd(subtotal);
      const tax = roundVnd(subtotal * TAX_RATE);
      const total = roundVnd(subtotal + SHIPPING_FEE + tax);

      const created = manager.create(Order, {
        userId,
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
      });

      const saved = await manager.save(created);

      // Reserve stock at placement — every line was validated
      // `quantity <= stockQuantity` above, so the decrement never goes negative.
      // Mutate in-memory first, then batch-save all at once.
      for (const { product, quantity } of stockUpdates) {
        product.stockQuantity -= quantity;
      }
      await manager.save(stockUpdates.map(({ product }) => product));

      // Remove the ordered items from this user's cart.
      if (productIds.length > 0) {
        await manager.delete(CartItem, {
          userId,
          productId: In(productIds),
        });
      }

      // Post-decrement stock snapshot for low-stock alerting — read from
      // the already-mutated in-memory `product` objects above, no extra
      // query needed.
      const stockLevels: OrderCreatedItem[] = stockUpdates.map(
        ({ product, quantity }) => ({
          productId: product.id,
          productName: product.name,
          quantityOrdered: quantity,
          remainingStock: product.stockQuantity,
        }),
      );

      return { order: saved, stockLevels };
    });
  }

  // Paginated order history for the caller (newest first), optionally
  // narrowed by status. Never returns another user's orders. Items carry a
  // resolved `productImageUrl` (product relation joined) so the history list
  // can render a product thumbnail per order, matching the detail view.
  async findAllForUser(
    userId: number,
    query: OrderQueryDto,
  ): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, search, sort, page, limit } = query;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .leftJoinAndSelect('order.items', 'items');

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    if (search) {
      const trimmed = search.trim().replace(/^#/, '');
      const escaped = escapeLike(trimmed);

      if (/^\d+$/.test(trimmed)) {
        qb.andWhere('order.id = :orderId', { orderId: Number(trimmed) });
      } else {
        qb.andWhere(
          (subQuery) => {
            return (
              'EXISTS (' +
              subQuery
                .subQuery()
                .select('1')
                .from('order_items', 'sub_item')
                .where('sub_item.order_id = order.id')
                .andWhere('sub_item.product_name LIKE :prodSearch')
                .getQuery() +
              ')'
            );
          },
          { prodSearch: `%${escaped}%` },
        );
      }
    }

    qb.orderBy('order.createdAt', sort === 'oldest' ? 'ASC' : 'DESC');

    qb.skip((page - 1) * limit).take(limit);

    const [orders, total] = await qb.getManyAndCount();

    const productImageMap = await this.loadProductImageMap(orders);

    const data = orders.map((order) => {
      const withImages = {
        ...order,
        items: this.mapItemsWithImages(order.items ?? [], productImageMap),
      };
      return this.toOrderResponseDto(withImages);
    });

    return createPaginatedResponse(data, total, page, limit);
  }

  // Fetch an order owned by the caller with its items (generic 404
  // otherwise) — used by GET /api/orders/:id (order-confirmation page, and
  // the order-detail page in Story 4.4). Each item's `productImageUrl` is
  // resolved from the joined product's first image key (null if the product
  // can't be resolved, e.g. soft-deleted, or has no images).
  async getOrderForUser(
    userId: number,
    orderId: number,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const productImageMap = await this.loadProductImageMap([order]);
    const withImages = {
      ...order,
      items: this.mapItemsWithImages(order.items, productImageMap),
    };
    return this.toOrderResponseDto(withImages);
  }

  // Order-confirmation email sent at placement. Recipient resolved first
  // (awaited, fast local read); only the SMTP send is fire-and-forget. The
  // order is already committed, so a lookup/send failure here must never fail
  // an order that was successfully placed.
  private async dispatchOrderConfirmationEmail(order: Order): Promise<void> {
    try {
      const user = await this.userService.findById(order.userId);
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
    order: Order,
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

  private async loadProductImageMap(
    orders: Order[],
  ): Promise<Map<number, string[]>> {
    const productIds = [
      ...new Set(orders.flatMap((o) => o.items?.map((i) => i.productId) ?? [])),
    ];
    if (productIds.length === 0) return new Map();
    const products = await this.dataSource.manager.find(Product, {
      where: { id: In(productIds) },
      select: ['id', 'imageKeys'],
      withDeleted: true,
    });
    return new Map(products.map((p) => [p.id, p.imageKeys]));
  }

  protected mapItemsWithImages(
    items: OrderItem[],
    productImageMap: Map<number, string[]>,
  ): OrderItemWithImage[] {
    return items.map((item) => ({
      ...item,
      productImageUrl: resolveFirstImageUrl(
        productImageMap.get(item.productId),
        this.storageService,
      ),
    }));
  }

  protected toOrderResponseDto(order: OrderWithItemImages): OrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      tax: order.tax,
      total: order.total,
      shippingAddress: order.shippingAddress,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        productImageUrl: item.productImageUrl,
      })),
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  protected toAdminOrderDetailResponseDto(
    order: OrderWithItemImages,
    customerEmail: string | null,
    customerPhone: string | null,
    paymentReference: string | null,
  ): AdminOrderDetailResponseDto {
    const base = this.toOrderResponseDto(order);
    return {
      ...base,
      customerEmail,
      customerPhone,
      paymentStatus: paymentReference ? 'paid' : 'unpaid',
    };
  }
}
