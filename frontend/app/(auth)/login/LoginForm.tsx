"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import InputField from "@/components/InputField";
import { Spinner } from "../AuthShell";
import ForgotPasswordTag from "../ForgotPasswordTag";
import { AppDispatch, RootState } from "@/store/store";
import { loginThunk } from "@/features/auth/store/authThunk";
import { showToast } from "@/lib/toast";
import { loginSchema, type LoginValues } from "@/features/auth/validation/authSchemas";

export default function LoginForm() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnParam = searchParams.get("return");
  // Only allow same-origin, single-slash paths. Reject protocol-relative
  // (`//evil.com`), backslash (`/\evil.com`) and self-redirects to `/login`.
  const isSafeReturn =
    !!returnParam &&
    returnParam.startsWith("/") &&
    !returnParam.startsWith("//") &&
    !returnParam.startsWith("/\\") &&
    returnParam !== "/login" &&
    !returnParam.startsWith("/login?");
  const safeReturn = isSafeReturn ? returnParam : "/";
  const { loginLoading } = useSelector((state: RootState) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  // `?forgot=1` (redirect from the legacy /forgotPassword URL) opens the hang tag on mount.
  const [tagOpen, setTagOpen] = useState(searchParams.get("forgot") === "1");
  const [tagEmail, setTagEmail] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    resetField,
    getValues,
    formState: { errors },
  } = useForm<LoginValues>({ mode: "onTouched", resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginValues) => {
    try {
      await dispatch(loginThunk(data)).unwrap();
      showToast.success("Đăng nhập thành công");
      router.push(safeReturn);
    } catch (err) {
      // err is the rejectWithValue string from the thunk
      resetField("password");
      let message: string;
      if (err === "Email chưa được xác thực") {
        message = "Vui lòng xác minh email trước.";
      } else if (err === "Thông tin đăng nhập không hợp lệ") {
        message = "Email hoặc mật khẩu không đúng.";
      } else {
        // network failure, timeout, 5xx (incl. 429 rate limit), or any unexpected rejection
        message = "Đã có lỗi xảy ra. Vui lòng thử lại.";
      }
      setError("password", { message });
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-6 gap-y-[22px] md:grid-cols-2 [&>*]:col-span-full" noValidate>
      <InputField
        id="email"
        required
        variant="editorial"
        label="Email"
        type="email"
        placeholder="ban@email.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <div className="flex flex-col gap-[7px]">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="password" className="text-label-xs text-ink-muted">
            Mật khẩu<span className="text-error-strong"> *</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setTagEmail(getValues("email") ?? "");
              setTagOpen(true);
            }}
            className="-my-2 py-2 text-[12.5px] text-ink-muted transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Quên mật khẩu?
          </button>
        </div>
        <InputField
          id="password"
          required
          variant="editorial"
          type={showPassword ? "text" : "password"}
          placeholder="Mật khẩu của bạn"
          error={errors.password?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-0 bottom-[11px] text-[10px] before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] font-[550] uppercase tracking-[0.2em] text-ink-muted transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          }
          {...register("password")}
        />
      </div>

      <div className="pt-2">
        <Button type="submit" variant="display" disabled={loginLoading}>
          {loginLoading ? "Đang đăng nhập" : "Đăng nhập"}
          {loginLoading && <Spinner />}
        </Button>
      </div>
    </form>
    <ForgotPasswordTag open={tagOpen} onClose={() => setTagOpen(false)} defaultEmail={tagEmail} />
    </>
  );
}
