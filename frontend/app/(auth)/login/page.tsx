import { Suspense } from "react";
import Link from "next/link";
import AuthShell, { RISE_DELAY_2 } from "../AuthShell";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Chào mừng trở lại"
      title={
        <>
          Đăng <em className="not-italic text-accent">nhập</em>
        </>
      }
      subtitle="Tủ đồ và đơn hàng của bạn vẫn ở đây."
      footer={
        <div className={`mt-[18px] ${RISE_DELAY_2}`}>
          <Link
            href="/signup"
            className="flex items-center justify-between gap-5 rounded-tl-[min(50%,44px)] rounded-tr-[min(50%,44px)] rounded-bl-[14px] rounded-br-[14px] border border-line bg-fill px-[18px] py-4 pl-[22px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-line-strong hover:bg-white hover:shadow-card focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <span className="flex flex-col gap-[3px]">
              <span className="font-display text-[17px] font-medium text-ink">
                Lần đầu đến <em className="not-italic text-accent">Oren</em>?
              </span>
              <span className="text-[12.5px] text-ink-muted">
                Tạo tài khoản, mất chưa tới một phút.
              </span>
            </span>
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-ink text-[14px] leading-none text-white">
              →
            </span>
          </Link>
        </div>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
