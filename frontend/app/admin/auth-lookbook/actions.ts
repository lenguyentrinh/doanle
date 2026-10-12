'use server';

import { revalidatePath } from 'next/cache';

// Called after an admin saves so the ISR-cached auth pages refresh immediately
// instead of waiting out the 60s fetch revalidate window.
export async function revalidateAuthPages(): Promise<void> {
  for (const p of [
    '/login',
    '/signup',
    '/verify-email',
    '/forgotPassword',
    '/forgotPassword/otp',
    '/forgotPassword/reset',
  ]) {
    revalidatePath(p);
  }
}
