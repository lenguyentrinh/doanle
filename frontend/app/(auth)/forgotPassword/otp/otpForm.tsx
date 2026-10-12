"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import InputField from "@/components/InputField";
import { Spinner } from "../../AuthShell";
import { AppDispatch, RootState } from "@/store/store";
import { verifyOtpThunk, sendOtpThunk } from "@/features/auth/store/authThunk";
import { showToast } from "@/lib/toast";
import { forgotOtpSchema, type ForgotOtpValues } from "@/features/auth/validation/authSchemas";

const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpForm() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const { verifyOtpLoading } = useSelector((state: RootState) => state.auth);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<ForgotOtpValues>({ mode: "onTouched", resolver: zodResolver(forgotOtpSchema) });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = async (data: ForgotOtpValues) => {
    try {
      const result = await dispatch(
        verifyOtpThunk({ ...data, email: email || "" }),
      ).unwrap();
      showToast.success(result?.message || "Xác minh thành công");
      // Thread the OTP to the reset step so it can be re-verified server-side.
      router.push(
        `/forgotPassword/reset?email=${encodeURIComponent(
          email || "",
        )}&otp=${encodeURIComponent(data.otp)}`,
      );
    } catch (err) {
      showToast.error(err as string);
    }
  };

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    try {
      const result = await dispatch(sendOtpThunk({ email })).unwrap();
      showToast.success(result?.message || `Đã gửi lại mã tới ${email}`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      showToast.error(err as string);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-6 gap-y-[22px] md:grid-cols-2 [&>*]:col-span-full" noValidate>
      {email && (
        <p className="rounded-xl bg-fill px-4 py-3 text-[13.5px] leading-[1.5] text-ink-secondary">
          Đã gửi mã tới <span className="break-all font-semibold text-ink">{email}</span>
        </p>
      )}

      <InputField
        id="otp"
        required
        variant="editorial"
        label="Mã xác minh"
        type="text"
        placeholder="123456"
        inputMode="numeric"
        maxLength={6}
        error={errors.otp?.message}
        className="font-display text-[30px] leading-[1.3] tracking-[0.34em]"
        {...register("otp")}
      />

      <button
        type="button"
        onClick={handleResend}
        disabled={resending || cooldown > 0 || !email}
        className="self-start py-2 text-body-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-200 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {resending
          ? "Đang gửi lại..."
          : cooldown > 0
            ? `Gửi lại mã (${cooldown}s)`
            : "Gửi lại mã"}
      </button>

      <p className="text-caption text-ink-muted">
        Không thấy email? Kiểm tra thư mục spam hoặc bấm Gửi lại mã.
      </p>

      <Button type="submit" variant="display" disabled={verifyOtpLoading}>
        {verifyOtpLoading ? "Đang xác minh" : "Xác minh mã"}
        {verifyOtpLoading && <Spinner />}
      </Button>
    </form>
  );
}
