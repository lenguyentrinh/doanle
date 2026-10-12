import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { UserService } from '../users/user.service';
import { MailService } from '../mail/mail.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { AdminOrderDetailResponseDto } from './dto/order-response.dto';
import type { OrderWithItemImages, OrderItemWithImage } from './orders.service';
import { StorageService } from '../../common/storage/storage.service';
import { escapeLike } from '../../common/utils/string.utils';
import { resolveFirstImageUrl } from '../../common/utils/image.utils';
import { createPaginatedResponse } from '../../common/utils/pagination.utils';

const FORWARD_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export interface AdminOrderSummary {
  id: number;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
}

// `total` counts orders matching the current filter/search (drives the
// admin list's own pagination); `totalOrders`/`pendingOrders`/
// `shippedOrders`/`revenue` are deliberately unfiltered — they always
// reflect every order so the header chip and stat strip don't shift as the
// admin switches tabs or searches.
export interface PaginatedAdminOrders {
  data: AdminOrderSummary[];
  total: number;
  page: number;
  limit: number;
  totalOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  revenue: number;
}

@Injectable()
export class OrdersAdminService {
  private readonly logger = new Logger(OrdersAdminService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}

  // Paginated/filtered admin order list (Story 5.4) — unlike findAllForUser,
  // not scoped to a caller. `search` matches a substring of either the order
  // id or the customer's name snapshotted in the JSON shippingAddress column
  // (first query in this codebase to search inside a JSON column).
  async findAllForAdmin(
    query: AdminOrderQueryDto,
  ): Promise<PaginatedAdminOrders> {
    const { status, search, sort, page, limit } = query;

    const qb = this.orderRepository.createQueryBuilder('order');

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    if (search) {
      const trimmed = search.trim();
      // Escape LIKE wildcards so user input is matched literally
      const escaped = escapeLike(trimmed);
      const conditions = [
        `JSON_UNQUOTE(JSON_EXTRACT(order.shippingAddress, '$.firstName')) LIKE :nameSearch`,
        `JSON_UNQUOTE(JSON_EXTRACT(order.shippingAddress, '$.lastName')) LIKE :nameSearch`,
      ];
      const params: Record<string, unknown> = { nameSearch: `%${escaped}%` };

      if (/^\d+$/.test(trimmed)) {
        conditions.unshift('CAST(order.id AS CHAR) LIKE :idSearch');
        params.idSearch = `%${escaped}%`;
      }

      qb.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    qb.orderBy('order.createdAt', sort === 'oldest' ? 'ASC' : 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [[orders, total], globalStats] = await Promise.all([
      qb.getManyAndCount(),
      this.getGlobalStats(),
    ]);

    return {
      ...createPaginatedResponse(
        orders.map((order) => ({
          id: order.id,
          customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
        })),
        total,
        page,
        limit,
      ),
      ...globalStats,
    };
  }

  // Whole-catalog counters for the admin list's header chip + stat strip —
  // always unfiltered/unpaginated. Revenue matches the strip's prior
  // client-side definition (sum of every non-cancelled order's total, not
  // AdminDashboardService's stricter confirmedAt-based "money actually
  // taken" cohort) — moved server-side as-is, now exact instead of
  // best-effort-capped-at-100.
  private async getGlobalStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    shippedOrders: number;
    revenue: number;
  }> {
    const [statusCounts, revenueResult] = await Promise.all([
      this.orderRepository
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('order.status')
        .getRawMany<{ status: OrderStatus; count: string }>(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'sum')
        .where('order.status != :cancelled', {
          cancelled: OrderStatus.CANCELLED,
        })
        .getRawOne<{ sum: string | null }>(),
    ]);

    let totalOrders = 0;
    let pendingOrders = 0;
    let shippedOrders = 0;
    for (const row of statusCounts) {
      const count = Number(row.count);
      totalOrders += count;
      if (row.status === OrderStatus.PENDING) pendingOrders = count;
      if (row.status === OrderStatus.SHIPPED) shippedOrders = count;
    }

    return {
      totalOrders,
      pendingOrders,
      shippedOrders,
      revenue: revenueResult?.sum ? Number(revenueResult.sum) : 0,
    };
  }

  // Admin order detail (Story 5.4) — no ownership check (an admin may view
  // any order). customerEmail/customerPhone come from User, resolved via the
  // UserService dependency this service already has, never a new relation on
  // Order.
  async getOrderForAdmin(
    orderId: number,
  ): Promise<AdminOrderDetailResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const [user, productImageMap] = await Promise.all([
      this.userService.findById(order.userId),
      this.loadProductImageMap([order]),
    ]);

    const withImages = {
      ...order,
      items: this.mapItemsWithImages(order.items, productImageMap),
    };

    return this.toAdminOrderDetailResponseDto(
      withImages,
      user?.email ?? null,
      user?.phoneNumber ?? null,
      order.paymentReference,
    );
  }

