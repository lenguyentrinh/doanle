"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FooterRow } from "../../AuthShell";
import ForgotPasswordTag from "../../ForgotPasswordTag";

// "Sai email? Nhập lại" footer — reopens the hang tag instead of navigating.
export default function OtpChangeEmail() {
  const email = useSearchParams().get("email") ?? "";
  const [open, setOpen] = useState(false);

  return (
    <>
      <FooterRow prompt="Sai email?" label="Nhập lại" onClick={() => setOpen(true)} />
      <ForgotPasswordTag open={open} onClose={() => setOpen(false)} defaultEmail={email} />
    </>
  );
}
