'use client';

import { useEffect, useState } from 'react';
import { formatDateVi } from '@/lib/helpers';
import {
  getAdminDashboardStatsAPI,
  type AdminDashboardStats,
} from '@/features/admin/services/adminAPI';
import MetricCard from '@/features/admin/components/MetricCard';
import RevenueHeroPanel from '@/features/admin/components/RevenueHeroPanel';
import RecentOrdersWidget from '@/features/admin/components/RecentOrdersWidget';
import LowStockWidget from '@/features/admin/components/LowStockWidget';
import TodoWidget from '@/features/admin/components/TodoWidget';

// No SEO need (admin, auth-gated) — Client Component per architecture's
// Frontend Architecture table. The server-side gate lives in layout.tsx;
// this page assumes it already ran and doesn't re-check auth.
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAdminDashboardStatsAPI()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="text-body-md text-ink-muted">
        Không tải được dữ liệu bảng điều khiển. Vui lòng thử lại sau.
      </p>
    );
  }

  if (!stats) {
    return <p className="text-body-md text-ink-muted">Đang tải bảng điều khiển...</p>;
  }

  // Normalize the real 7-day order-count series to 0..1 for MetricCard's
  // sparkline (tallest bar = 1). All-zero week -> flat sparkline, not NaN.
  const ordersPeak = Math.max(0, ...stats.ordersLast7Days);
  const ordersSpark =
    ordersPeak > 0 ? stats.ordersLast7Days.map((v) => v / ordersPeak) : stats.ordersLast7Days.map(() => 0);

  return (
    <div className="mx-auto flex w-full flex-col gap-5">
      <div
        className="flex flex-wrap items-end justify-between gap-4 motion-safe:animate-[rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]"
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-label-xs text-accent">Quản trị</span>
          <h1 className="font-display text-[clamp(30px,3.4vw,46px)] leading-[1.04] tracking-[-0.02em] text-ink">
            Bảng điều khiển
          </h1>
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-line px-3.5 py-2 max-sm:w-full max-sm:justify-center">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-success motion-safe:animate-admin-pulse"
          />
          <span className="text-caption text-ink-secondary">
            Cập nhật {formatDateVi(new Date())}
          </span>
        </div>
      </div>

      <div
        className="motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ animationDelay: '0.04s' }}
      >
        <RevenueHeroPanel
          revenue={stats.totalRevenue}
          previousMonthRevenue={stats.previousMonthRevenue}
          daily={stats.revenueDaily}
          averageOrderValue={stats.averageOrderValue}
          deliveredOrders={stats.deliveredOrders}
          cancelRate={stats.cancelRate}
        />
      </div>

      <div
        className="grid grid-cols-1 gap-3.5 min-[640px]:grid-cols-2 min-[1040px]:grid-cols-3 motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ animationDelay: '0.1s' }}
      >
        <MetricCard
          label="Đơn hôm nay"
          value={stats.totalOrdersToday}
          chip={`${stats.ordersTodayDelta >= 0 ? '↑' : '↓'} ${Math.abs(stats.ordersTodayDelta)}`}
          chipTone={stats.ordersTodayDelta >= 0 ? 'success' : 'alert'}
          note="so với cùng giờ hôm qua"
          spark={ordersSpark}
        />
        <MetricCard
          label="Đơn chờ xử lý"
          value={stats.pendingOrders}
          tone="alert"
          chip="Chờ xác nhận"
          chipTone="alert"
          note={stats.oldestPendingHours != null ? `chờ lâu nhất ${stats.oldestPendingHours} giờ` : undefined}
        />
        <MetricCard
          label="SKU sắp hết"
          value={stats.lowStockCount}
          note="cần nhập trong tuần này"
        />
      </div>

      <div
        className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[1.55fr_1fr] motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
        style={{ animationDelay: '0.16s' }}
      >
        <RecentOrdersWidget orders={stats.recentOrders} />
        <div className="flex flex-col gap-4">
          <LowStockWidget products={stats.lowStockProducts} />
          <TodoWidget pendingOrders={stats.pendingOrders} lowStockCount={stats.lowStockCount} />
        </div>
      </div>
    </div>
  );
}
