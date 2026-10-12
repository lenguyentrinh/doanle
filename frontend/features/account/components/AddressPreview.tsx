'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { showToast } from '@/lib/toast';
import { extractErrorMessage } from '@/lib/apiError';
import {
  getAddressesAPI,
  deleteAddressAPI,
  setDefaultAddressAPI,
} from '@/features/account/services/usersAPI';
import type { Address } from '@/types/user';
import AddressFormModal from './AddressFormModal';

// Stitch "SAVED SHIPPING ADDRESSES": 3-col grid of hairline-bordered blocks
// with quiet edit/delete text links, a DEFAULT marker / SET AS DEFAULT action,
// and an add block. Add/edit open AddressFormModal in-page (no navigation away).
export default function AddressPreview() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(() => {
    getAddressesAPI()
      .then(setAddresses)
      .catch((err: unknown) =>
        showToast.error(extractErrorMessage(err, 'Không tải được địa chỉ')),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditId(null);
    setFormOpen(true);
  };
  const openEdit = (id: string) => {
    setEditId(id);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddressAPI(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast.success('Đã xoá địa chỉ');
    } catch (err: unknown) {
      showToast.error(extractErrorMessage(err, 'Không xoá được địa chỉ'));
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const list = await setDefaultAddressAPI(id);
      setAddresses(list);
      showToast.success('Đã đặt làm địa chỉ mặc định');
    } catch (err: unknown) {
      showToast.error(extractErrorMessage(err, 'Không cập nhật được địa chỉ mặc định'));
    }
  };

  return (
    <section id="addresses" className="motion-safe:animate-account-rise mt-10 border-t border-line py-10">
      <div className="mb-md flex items-baseline justify-between">
        <h2 className="text-headline-sm text-ink">Địa chỉ</h2>
        <span className="text-body-sm tabular-nums text-ink-muted">{addresses.length} đã lưu</span>
      </div>

      <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
        {addresses.map((a) => (
          <div
            key={a.id}
            className={`flex min-h-[180px] flex-col justify-between rounded-[12px] border bg-white p-6 transition-colors duration-200 ${
              a.isDefault ? 'border-accent' : 'border-line hover:border-line-strong'
            }`}
          >
            <div>
              <div className="mb-sm flex items-center justify-between">
                {a.isDefault ? (
                  <span className="inline-flex w-fit items-center rounded-full bg-accent px-3 py-1 text-label-xs text-white">
                    Mặc định
                  </span>
                ) : (
                  <span />
                )}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => openEdit(a.id)}
                    aria-label={`Sửa địa chỉ ${a.street}`}
                    className="border-b border-line-strong pb-0.5 text-label-xs text-ink-secondary transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    aria-label={`Xoá địa chỉ ${a.street}`}
                    className="border-b border-line-strong pb-0.5 text-label-xs text-ink-secondary transition-all duration-200 hover:border-error hover:text-error-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    Xoá
                  </button>
                </div>
              </div>
              <p className="text-body-sm text-ink">
                {a.firstName} {a.lastName}
              </p>
              <address className="mt-xs space-y-0.5 not-italic text-body-sm text-ink-secondary">
                <span className="block">{a.street}</span>
                <span className="block">{a.city}</span>
              </address>
            </div>

            {!a.isDefault && (
              <button
                type="button"
                onClick={() => handleSetDefault(a.id)}
                className="mt-sm w-fit text-left text-label-xs text-ink-muted transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Đặt làm mặc định
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={openAdd}
          className="flex min-h-[180px] w-full flex-col items-center justify-center gap-sm rounded-[12px] border border-dashed border-line-strong p-6 text-ink-secondary transition-all duration-200 hover:border-accent hover:bg-fill hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <FiPlus size={24} aria-hidden="true" />
          <span className="text-label-sm">Thêm địa chỉ mới</span>
        </button>
      </div>

      {formOpen && (
        <AddressFormModal
          addressId={editId}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
    </section>
  );
}
