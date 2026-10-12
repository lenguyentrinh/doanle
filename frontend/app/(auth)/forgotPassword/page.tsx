import { redirect } from "next/navigation";

// The email step now lives in the ForgotPasswordTag modal on /login; keep the
// old URL (emails, bookmarks) working.
export default function ForgotPasswordPage() {
  redirect("/login?forgot=1");
}
