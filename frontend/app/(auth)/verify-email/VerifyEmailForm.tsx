'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import Button from '@/components/Button';
import InputField from '@/components/InputField';
import { Spinner } from '../AuthShell';
import { AppDispatch, RootState } from '@/store/store';
import { verifyEmailThunk, sendOtpThunk } from '@/features/auth/store/authThunk';
import { showToast } from '@/lib/toast';
import { verifyEmailSchema, type VerifyEmailValues } from '@/features/auth/validation/authSchemas';

export default function VerifyEmailForm() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const email = useSearchParams().get('email');
  const { verifyEmailLoading } = useSelector((state: RootState) => state.auth);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<VerifyEmailValues>({ mode: 'onTouched', resolver: zodResolver(verifyEmailSchema) });

  const onSubmit = async (data: VerifyEmailValues) => {
    if (!email) {
      setError('code', { message: 'Thiếu email. Vui lòng đăng ký lại.' });
      return;
    }
    try {
      await dispatch(verifyEmailThunk({ code: data.code, email })).unwrap();
      showToast.success('Xác minh thành công. Bạn có thể đăng nhập ngay.');
      router.push('/login');
    } catch {
      setError('code', { message: 'Mã không đúng hoặc đã hết hạn. Vui lòng thử lại.' });
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await dispatch(sendOtpThunk({ email })).unwrap();
      showToast.success(`Đã gửi lại mã tới ${email}`);
    } catch {
      showToast.error('Không gửi lại được mã. Vui lòng thử lại.');
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-6 gap-y-[22px] md:grid-cols-2 [&>*]:col-span-full">
      {email && (
        <p className="rounded-xl bg-fill px-4 py-3 text-[13.5px] leading-[1.5] text-ink-secondary">
          Đã gửi mã 6 số tới <span className="break-all font-semibold text-ink">{email}</span>
        </p>
      )}

      <InputField
        id="code"
        required
        variant="editorial"
        label="Mã xác minh"
        type="text"
        placeholder="123456"
        inputMode="numeric"
        maxLength={6}
        error={errors.code?.message}
        className="font-display text-[30px] leading-[1.3] tracking-[0.34em]"
        {...register('code')}
      />

      <Button type="submit" variant="display" disabled={verifyEmailLoading}>
        {verifyEmailLoading ? 'Đang xác minh' : 'Xác minh'}
        {verifyEmailLoading && <Spinner />}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="py-2 text-body-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-200 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {resending ? 'Đang gửi lại...' : 'Gửi lại mã'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="py-2 text-body-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-200 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Huỷ
        </button>
      </div>

      <p className="text-caption text-ink-muted">
        Không thấy email? Kiểm tra thư mục spam hoặc bấm Gửi lại mã.
      </p>
    </form>
  );
}
