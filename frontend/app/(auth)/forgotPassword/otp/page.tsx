import { Suspense } from "react";
import AuthShell from "../../AuthShell";
import OtpForm from "./otpForm";
import OtpChangeEmail from "./OtpChangeEmail";

export default function OtpPage() {
  return (
    <AuthShell
      step={2}
      totalSteps={3}
      title={
        <>
          Nhập mã <em className="italic text-accent">xác minh</em>
        </>
      }
      subtitle="Mã có hiệu lực trong 10 phút."
      footer={
        <Suspense fallback={null}>
          <OtpChangeEmail />
        </Suspense>
      }
    >
      <Suspense
        fallback={
          <div className="text-center text-body-md text-ink-muted">Đang tải...</div>
        }
      >
        <OtpForm />
      </Suspense>
    </AuthShell>
  );
}
