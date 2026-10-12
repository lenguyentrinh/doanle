'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDate, formatPrice, isObjectId } from '@/lib/helpers';
import { showToast } from '@/lib/toast';
import {
  getAdminOrderByIdAPI,
  updateAdminOrderStatusAPI,
  cancelAdminOrderAPI,
  type AdminOrderDetail,
} from '@/features/admin/services/adminAPI';
import type { OrderStatus } from '@/features/orders/services/ordersAPI';
import OrderStatusBadge from '@/features/orders/components/OrderStatusBadge';
import OrderStatusTimeline from '@/features/orders/components/OrderStatusTimeline';
import AdminConfirmDialog from '@/features/admin/components/AdminConfirmDialog';

// The backend `:id` is Mongo ObjectId — same numeric guard as the
// shopper order pages.
const isValidId = isObjectId; // route ids are Mongo ObjectIds

// Forward-only transition the admin can trigger from each status. Mirrors the
// backend FORWARD_STATUSES contract exactly (pending → confirmed → shipped →
// delivered); delivered/cancelled have no further action. Labels are the
// admin action, not the COD stage name, to read as a clear next step.
const NEXT_ACTION: Partial<
  Record<OrderStatus, { next: OrderStatus; label: string }>
> = {
  pending: { next: 'confirmed', label: 'Xác nhận đơn' },
  confirmed: { next: 'shipped', label: 'Đánh dấu đang giao' },
  shipped: { next: 'delivered', label: 'Đánh dấu đã giao' },
};

