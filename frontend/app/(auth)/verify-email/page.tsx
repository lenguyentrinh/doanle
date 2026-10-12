import { Suspense } from "react";
import AuthShell from "../AuthShell";
import VerifyEmailForm from "./VerifyEmailForm";

export default function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="Xác minh"
      title={
        <>
          Xác minh <em className="italic text-accent">email</em>
        </>
      }
      subtitle="Nhập mã 6 số vừa được gửi tới hộp thư của bạn."
    >
      <Suspense
        fallback={
          <div className="text-center text-body-md text-ink-muted">Đang tải...</div>
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
