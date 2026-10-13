"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import InputField from "@/components/InputField";
import { Spinner } from "../../AuthShell";
import { AppDispatch, RootState } from "@/store/store";
import { resetPasswordThunk } from "@/features/auth/store/authThunk";
import { showToast } from "@/lib/toast";
import { resetPasswordSchema, type ResetPasswordValues } from "@/features/auth/validation/authSchemas";
import { pushWithLoader } from "@/lib/navigationLoader";

const passwordToggleClass =
  "absolute right-0 bottom-[11px] text-[10px] before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] font-[550] uppercase tracking-[0.2em] text-ink-muted transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2";

export default function ResetPasswordForm() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const otp = searchParams.get("otp");
  const { resetPasswordLoading } = useSelector((state: RootState) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ mode: "onTouched", resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordValues) => {
    try {
      const result = await dispatch(
        resetPasswordThunk({ ...data, email: email || "", otp: otp || "" }),
      ).unwrap();
      showToast.success(result?.message || "Đã đổi mật khẩu");
      pushWithLoader(router, "/login");
    } catch (err) {
      showToast.error(err as string);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-6 gap-y-[22px] md:grid-cols-2 [&>*]:col-span-full" noValidate>
      <InputField
        id="newPassword"
        required
        variant="editorial"
        label="Mật khẩu mới"
        type={showPassword ? "text" : "password"}
        placeholder="Tối thiểu 8 ký tự"
        error={errors.newPassword?.message}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className={passwordToggleClass}
          >
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        }
        {...register("newPassword")}
      />

      <InputField
        id="confirmNewPassword"
        required
        variant="editorial"
        label="Xác nhận mật khẩu"
        type={showConfirm ? "text" : "password"}
        placeholder="Nhập lại"
        error={errors.confirmNewPassword?.message}
        trailing={
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className={passwordToggleClass}
          >
            {showConfirm ? "Ẩn" : "Hiện"}
          </button>
        }
        {...register("confirmNewPassword")}
      />

      <Button type="submit" variant="display" disabled={resetPasswordLoading}>
        {resetPasswordLoading ? "Đang lưu" : "Lưu mật khẩu"}
        {resetPasswordLoading && <Spinner />}
      </Button>
    </form>
  );
}
