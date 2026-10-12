import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';

const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const RECENT_ORDERS_LIMIT = 5;

export interface RecentOrderSummary {
  id: number;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  itemCount: number;
}

export interface LowStockProductSummary {
  id: number;
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
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
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
    return this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :startOfToday', { startOfToday })
      .getCount();
  }

  private countPendingOrders(): Promise<number> {
    return this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.PENDING })
      .getCount();
  }

  private countOrdersInRange(start: Date, end: Date): Promise<number> {
    return this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :start', { start })
      .andWhere('order.createdAt < :end', { end })
      .getCount();
  }

  // Revenue = money actually taken. `confirmedAt IS NOT NULL` cleanly
  // excludes `pending` (never confirmed) and `cancelled` (Story 5.4 only
  // allows cancelling a pending order, which never gets confirmedAt stamped)
  // without a separate status filter. `orderCount` (the same cohort) lets
  // callers derive an average order value without a second query.
  private async getRevenueStatsForMonth(
    start: Date,
    end: Date,
  ): Promise<{ revenue: number; orderCount: number }> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'sum')
      .addSelect('COUNT(*)', 'count')
      .where('order.confirmedAt IS NOT NULL')
      .andWhere('order.confirmedAt >= :start', { start })
      .andWhere('order.confirmedAt < :end', { end })
      .getRawOne<{ sum: string | null; count: string }>();
    return {
      revenue: result?.sum ? Number(result.sum) : 0,
      orderCount: result?.count ? Number(result.count) : 0,
    };
  }

  // Same revenue definition as getRevenueStatsForMonth (confirmedAt-based),
  // bucketed by day for the hero chart. Backfills days with no revenue as 0
  // so the frontend always gets a dense, contiguous 14-point series.
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

    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.confirmedAt)', 'date')
      .addSelect('SUM(order.total)', 'total')
      .where('order.confirmedAt IS NOT NULL')
      .andWhere('order.confirmedAt >= :start', { start })
      .groupBy('DATE(order.confirmedAt)')
      .getRawMany<{ date: string; total: string | null }>();

    const totalsByDate = new Map(
      rows.map((row) => [
        toDateKey(new Date(row.date)),
        Number(row.total ?? 0),
      ]),
    );

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
    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.createdAt >= :startOfMonth', { startOfMonth })
      .andWhere('order.createdAt < :startOfNextMonth', { startOfNextMonth })
      .groupBy('order.status')
      .getRawMany<{ status: OrderStatus; count: string }>();

    let total = 0;
    let delivered = 0;
    let cancelled = 0;
    for (const row of rows) {
      const count = Number(row.count);
      total += count;
      if (row.status === OrderStatus.DELIVERED) delivered = count;
      if (row.status === OrderStatus.CANCELLED) cancelled = count;
    }
    return { total, delivered, cancelled };
  }

  private async getOldestPendingHours(now: Date): Promise<number | null> {
    const oldest = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.PENDING })
      .orderBy('order.createdAt', 'ASC')
      .getOne();
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

    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('order.createdAt >= :start', { start })
      .groupBy('DATE(order.createdAt)')
      .getRawMany<{ date: string; count: string }>();

    const countsByDate = new Map(
      rows.map((row) => [toDateKey(new Date(row.date)), Number(row.count)]),
    );

    return Array.from({ length: ORDERS_LAST_7_DAYS_WINDOW }, (_, i) => {
      const day = new Date(start.getTime() + i * 24 * MS_PER_HOUR);
      return countsByDate.get(toDateKey(day)) ?? 0;
    });
  }

  private async getRecentOrders(): Promise<RecentOrderSummary[]> {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .loadRelationCountAndMap('order.itemCount', 'order.items')
      .orderBy('order.createdAt', 'DESC')
      .take(RECENT_ORDERS_LIMIT)
      .getMany();

    return orders.map((order) => ({
      id: order.id,
      customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      itemCount: (order as Order & { itemCount: number }).itemCount,
    }));
  }

  // Filters to isActive products only — draft/inactive/archived products
  // aren't restock candidates. Soft-deleted rows (`deletedAt`) are excluded
  // automatically by TypeORM's default query-builder behavior, same as
  // ProductsService.findAll — no explicit `deletedAt IS NULL` needed.
  //
  // Story 5.5's planned `GET /api/admin/products/low-stock` should reuse
  // this method rather than duplicating the query.
  private async getLowStockProducts(): Promise<LowStockProductSummary[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.stockQuantity <= :threshold', {
        threshold: this.lowStockThreshold,
      })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .getMany();

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category.name,
      stockQuantity: product.stockQuantity,
    }));
  }
}
