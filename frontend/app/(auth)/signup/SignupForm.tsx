'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import InputField from '@/components/InputField';
import { Spinner } from '../AuthShell';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { AppDispatch, RootState } from '@/store/store';
import { signupThunk } from '@/features/auth/store/authThunk';
import { showToast } from '@/lib/toast';
import { signupSchema, type SignupValues } from '@/features/auth/validation/authSchemas';
import { pushWithLoader } from '@/lib/navigationLoader';

const passwordToggleClass =
  'absolute right-0 bottom-[11px] text-[10px] before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[""] font-[550] uppercase tracking-[0.2em] text-ink-muted transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2';

export default function SignupForm() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { signupLoading } = useSelector((state: RootState) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<SignupValues>({ mode: 'onTouched', resolver: zodResolver(signupSchema) });

  const passwordWatch = useWatch({ control, name: 'password' });

  const onSubmit = async (data: SignupValues) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropping confirmPassword from the payload sent to the API
    const { confirmPassword, ...payload } = data;
    try {
      await dispatch(signupThunk(payload)).unwrap();
      showToast.success('Kiểm tra email để lấy mã xác minh 6 số');
      pushWithLoader(router, `/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      if (err === 'Email already exists') {
        setError('email', { message: 'Email này đã được đăng ký.' });
      } else {
        showToast.error(err as string);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-6 gap-y-[22px] md:grid-cols-2 [&>*]:col-span-full" noValidate>
      {/* Name + Phone (two columns, stacked on mobile) */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
        <InputField
          id="userName"
          required
          variant="editorial"
          label="Họ và tên"
          type="text"
          placeholder="Nguyễn Thùy Linh"
          error={errors.userName?.message}
          {...register('userName')}
        />

        <InputField
          id="phoneNumber"
          variant="editorial"
          label="Số điện thoại"
          type="tel"
          placeholder="09xx xxx xxx"
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />
      </div>

      {/* Email Address */}
      <InputField
        id="email"
        required
        variant="editorial"
        label="Email"
        type="email"
        placeholder="ban@email.com"
        error={errors.email?.message}
        {...register('email')}
      />

      {/* Password + Confirm (two columns) */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
        <InputField
          id="password"
          required
          variant="editorial"
          label="Mật khẩu"
          type={showPassword ? 'text' : 'password'}
          placeholder="Tối thiểu 8 ký tự"
          error={errors.password?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className={passwordToggleClass}
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          }
          {...register('password')}
        />

        <InputField
          id="confirmPassword"
          required
          variant="editorial"
          label="Nhập lại"
          type={showConfirm ? 'text' : 'password'}
          placeholder="Nhập lại"
          error={errors.confirmPassword?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className={passwordToggleClass}
            >
              {showConfirm ? 'Ẩn' : 'Hiện'}
            </button>
          }
          {...register('confirmPassword')}
        />
      </div>

      {/* Password strength (full width, below the password row) */}
      <div>
        <PasswordStrengthIndicator password={passwordWatch ?? ''} />
      </div>

      {/* CTA */}
      <div className="pt-2">
        <Button type="submit" variant="display" disabled={signupLoading}>
          {signupLoading ? 'Đang tạo tài khoản' : 'Tạo tài khoản'}
          {signupLoading && <Spinner />}
        </Button>
      </div>
    </form>
  );
}