type ViewState = 'loading' | 'ready' | 'not-found';

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const validId = isValidId(id);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [state, setState] = useState<ViewState>('loading');
  const [acting, setActing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const load = useCallback(() => {
    if (!validId) {
      setState('not-found');
      return;
    }
    getAdminOrderByIdAPI(id)
      .then((result) => {
        setOrder(result);
        setState('ready');
      })
      .catch(() => setState('not-found'));
  }, [id, validId]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async (next: OrderStatus) => {
    if (acting || !order) return;
    setActing(true);
    try {
      await updateAdminOrderStatusAPI(order.id, next);
      showToast.success('Đã cập nhật trạng thái đơn hàng');
      load();
    } catch {
      showToast.error('Không cập nhật được trạng thái đơn hàng');
    } finally {
      setActing(false);
    }
  };

  const confirmCancel = async () => {
    if (acting || !order) return;
    setActing(true);
    try {
      await cancelAdminOrderAPI(order.id);
      showToast.success('Đã hủy đơn hàng');
      load();
    } catch {
      showToast.error('Không hủy được đơn hàng');
    } finally {
      setActing(false);
      setConfirmingCancel(false);
    }
  };

  if (state === 'loading') {
    return (
      <p className="py-12 text-center text-body-md text-ink-muted">
        Đang tải đơn hàng…
      </p>
    );
  }

  if (state === 'not-found' || !order) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <h1 className="text-display-md text-ink">
          Không tìm thấy đơn hàng
        </h1>
        <Link
          href="/admin/orders"
          className="border-b border-line-strong pb-0.5 text-label-sm text-ink transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Về danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const nextAction = NEXT_ACTION[order.status];
  const canCancel = order.status === 'pending';
  const customerName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;

  return (
    <div className="mx-auto flex w-full flex-col gap-[22px]">
      <Link
        href="/admin/orders"
        className="inline-flex w-fit items-center gap-2 text-body-sm text-ink-muted transition-colors duration-200 hover:text-accent"
      >
        <span aria-hidden="true">←</span> Về danh sách đơn hàng
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-label-xs text-accent">Đơn #{order.id}</span>
            <span aria-hidden="true" className="h-px w-3.5 bg-line-strong" />
            <span className="text-body-sm text-ink-muted">{formatDate(order.createdAt)}</span>
          </div>
          <h1 className="text-display-md text-ink">{customerName}</h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <div className="grid grid-cols-[1.6fr_1fr] items-start gap-6">
        <div className="flex flex-col gap-5">
          <section aria-label="Trạng thái đơn hàng" className="rounded-[18px] border border-line bg-white p-7">
            <OrderStatusTimeline order={order} />
          </section>

          <section aria-label="Sản phẩm" className="rounded-[18px] border border-line bg-white p-7">
            <h2 className="mb-3 font-display text-[18px] text-ink">Sản phẩm</h2>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 border-t border-line py-3.5 first:border-t-0">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-fill">
                  {item.productImageUrl && (
                    <Image
                      src={item.productImageUrl}
                      alt={item.productName}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-display text-[15px] text-ink">{item.productName}</p>
                  <p className="text-body-sm text-ink-muted">Số lượng {item.quantity}</p>
                </div>
                <span className="text-body-sm tabular-nums text-ink">{formatPrice(item.price)}</span>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-2 gap-5">
            <section aria-label="Khách hàng" className="rounded-[18px] border border-line bg-white p-7">
              <h2 className="mb-2.5 font-display text-[16px] text-ink">Khách hàng</h2>
              <p className="text-body-sm text-ink">{customerName}</p>
              {order.customerEmail && (
                <p className="mt-0.5 text-body-sm text-ink-secondary">{order.customerEmail}</p>
              )}
              {order.customerPhone && (
                <p className="mt-0.5 text-body-sm text-ink-secondary">{order.customerPhone}</p>
              )}
              <p className="mt-3 text-caption text-ink-muted">
                COD ·{' '}
                {order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </p>
            </section>

            <section aria-label="Giao đến" className="rounded-[18px] border border-line bg-white p-7">
              <h2 className="mb-2.5 font-display text-[16px] text-ink">Giao đến</h2>
              <address className="flex flex-col gap-0.5 text-body-sm not-italic text-ink-secondary">
                <span>{order.shippingAddress.street}</span>
                <span>{order.shippingAddress.city}</span>
              </address>
            </section>
          </div>
        </div>

        <div className="sticky top-9 flex flex-col gap-4">
          {/* Admin actions: forward-only status advance + pending-only cancel. */}
          {(nextAction || canCancel) && (
            <section aria-label="Hành động" className="flex flex-col gap-2.5 rounded-[18px] bg-ink p-6">
              <span className="text-label-xs text-white/50">Hành động</span>
              {nextAction && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => advance(nextAction.next)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-6 py-2.5 text-label-sm text-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {nextAction.label}
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => setConfirmingCancel(true)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/25 bg-transparent px-6 py-2.5 text-label-sm text-white/80 transition-colors duration-200 hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy đơn
                </button>
              )}
            </section>
          )}

          <section aria-label="Hoá đơn" className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-6">
            <span className="text-label-xs text-ink-secondary">Hoá đơn</span>
            <div className="flex justify-between text-body-sm text-ink-secondary">
              <span>Tạm tính</span>
              <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-body-sm text-ink-secondary">
              <span>Vận chuyển</span>
              <span className="tabular-nums">{formatPrice(order.shippingFee)}</span>
            </div>
            <div className="flex justify-between text-body-sm text-ink-secondary">
              <span>VAT</span>
              <span className="tabular-nums">{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-line-strong pt-3">
              <span className="whitespace-nowrap font-display text-[16px] text-ink">Tổng cộng</span>
              <span className="whitespace-nowrap font-display text-[20px] tabular-nums text-ink">
                {formatPrice(order.total)}
              </span>
            </div>
          </section>
        </div>
      </div>

      <AdminConfirmDialog
        open={confirmingCancel}
        actionLabel="Huỷ đơn hàng"
        title={`Đơn #${order.id}`}
        description="Không thể hoàn tác."
        confirmLabel="Huỷ đơn"
        cancelLabel="Giữ đơn"
        onConfirm={confirmCancel}
        onCancel={() => setConfirmingCancel(false)}
      />
    </div>
  );
}
