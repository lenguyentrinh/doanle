import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import type { Model, Types } from 'mongoose';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';

const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const RECENT_ORDERS_LIMIT = 5;

export interface RecentOrderSummary {
  id: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  itemCount: number;
}

export interface LowStockProductSummary {
  id: string;
  name: string;
  category: string;
  stockQuantity: number;
}

export interface AdminDashboardStats {
  totalOrdersToday: number;
  pendingOrders: number;
  lowStockCount: number;
  totalRevenue: number;
  recentOrders: RecentOrderSummary[];
  lowStockProducts: LowStockProductSummary[];
  previousMonthRevenue: number;
  revenueDaily: { date: string; total: number }[];
  averageOrderValue: number;
  deliveredOrders: number;
  cancelRate: number;
  ordersTodayDelta: number;
  oldestPendingHours: number | null;
  ordersLast7Days: number[];
}

const REVENUE_DAILY_WINDOW_DAYS = 14;
const ORDERS_LAST_7_DAYS_WINDOW = 7;
const MS_PER_HOUR = 60 * 60 * 1000;

// YYYY-MM-DD from a Date's own local y/m/d fields — the boundary dates in
// this file are already built the same way (`new Date(y, m, d)`, local time),
// so this keeps revenueDaily's bucket keys consistent with them instead of
// drifting a day under toISOString()'s UTC conversion.
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Injectable()
export class AdminDashboardService {
  private readonly lowStockThreshold: number;

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    private readonly configService: ConfigService,
  ) {
    // parseInt alone accepts negative numbers and lenient-parses garbage
    // suffixes/fractions ("5abc" -> 5, "-1" -> -1) — require a plain
    // non-negative integer string (trimmed) before parsing, so a malformed
    // config value falls back to the default instead of being silently
    // misinterpreted.
    const raw = this.configService.get<string>('LOW_STOCK_THRESHOLD')?.trim();
    const parsed =
      raw !== undefined && /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
    this.lowStockThreshold = Number.isFinite(parsed)
      ? parsed
      : DEFAULT_LOW_STOCK_THRESHOLD;
  }

  async getStats(): Promise<AdminDashboardStats> {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfYesterday = new Date(
      startOfToday.getTime() - 24 * MS_PER_HOUR,
    );
    const yesterdaySameMoment = new Date(
      startOfYesterday.getTime() + (now.getTime() - startOfToday.getTime()),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalOrdersToday,
      pendingOrders,
      ordersSameMomentYesterday,
      currentMonthRevenue,
      previousMonthRevenue,
      monthlyStatusCounts,
      revenueDaily,
      oldestPendingHours,
      ordersLast7Days,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      this.countOrdersSince(startOfToday),
      this.countPendingOrders(),
      this.countOrdersInRange(startOfYesterday, yesterdaySameMoment),
      this.getRevenueStatsForMonth(startOfMonth, startOfNextMonth),
      this.getRevenueStatsForMonth(startOfPrevMonth, startOfMonth),
      this.getMonthlyStatusCounts(startOfMonth, startOfNextMonth),
      this.getRevenueDaily(now),
      this.getOldestPendingHours(now),
      this.getOrdersLast7Days(now),
      this.getRecentOrders(),
      this.getLowStockProducts(),
    ]);

    return {
      totalOrdersToday,
      pendingOrders,
      lowStockCount: lowStockProducts.length,
      totalRevenue: currentMonthRevenue.revenue,
      recentOrders,
      lowStockProducts,
      previousMonthRevenue: previousMonthRevenue.revenue,
      revenueDaily,
      averageOrderValue:
        currentMonthRevenue.orderCount > 0
          ? currentMonthRevenue.revenue / currentMonthRevenue.orderCount
          : 0,
      deliveredOrders: monthlyStatusCounts.delivered,
      cancelRate:
        monthlyStatusCounts.total > 0
          ? monthlyStatusCounts.cancelled / monthlyStatusCounts.total
          : 0,
      ordersTodayDelta: totalOrdersToday - ordersSameMomentYesterday,
      oldestPendingHours,
      ordersLast7Days,
    };
  }

  private countOrdersSince(startOfToday: Date): Promise<number> {
    return this.orderModel.countDocuments({
      createdAt: { $gte: startOfToday },
    });
  }

  private countPendingOrders(): Promise<number> {
    return this.orderModel.countDocuments({ status: OrderStatus.PENDING });
  }

  private countOrdersInRange(start: Date, end: Date): Promise<number> {
    return this.orderModel.countDocuments({
      createdAt: { $gte: start, $lt: end },
    });
  }

  // Revenue = money actually taken. `confirmedAt` being set cleanly
  // excludes `pending` (never confirmed) and `cancelled` (Story 5.4 only
  // allows cancelling a pending order, which never gets confirmedAt stamped)
  // without a separate status filter. `orderCount` (the same cohort) lets
  // callers derive an average order value without a second query.
  private async getRevenueStatsForMonth(
    start: Date,
    end: Date,
  ): Promise<{ revenue: number; orderCount: number }> {
    const [result] = await this.orderModel.aggregate<{
      sum: number;
      count: number;
    }>([
      { $match: { confirmedAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, sum: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);
    return {
      revenue: result?.sum ? Number(result.sum) : 0,
      orderCount: result?.count ? Number(result.count) : 0,
    };
  }

  // Same revenue definition as getRevenueStatsForMonth (confirmedAt-based),
  // bucketed by day for the hero chart. Backfills days with no revenue as 0
  // so the frontend always gets a dense, contiguous 14-point series. The
  // (small, windowed) result set is bucketed in JS by local calendar day so
  // the keys line up with the local-time boundaries used above.
  private async getRevenueDaily(
    now: Date,
  ): Promise<{ date: string; total: number }[]> {
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const start = new Date(
      startOfToday.getTime() -
        (REVENUE_DAILY_WINDOW_DAYS - 1) * 24 * MS_PER_HOUR,
    );

    const rows = await this.orderModel
      .find({ confirmedAt: { $gte: start } }, { confirmedAt: 1, total: 1 })
      .lean();

    const totalsByDate = new Map<string, number>();
    for (const row of rows) {
      const key = toDateKey(row.confirmedAt as Date);
      totalsByDate.set(key, (totalsByDate.get(key) ?? 0) + Number(row.total));
    }

    return Array.from({ length: REVENUE_DAILY_WINDOW_DAYS }, (_, i) => {
      const day = new Date(start.getTime() + i * 24 * MS_PER_HOUR);
      const dateKey = toDateKey(day);
      return { date: dateKey, total: totalsByDate.get(dateKey) ?? 0 };
    });
  }

  // Deliberately a different cohort than revenue: createdAt-based (orders
  // placed this month), not confirmedAt-based — a cancelled order never gets
  // confirmedAt stamped (only pending orders can be cancelled), so a
  // confirmedAt cohort could never surface a cancel rate.
  private async getMonthlyStatusCounts(
    startOfMonth: Date,
    startOfNextMonth: Date,
  ): Promise<{ total: number; delivered: number; cancelled: number }> {
    const rows = await this.orderModel.aggregate<{
      _id: OrderStatus;
      count: number;
    }>([
      { $match: { createdAt: { $gte: startOfMonth, $lt: startOfNextMonth } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    let total = 0;
    let delivered = 0;
    let cancelled = 0;
    for (const row of rows) {
      const count = Number(row.count);
      total += count;
      if (row._id === OrderStatus.DELIVERED) delivered = count;
      if (row._id === OrderStatus.CANCELLED) cancelled = count;
    }
    return { total, delivered, cancelled };
  }

  private async getOldestPendingHours(now: Date): Promise<number | null> {
    const oldest = await this.orderModel
      .findOne({ status: OrderStatus.PENDING }, { createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean();
    return oldest
      ? Math.floor((now.getTime() - oldest.createdAt.getTime()) / MS_PER_HOUR)
      : null;
  }

  // createdAt-based (order placement, not revenue) daily count for the last
  // 7 days — backs the "Đơn hôm nay" metric card's sparkline. Same dense-
  // backfill approach as getRevenueDaily so the frontend always gets exactly
  // 7 contiguous points.
  private async getOrdersLast7Days(now: Date): Promise<number[]> {
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const start = new Date(
      startOfToday.getTime() -
        (ORDERS_LAST_7_DAYS_WINDOW - 1) * 24 * MS_PER_HOUR,
    );

    const rows = await this.orderModel
      .find({ createdAt: { $gte: start } }, { createdAt: 1 })
      .lean();

    const countsByDate = new Map<string, number>();
    for (const row of rows) {
      const key = toDateKey(row.createdAt);
      countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
    }

    return Array.from({ length: ORDERS_LAST_7_DAYS_WINDOW }, (_, i) => {
      const day = new Date(start.getTime() + i * 24 * MS_PER_HOUR);
      return countsByDate.get(toDateKey(day)) ?? 0;
    });
  }

  private async getRecentOrders(): Promise<RecentOrderSummary[]> {
    const orders = await this.orderModel
      .find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(RECENT_ORDERS_LIMIT);

    return orders.map((order) => ({
      id: order.id,
      customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      itemCount: order.items.length,
    }));
  }

  // Filters to isActive products only — draft/inactive/archived products
  // aren't restock candidates (archived rows are excluded explicitly with
  // `deletedAt: null`, replacing TypeORM's implicit soft-delete scope).
  //
  // Story 5.5's planned `GET /api/admin/products/low-stock` should reuse
  // this method rather than duplicating the query.
  private async getLowStockProducts(): Promise<LowStockProductSummary[]> {
    const products = await this.productModel
      .find({
        stockQuantity: { $lte: this.lowStockThreshold },
        isActive: true,
        deletedAt: null,
      })
      .sort({ _id: 1 })
      .lean();

    const categoryIds: Types.ObjectId[] = [
      ...new Map(
        products.map((p) => [p.categoryId.toString(), p.categoryId]),
      ).values(),
    ];
    const categories = await this.categoryModel
      .find({ _id: { $in: categoryIds } }, { name: 1 })
      .lean();
    const nameById = new Map(categories.map((c) => [c._id.toString(), c.name]));

    return products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      category: nameById.get(product.categoryId.toString()) ?? '',
      stockQuantity: product.stockQuantity,
    }));
  }
}
