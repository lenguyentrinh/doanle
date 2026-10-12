import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, QueryFilter, Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { UserService } from '../users/user.service';
import { MailService } from '../mail/mail.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { AdminOrderDetailResponseDto } from './dto/order-response.dto';
import {
  loadProductImageMap,
  mapItemsWithImages,
  toOrderResponseDto,
} from './orders.mapper';
import { StorageService } from '../../common/storage/storage.service';
import { escapeRegex } from '../../common/utils/string.utils';
import { createPaginatedResponse } from '../../common/utils/pagination.utils';
import { runInTransaction } from '../../common/database/transaction';
import { isObjectIdString } from '../../common/pipes/parse-object-id.pipe';

const FORWARD_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export interface AdminOrderSummary {
  id: string;
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
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}

  // Paginated/filtered admin order list (Story 5.4) — unlike findAllForUser,
  // not scoped to a caller. `search` matches the customer's first or last
  // name snapshotted in `shippingAddress`, or an order id (the full 24-char
  // id, or a hex fragment of at least 6 characters).
  async findAllForAdmin(
    query: AdminOrderQueryDto,
  ): Promise<PaginatedAdminOrders> {
    const { status, search, sort, page, limit } = query;

    const filter: QueryFilter<Order> = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      const trimmed = search.trim();
      const nameRe = new RegExp(escapeRegex(trimmed), 'i');
      const conditions: QueryFilter<Order>[] = [
        { 'shippingAddress.firstName': nameRe },
        { 'shippingAddress.lastName': nameRe },
      ];

      if (/^[0-9a-fA-F]{6,24}$/.test(trimmed)) {
        conditions.unshift({
          $expr: {
            $regexMatch: {
              input: { $toString: '$_id' },
              regex: trimmed.toLowerCase(),
            },
          },
        });
      }

      filter.$or = conditions;
    }

    const direction = sort === 'oldest' ? 1 : -1;
    const [orders, total, globalStats] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: direction, _id: direction })
        .skip((page - 1) * limit)
        .limit(limit),
      this.orderModel.countDocuments(filter),
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
    const [statusCounts, revenueRows] = await Promise.all([
      this.orderModel.aggregate<{ _id: OrderStatus; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.orderModel.aggregate<{ _id: null; sum: number }>([
        { $match: { status: { $ne: OrderStatus.CANCELLED } } },
        { $group: { _id: null, sum: { $sum: '$total' } } },
      ]),
    ]);

    let totalOrders = 0;
    let pendingOrders = 0;
    let shippedOrders = 0;
    for (const row of statusCounts) {
      const count = Number(row.count);
      totalOrders += count;
      if (row._id === OrderStatus.PENDING) pendingOrders = count;
      if (row._id === OrderStatus.SHIPPED) shippedOrders = count;
    }

    return {
      totalOrders,
      pendingOrders,
      shippedOrders,
      revenue: revenueRows[0]?.sum ? Number(revenueRows[0].sum) : 0,
    };
  }

  // Admin order detail (Story 5.4) — no ownership check (an admin may view
  // any order). customerEmail/customerPhone come from User, resolved via the
  // UserService dependency this service already has, never a new reference
  // on Order.
  async getOrderForAdmin(
    orderId: string,
  ): Promise<AdminOrderDetailResponseDto> {
    const order = await this.findOrderOrFail(orderId);

    const [user, productImageMap] = await Promise.all([
      this.userService.findById(order.userId.toString()),
      loadProductImageMap(this.productModel, [order]),
    ]);

    return {
      ...toOrderResponseDto(
        order,
        mapItemsWithImages(order, productImageMap, this.storageService),
      ),
      customerEmail: user?.email ?? null,
      customerPhone: user?.phoneNumber ?? null,
      paymentStatus: order.paymentReference ? 'paid' : 'unpaid',
    };
  }

  // Admin forward-only status transition (Story 5.4). The epic's "the
  // dropdown only offers valid forward transitions" describes UI behavior
  // only — a raw PATCH must not be able to bypass it, so this rejects
  // anything but exactly one step forward along FORWARD_STATUSES (no
  // skip-ahead, no backward, no transition touching CANCELLED — that status
  // is reachable only via cancelOrder()).
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<{ message: string }> {
    const order = await this.findOrderOrFail(orderId);

    const currentIndex = FORWARD_STATUSES.indexOf(order.status);
    const nextIndex = FORWARD_STATUSES.indexOf(status);
    if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
      throw new BadRequestException('Chuyển trạng thái không hợp lệ');
    }

    const now = new Date();
    const set: Partial<Order> = { status };
    if (status === OrderStatus.CONFIRMED) set.confirmedAt = now;
    if (status === OrderStatus.SHIPPED) set.shippedAt = now;
    if (status === OrderStatus.DELIVERED) set.deliveredAt = now;

    // Compare-and-set on the status we validated against: if a concurrent
    // request already advanced the order, this transition is no longer "one
    // step forward" and is rejected instead of silently overwriting.
    const saved = await this.orderModel.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: set },
      { returnDocument: 'after' },
    );
    if (!saved) {
      throw new BadRequestException('Chuyển trạng thái không hợp lệ');
    }
    await this.dispatchStatusUpdateEmail(saved);

    return { message: 'Đã cập nhật trạng thái đơn hàng' };
  }

  // Admin cancellation (Story 5.4) — pending-only, per the epic and the
  // PRD's "refund logic deferred; MVP documents refund intent" decision.
  // Never sets confirmedAt (a pending order never had one), which is what
  // keeps AdminDashboardService's `confirmedAt IS NOT NULL` revenue-exclusion
  // assumption for cancelled orders holding true.
  async cancelOrder(orderId: string): Promise<{ message: string }> {
    // The PENDING -> CANCELLED claim and the restock live in one transaction.
    // The claim is an atomic conditional update (`status: PENDING`), so of
    // two concurrent cancel requests exactly one wins it; the other matches
    // nothing and is rejected instead of restocking the same order's items a
    // second time (double refund).
    const saved = await runInTransaction(this.connection, async (session) => {
      const order = isObjectIdString(orderId)
        ? await this.orderModel.findOneAndUpdate(
            { _id: orderId, status: OrderStatus.PENDING },
            { $set: { status: OrderStatus.CANCELLED } },
            { returnDocument: 'after', session },
          )
        : null;

      if (!order) {
        const exists = isObjectIdString(orderId)
          ? await this.orderModel.exists({ _id: orderId }).session(session)
          : null;
        if (!exists) {
          throw new NotFoundException('Không tìm thấy đơn hàng');
        }
        throw new BadRequestException(
          'Chỉ đơn hàng đang chờ xử lý mới có thể hủy',
        );
      }

      // Restock (as before, archived products are not touched).
      for (const item of order.items) {
        await this.productModel.updateOne(
          { _id: item.productId, deletedAt: null },
          { $inc: { stockQuantity: item.quantity } },
          { session },
        );
      }

      return order;
    });

    await this.dispatchStatusUpdateEmail(saved);

    return { message: 'Đã hủy đơn hàng' };
  }

  private async findOrderOrFail(orderId: string): Promise<OrderDocument> {
    const order = isObjectIdString(orderId)
      ? await this.orderModel.findById(orderId)
      : null;
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order;
  }

  private async dispatchStatusUpdateEmail(order: OrderDocument): Promise<void> {
    try {
      const user = await this.userService.findById(order.userId.toString());
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
}
