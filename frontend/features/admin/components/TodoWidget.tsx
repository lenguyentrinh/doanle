import Link from 'next/link';

const itemLinkClasses =
  'flex items-center justify-between gap-3.5 rounded-[11px] bg-white px-4 py-[13px] transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-[3px] hover:shadow-[0_10px_24px_-18px_rgba(150,110,78,0.6)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2';

// Every item (besides "add product") is derived from live stats, never
// hardcoded — an item disappears once its underlying count hits 0 rather
// than showing a stale "0 đơn chờ" link.
export default function TodoWidget({
  pendingOrders,
  lowStockCount,
}: {
  pendingOrders: number;
  lowStockCount: number;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl bg-fill p-5">
      <h2 className="text-label-xs text-ink-secondary">Việc cần làm</h2>
      <div className="flex flex-col gap-2">
        {pendingOrders > 0 && (
          <Link href="/admin/orders?status=pending" className={itemLinkClasses}>
            <span className="text-body-sm text-ink">Xác nhận {pendingOrders} đơn chờ</span>
            <span
              aria-hidden="true"
              className="grid size-[26px] shrink-0 place-items-center rounded-full bg-ink text-[11px] leading-none text-white"
            >
              →
            </span>
          </Link>
        )}
        {lowStockCount > 0 && (
          <Link href="/admin/products" className={itemLinkClasses}>
            <span className="text-body-sm text-ink">Nhập thêm {lowStockCount} SKU sắp hết</span>
            <span
              aria-hidden="true"
              className="grid size-[26px] shrink-0 place-items-center rounded-full bg-ink text-[11px] leading-none text-white"
            >
              →
            </span>
          </Link>
        )}
        <Link href="/admin/products/new" className={itemLinkClasses}>
          <span className="text-body-sm text-ink">Thêm sản phẩm mới</span>
          <span
            aria-hidden="true"
            className="grid size-[26px] shrink-0 place-items-center rounded-full bg-accent text-[11px] leading-none text-white"
          >
            ＋
          </span>
        </Link>
      </div>
    </div>
  );
}
