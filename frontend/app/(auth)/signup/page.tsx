import AuthShell, { FooterRow } from '../AuthShell';
import SignupForm from './SignupForm';

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Thành viên Oren"
      title={
        <>
          Tạo <em className="italic text-accent">tài khoản</em>
        </>
      }
      subtitle="Mất chưa tới một phút."
      footer={<FooterRow prompt="Đã có tài khoản?" href="/login" label="Đăng nhập" />}
    >
      <SignupForm />
    </AuthShell>
  );
}
