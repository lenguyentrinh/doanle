'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import InputField from '@/components/InputField';
import Button from '@/components/Button';
import { showToast } from '@/lib/toast';
import { extractErrorMessage } from '@/lib/apiError';
import {
  getAddressesAPI,
  createAddressAPI,
} from '@/features/account/services/usersAPI';
import type { Address, AddressPayload } from '@/types/user';
import { addressSchema, type AddressValues } from '@/features/account/validation/accountSchemas';
import type { CheckoutAddress } from '@/features/checkout/hooks/useCheckoutFlow';

const EMPTY: AddressValues = {
  firstName: '',
  lastName: '',
  street: '',
  city: '',
};

// Sticky, full-width action row on mobile; inline on larger screens (AC #1).
const ACTIONS_ROW =
  'sticky bottom-0 -mx-5 border-t border-line bg-paper px-5 py-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0';

interface Props {
  initialAddress: CheckoutAddress | null;
  onContinue: (address: CheckoutAddress) => void;
}

function toCheckoutAddress(a: Address): CheckoutAddress {
  return { id: a.id, firstName: a.firstName, lastName: a.lastName, street: a.street, city: a.city };
}

// Step 1 — Shipping (AC #2). A saved address already has every field checkout
// needs (no Postal Code anywhere in the app), so selecting one yields a
// complete, ready-to-submit address with no extra fields to fill in.
export default function ShippingStep({ initialAddress, onContinue }: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<'select' | 'new'>('new');
  const [selectedId, setSelectedId] = useState<string | null>(initialAddress?.id ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressValues>({
    mode: 'onTouched',
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    let active = true;
    getAddressesAPI()
      .then((list) => {
        if (!active) return;
        setAddresses(list);
        if (list.length > 0) {
          setMode('select');
          setSelectedId((prev) => prev ?? list.find((a) => a.isDefault)?.id ?? list[0].id);
        }
      })
      .catch((err: unknown) =>
        showToast.error(extractErrorMessage(err, 'Không tải được địa chỉ đã lưu')),
      )
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectContinue = () => {
    const selected = addresses.find((a) => a.id === selectedId);
    if (!selected) return;
    onContinue(toCheckoutAddress(selected));
  };

  const onSubmitNew = async (data: AddressValues) => {
    try {
      const created = await createAddressAPI(data as AddressPayload);
      onContinue(toCheckoutAddress(created));
    } catch (err: unknown) {
      showToast.error(extractErrorMessage(err, 'Không lưu được địa chỉ'));
    }
  };

  if (!loaded) {
    return <p className="text-body-md text-ink-muted">Đang tải địa chỉ của bạn...</p>;
  }

  return (
    <div className="flex flex-col gap-md">
      <h2 className="text-headline-md text-ink">Địa chỉ giao hàng</h2>

      {mode === 'select' && (
        <div className="flex flex-col gap-md">
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex min-w-0 cursor-pointer flex-col gap-1 break-words rounded-[12px] border bg-white p-4 sm:p-5 transition-colors duration-200 ${
                  selectedId === a.id ? 'border-accent bg-fill' : 'border-line hover:border-line-strong'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="savedAddress"
                    className="h-[18px] w-[18px] border-line-strong accent-accent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                    checked={selectedId === a.id}
                    onChange={() => setSelectedId(a.id)}
                  />
                  <span className="text-body-sm text-ink">
                    {a.firstName} {a.lastName}
                  </span>
                </span>
                <span className="pl-[26px] text-body-sm text-ink-secondary">{a.street}</span>
                <span className="pl-[26px] text-body-sm text-ink-secondary">{a.city}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMode('new')}
            className="-my-2 w-fit max-sm:w-full max-sm:text-center border-b border-line-strong py-2 text-label-sm text-ink transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Thêm địa chỉ mới
          </button>
          <div className={ACTIONS_ROW}>
            <Button
              type="button"
              variant="primary"
              className="w-full sm:w-fit"
              disabled={selectedId === null}
              onClick={handleSelectContinue}
            >
              Tiếp tục
            </Button>
          </div>
        </div>
      )}

      {mode === 'new' && (
        <form onSubmit={handleSubmit(onSubmitNew)} className="flex flex-col gap-md" noValidate>
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <InputField
              id="firstName"
              variant="editorial"
              required
              label="Họ"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <InputField
              id="lastName"
              variant="editorial"
              required
              label="Tên"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <InputField
            id="street"
            variant="editorial"
            required
            label="Địa chỉ"
            error={errors.street?.message}
            {...register('street')}
          />

          <InputField
            id="city"
            variant="editorial"
            required
            label="Tỉnh / thành phố"
            error={errors.city?.message}
            {...register('city')}
          />

          <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setMode('select')}
                className="-my-2 w-fit max-sm:w-full max-sm:text-center border-b border-line py-2 text-label-sm text-ink-secondary transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Dùng địa chỉ đã lưu
              </button>
            )}
            <div className={`${ACTIONS_ROW} sm:ml-auto`}>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full sm:w-fit">
                {isSubmitting ? 'Đang lưu...' : 'Tiếp tục'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
