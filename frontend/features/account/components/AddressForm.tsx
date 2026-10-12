'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import InputField from '@/components/InputField';
import { showToast } from '@/lib/toast';
import { extractErrorMessage } from '@/lib/apiError';
import {
  getAddressesAPI,
  createAddressAPI,
  editAddressAPI,
} from '@/features/account/services/usersAPI';
import type { AddressPayload } from '@/types/user';
import { addressSchema, type AddressValues } from '@/features/account/validation/accountSchemas';

const EMPTY: AddressValues = {
  firstName: '',
  lastName: '',
  street: '',
  city: '',
  isDefault: false,
};

interface AddressFormProps {
  /** Address id to edit; null/undefined = add mode. */
  addressId?: string | null;
  /** Called after a successful create/edit (e.g. close modal, refresh list). */
  onSuccess: () => void;
  /** Called when the user dismisses the form without saving. */
  onCancel: () => void;
  /** id applied to the heading, so a dialog wrapper can aria-labelledby it. */
  titleId?: string;
}

// Add/edit address form (Stitch "Account | Addresses"), rendered inside the
// in-page AddressFormModal popup.
export default function AddressForm({
  addressId = null,
  onSuccess,
  onCancel,
  titleId,
}: AddressFormProps) {
  const isEditing = addressId !== null;
  // While editing, the form starts blank and hydrates asynchronously from
  // getAddressesAPI(); keep it disabled until that fetch resolves so the
  // user can't submit/overtype blank values that a late reset() would clobber.
  const [isLoading, setIsLoading] = useState(isEditing);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressValues>({
    mode: 'onTouched',
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY,
  });

  // In edit mode, load the target address into the form.
  useEffect(() => {
    if (!isEditing) return;
    let active = true;
    // Re-arm the loading guard if addressId changes while mounted; the
    // initial mount already starts loading via the useState initializer.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setIsLoading(true);
    getAddressesAPI()
      .then((list) => {
        if (!active) return;
        const a = list.find((x) => x.id === addressId);
        if (a) {
          reset({
            firstName: a.firstName,
            lastName: a.lastName,
            street: a.street,
            city: a.city,
            isDefault: a.isDefault,
          });
          setIsLoading(false);
        } else {
          // Address is gone (e.g. deleted in another tab): don't leave the
          // form silently blank, bail out of the modal instead.
          showToast.error('Địa chỉ này không còn tồn tại');
          onCancel();
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        showToast.error(extractErrorMessage(err, 'Không tải được địa chỉ'));
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [addressId, isEditing, reset, onCancel]);

  const onSubmit = async (data: AddressValues) => {
    try {
      if (isEditing) {
        await editAddressAPI(addressId, data as AddressPayload);
        showToast.success('Đã lưu địa chỉ');
      } else {
        await createAddressAPI(data as AddressPayload);
        showToast.success('Đã lưu địa chỉ');
      }
      onSuccess();
    } catch (err: unknown) {
      showToast.error(extractErrorMessage(err, 'Không lưu được địa chỉ'));
    }
  };

  return (
    <>
      <h2
        id={titleId}
        className="mb-md border-b border-line pb-3 pr-10 text-headline-sm text-ink"
      >
        {isEditing ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-md" noValidate>
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <InputField
            id="firstName"
            variant="editorial"
            required
            label="Họ"
            error={errors.firstName?.message}
            disabled={isLoading}
            {...register('firstName')}
          />
          <InputField
            id="lastName"
            variant="editorial"
            required
            label="Tên"
            error={errors.lastName?.message}
            disabled={isLoading}
            {...register('lastName')}
          />
        </div>

        <InputField
          id="street"
          variant="editorial"
          required
          label="Địa chỉ"
          error={errors.street?.message}
          disabled={isLoading}
          {...register('street')}
        />

        <InputField
          id="city"
          variant="editorial"
          required
          label="Tỉnh / thành phố"
          error={errors.city?.message}
          disabled={isLoading}
          {...register('city')}
        />

        <label className="flex min-h-10 items-center gap-sm">
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
            disabled={isLoading}
            {...register('isDefault')}
          />
          <span className="text-label-xs text-ink-secondary">
            Đặt làm địa chỉ giao hàng mặc định
          </span>
        </label>

        <div className="flex flex-col justify-end gap-sm border-t border-line pt-md md:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex min-h-12 items-center justify-center px-6 py-3 text-label-sm text-ink-secondary transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-ink px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu địa chỉ'}
          </button>
        </div>
      </form>
    </>
  );
}
