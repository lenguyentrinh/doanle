'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

// Stitch main header: "Welcome back, {firstName}." with an editorial subline.
// No member-since date is shown: the user model carries no created date and
// fabricating one would break the "real data only" rule.
export default function AccountWelcome() {
  const user = useSelector((state: RootState) => state.auth.user);
  const firstName = (user?.userName ?? '').trim().split(/\s+/)[0] || 'bạn';

  return (
    <header className="motion-safe:animate-account-rise mb-10">
      <span className="text-label-xs text-accent">Tài khoản</span>
      <h1 className="mt-2 text-display-md text-ink">
        Xin chào, <em className="text-ink">{firstName}</em>
      </h1>
    </header>
  );
}
