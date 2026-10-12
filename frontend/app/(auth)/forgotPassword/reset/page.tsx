import { Suspense } from "react";
import AuthShell, { FooterRow } from "../../AuthShell";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPage() {
  return (
    <AuthShell
      step={3}
      totalSteps={3}
      title={
        <>
          Đặt <em className="italic text-accent">mật khẩu mới</em>
        </>
      }
      subtitle="Chọn mật khẩu bạn chưa từng dùng ở nơi khác."
      footer={<FooterRow prompt="Đổi ý?" href="/login" label="Về đăng nhập" />}
    >
      <Suspense
        fallback={
          <div className="text-center text-body-md text-ink-muted">Đang tải...</div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
