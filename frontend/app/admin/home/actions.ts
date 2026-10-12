'use server';

import { revalidatePath } from 'next/cache';

// Called after an admin saves the hero so the ISR-cached home page refreshes
// immediately instead of waiting out `revalidate = 60`.
export async function revalidateHomePage(): Promise<void> {
  revalidatePath('/');
}
