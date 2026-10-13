"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/Button";
import InputField from "@/components/InputField";
import { Spinner } from "./AuthShell";
import { AppDispatch, RootState } from "@/store/store";
import { sendOtpThunk } from "@/features/auth/store/authThunk";
import { showToast } from "@/lib/toast";
import { forgotEmailSchema, type ForgotEmailValues } from "@/features/auth/validation/authSchemas";
import { pushWithLoader } from "@/lib/navigationLoader";

const LEAVE_MS = 450;
const TAG_WIDTH = "min(420px,calc(100vw - 32px))";
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Prefill for the email field (login passes whatever the user already typed). */
  defaultEmail?: string;
};

// "Hang tag" modal for the first step of password recovery. Shared by login
// ("Quên mật khẩu?") and the OTP page ("Sai email? Nhập lại"). The dialog is
// only mounted while `open`, so its form state resets on every open.
export default function ForgotPasswordTag({ open, onClose, defaultEmail }: Props) {
  if (!open) return null;
  return <TagDialog onClose={onClose} defaultEmail={defaultEmail} />;
}

function TagDialog({ onClose, defaultEmail }: Omit<Props, "open">) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();
  const { sendOtpLoading } = useSelector((state: RootState) => state.auth);
  const [leaving, setLeaving] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Portal to <body>: the auth content column runs a transform animation,
  // which would otherwise become the containing block of our `fixed` layers.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(() => setMounted(true), []);

  const {
    handleSubmit,
    register,
    setFocus,
    formState: { errors },
  } = useForm<ForgotEmailValues>({
    mode: "onTouched",
    resolver: zodResolver(forgotEmailSchema),
    defaultValues: { email: defaultEmail ?? "" },
  });

  // Play the "fly up" animation, then tell the parent to unmount us.
  const requestClose = () => setLeaving(true);
  // Pressing a close control must not blur the email input, or onTouched
  // validation flashes "Email không được để trống" before the tag leaves.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  useLayoutEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(onClose, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving, onClose]);

  // Focus the email field on open; give focus back to the opener on close.
  useLayoutEffect(() => {
    if (!mounted) return;
    const opener = document.activeElement as HTMLElement | null;
    setFocus("email");
    return () => opener?.focus?.();
  }, [mounted, setFocus]);

  // The page scroll container is <html>, so lock that rather than <body>.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== "Tab" || !wrapperRef.current) return;
    const items = Array.from(wrapperRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // On /login the tag sits over the login form, so closing is enough; on the
  // OTP page "Đăng nhập" has to actually navigate there.
  const goToLogin = () => {
    if (pathname !== "/login") pushWithLoader(router, "/login");
    requestClose();
  };

  const onSubmit = async (data: ForgotEmailValues) => {
    try {
      const result = await dispatch(sendOtpThunk(data)).unwrap();
      showToast.success(result?.message || "Đã gửi mã xác minh");
      requestClose();
      pushWithLoader(router, "/forgotPassword/otp?email=" + encodeURIComponent(data.email));
    } catch (err) {
      showToast.error(err as string);
    }
  };

  const straight = inputFocused || sendOtpLoading;
  const tilt = straight ? "rotate(0deg)" : "rotate(-2deg)";

  if (!mounted) return null;

  return createPortal(
    <div onKeyDown={onKeyDown}>
      <div
        aria-hidden
        onMouseDown={keepFocus}
        onClick={requestClose}
        className={`fixed inset-0 z-50 bg-[rgba(47,37,30,.38)] motion-reduce:animate-none ${
          leaving ? "motion-safe:animate-fade-out" : "motion-safe:animate-fade-in"
        }`}
      />

      <div
        ref={wrapperRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-title"
        style={{ width: TAG_WIDTH, marginLeft: `calc(${TAG_WIDTH} / -2)` }}
        className={`fixed left-1/2 top-6 z-[51] sm:top-10 origin-top md:top-16 motion-reduce:animate-none ${
          leaving ? "motion-safe:animate-tag-up" : "motion-safe:animate-tag-drop"
        }`}
      >
        <div
          className="origin-[50%_29px] transition-transform duration-[900ms] ease-[cubic-bezier(0.34,1.4,0.5,1)] motion-reduce:transition-none"
          style={{ transform: tilt, filter: "drop-shadow(0 30px 40px rgba(47,37,30,.28))" }}
        >
          {/* String */}
          <span
            aria-hidden
            className="absolute left-[calc(50%-0.75px)] top-[calc(29px-120vh)] h-[120vh] w-[1.5px] origin-bottom bg-clay"
          />

          <div
            className="relative bg-auth-ground px-6 pb-[30px] pt-[66px] sm:px-10"
            style={{
              clipPath:
                "polygon(64px 0, calc(100% - 64px) 0, 100% 64px, 100% 100%, 0 100%, 0 64px)",
            }}
          >
            <span
              aria-hidden
              className="absolute left-[calc(50%-13px)] top-4 size-[26px] rounded-full bg-tag-hole shadow-[inset_0_2px_4px_rgba(0,0,0,.35),0_0_0_5px_#f2e6d5]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-3.5 bottom-3.5 top-14 rounded border border-dashed border-line-strong"
            />

            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={requestClose}
              aria-label="Đóng"
              className="absolute right-3 top-[60px] z-10 grid size-10 sm:right-[26px] sm:top-[66px] sm:size-8 place-items-center rounded-full border border-line-strong text-ink-secondary transition-colors duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <span aria-hidden className="text-[16px] leading-none">
                ×
              </span>
            </button>

            <div className="relative">
              <div className="mb-3.5 flex items-center gap-3 pr-11">
                <span className="text-label-xs text-accent">Khôi phục</span>
                <span aria-hidden className="h-px flex-1 bg-line" />
                <span className="font-display text-[13px] italic text-accent">
                  bước 1<span className="text-ink-faint"> / 3</span>
                </span>
              </div>

              <h2
                id="tag-title"
                className="m-0 mb-3 font-display text-[36px] sm:text-[46px] font-normal leading-[1.06] tracking-[-0.025em] text-ink"
              >
                Quên <em className="italic text-accent">mật khẩu</em>
              </h2>
              <p className="mb-[26px] text-[14px] leading-[1.6] text-ink-secondary">
                Nhập email, chúng tôi sẽ gửi mã xác minh 6 số.
              </p>

              <form
                onSubmit={handleSubmit(onSubmit)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                className="space-y-6"
                noValidate
              >
                <InputField
                  id="forgot-email"
                  required
                  variant="editorial"
                  label="Email"
                  type="email"
                  placeholder="ban@email.com"
                  error={leaving ? undefined : errors.email?.message}
                  {...register("email")}
                />
                <Button
                  type="submit"
                  variant="display"
                  disabled={sendOtpLoading}
                  className="min-h-[54px]! text-[18px]!"
                >
                  {sendOtpLoading ? "Đang gửi" : "Gửi mã"}
                  {sendOtpLoading && <Spinner />}
                </Button>
              </form>

              <div className="mt-[22px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-dashed border-line-strong pt-3.5 text-[12px]">
                <span className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">Hiệu lực</span>
                <span className="text-ink-secondary text-right">Mã dùng được trong 10 phút</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">Nhớ ra rồi?</span>
                <button
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={goToLogin}
                  className="italic font-medium text-accent underline decoration-accent-soft underline-offset-4 transition-colors duration-200 hover:text-accent-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 py-2 text-right"
                >
                  Đăng nhập
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
