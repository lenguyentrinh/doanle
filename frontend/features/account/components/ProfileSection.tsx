'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import InputField from '@/components/InputField';
import EmailField from './EmailField';
import { AppDispatch, RootState } from '@/store/store';
import { updateProfileThunk, logoutThunk } from '@/features/auth/store/authThunk';
import { showToast } from '@/lib/toast';
import { profileSchema, type ProfileValues } from '@/features/account/validation/accountSchemas';
import { replaceWithLoader } from '@/lib/navigationLoader';

// Stitch "PERSONAL DETAILS" card: read-only by default, EDIT INFO unlocks the
// fields. Email is immutable. The single "Legal Name" maps 1:1 to `userName`.
export default function ProfileSection() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const [editing, setEditing] = useState(false);

  // Same logout path as SharedSidebar's account menu (logoutThunk + redirect
  // home) — no separate logout endpoint/hook exists for this to call instead.
  const handleLogout = async () => {
    await dispatch(logoutThunk());
    replaceWithLoader(router, '/');
  };

  const defaults = (): ProfileValues => ({
    userName: user?.userName ?? '',
    phoneNumber: user?.phoneNumber ?? '',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    mode: 'onTouched',
    resolver: zodResolver(profileSchema),
    defaultValues: defaults(),
  });

  const startEdit = () => {
    reset(defaults());
    setEditing(true);
  };
  const cancelEdit = () => {
    reset(defaults());
    setEditing(false);
  };

  const onSubmit = async (data: ProfileValues) => {
    try {
      await dispatch(
        updateProfileThunk({ userName: data.userName, phoneNumber: data.phoneNumber }),
      ).unwrap();
      showToast.success('Đã lưu thay đổi');
      setEditing(false);
    } catch (err) {
      showToast.error(err as string);
    }
  };

  return (
    <section className="motion-safe:animate-account-rise rounded-2xl bg-fill p-5 sm:p-8">
      <div className="mb-md flex items-baseline justify-between">
        <h2 className="text-headline-sm text-ink">Hồ sơ</h2>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="-my-2 border-b border-line-strong py-2 text-label-xs text-ink-secondary transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Sửa
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-md" noValidate>
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <InputField
            id="userName"
            variant="editorial"
            required
            label="Họ và tên"
            type="text"
            readOnly={!editing}
            aria-readonly={!editing}
            error={errors.userName?.message}
            {...register('userName')}
          />

          {/* Email is immutable: read-only display, truncated with a tooltip
              when the address is too long to fit. */}
          <EmailField id="email" label="Email" email={user?.email ?? ''} />

          {/* Phone spans the full row so the grid never leaves an empty cell */}
          <div className="md:col-span-2">
            <InputField
              id="phoneNumber"
              variant="editorial"
              label="Điện thoại"
              type="tel"
              readOnly={!editing}
              aria-readonly={!editing}
              error={errors.phoneNumber?.message}
              {...register('phoneNumber')}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-sm border-t border-line-strong pt-md">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-12 items-center justify-center max-sm:w-full rounded-full border border-line-strong px-6 py-3 text-label-sm text-ink-secondary transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Đăng xuất
          </button>

          {editing && (
            <div className="flex w-full flex-wrap gap-sm sm:w-auto">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSubmitting}
                className="inline-flex min-h-12 items-center justify-center px-6 py-3 text-label-sm text-ink-secondary transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[54px] flex-1 items-center justify-center rounded-full bg-ink px-8 sm:flex-none py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}
        </div>
      </form>
    </section>
  );
}