  // Admin forward-only status transition (Story 5.4). The epic's "the
  // dropdown only offers valid forward transitions" describes UI behavior
  // only — a raw PATCH must not be able to bypass it, so this rejects
  // anything but exactly one step forward along FORWARD_STATUSES (no
  // skip-ahead, no backward, no transition touching CANCELLED — that status
  // is reachable only via cancelOrder()).
  async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
  ): Promise<{ message: string }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const currentIndex = FORWARD_STATUSES.indexOf(order.status);
    const nextIndex = FORWARD_STATUSES.indexOf(status);
    if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
      throw new BadRequestException('Chuyển trạng thái không hợp lệ');
    }

    order.status = status;
    const now = new Date();
    if (status === OrderStatus.CONFIRMED) order.confirmedAt = now;
    if (status === OrderStatus.SHIPPED) order.shippedAt = now;
    if (status === OrderStatus.DELIVERED) order.deliveredAt = now;

    const saved = await this.orderRepository.save(order);
    await this.dispatchStatusUpdateEmail(saved);

    return { message: 'Đã cập nhật trạng thái đơn hàng' };
  }

  // Admin cancellation (Story 5.4) — pending-only, per the epic and the
  // PRD's "refund logic deferred; MVP documents refund intent" decision.
  // Never sets confirmedAt (a pending order never had one), which is what
  // keeps AdminDashboardService.sumRevenueForMonth's `confirmedAt IS NOT
  // NULL` revenue-exclusion assumption for cancelled orders holding true.
  async cancelOrder(orderId: number): Promise<{ message: string }> {
    // Status check + lock both live inside the transaction — otherwise two
    // concurrent cancel requests both read PENDING via an unlocked findOne,
    // both pass the check, and both restock the same order's items (double
    // refund). Locking the order row first (before the product rows) forces
    // the second request to block until the first commits its CANCELLED
    // status, so its re-check of order.status below sees the update and
    // rejects instead of restocking again.
    const saved = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          'Chỉ đơn hàng đang chờ xử lý mới có thể hủy',
        );
      }

      const items = await manager.find(OrderItem, {
        where: { orderId: order.id },
      });
      const productIds = items.map((i) => i.productId);
      const products = await manager.find(Product, {
        where: { id: In(productIds) },
        lock: { mode: 'pessimistic_write' },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      for (const item of items) {
        const product = byId.get(item.productId);
        if (product) {
          product.stockQuantity += item.quantity;
          await manager.save(product);
        }
      }

      order.status = OrderStatus.CANCELLED;
      return await manager.save(order);
    });

    await this.dispatchStatusUpdateEmail(saved);

    return { message: 'Đã hủy đơn hàng' };
  }

  private async dispatchStatusUpdateEmail(order: Order): Promise<void> {
    try {
      const user = await this.userService.findById(order.userId);
      if (user) {
        this.mailService
          .sendOrderStatusUpdate(order, user.email)
          .catch((err) => {
            this.logger.error(
              `sendOrderStatusUpdate failed for order ${order.id}`,
              err instanceof Error ? err.stack : String(err),
            );
          });
      } else {
        this.logger.warn(
          `sendOrderStatusUpdate skipped: no user found for order ${order.id}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `sendOrderStatusUpdate skipped: failed to resolve recipient for order ${order.id}`,
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

  private mapItemsWithImages(
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

  private toAdminOrderDetailResponseDto(
    order: OrderWithItemImages,
    customerEmail: string | null,
    customerPhone: string | null,
    paymentReference: string | null,
  ): AdminOrderDetailResponseDto {
    return {
      id: order.id,
      status: order.status,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      tax: order.tax,
      total: order.total,
      shippingAddress: order.shippingAddress,
      items: order.items,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customerEmail,
      customerPhone,
      paymentStatus: paymentReference ? 'paid' : 'unpaid',
    };
  }
}
