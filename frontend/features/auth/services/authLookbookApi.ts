import { API_BASE_URL } from '@/lib/config';
import type { AuthLookbook } from '../types/authLookbook';

type FetchInit = RequestInit & { next?: { revalidate?: number } };

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

// Accepts a bare object or `{ data: {...} }`; anything malformed is "unset".
export function normalizeAuthLookbook(json: unknown): AuthLookbook {
  const raw =
    json && typeof json === 'object' && 'data' in json
      ? (json as { data: unknown }).data
      : json;
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return { imageUrl: str(o.imageUrl), caption: str(o.caption), label: str(o.label) };
}

// Public fetch for the Server Component AuthShell (ISR). Throws on non-OK so
// callers can fall back to the placeholder.
export async function getAuthLookbook(
  options: { revalidate?: number } = {},
): Promise<AuthLookbook> {
  const res = await fetch(`${API_BASE_URL}/api/auth-lookbook`, {
    next: { revalidate: options.revalidate ?? 60 },
  } as FetchInit);
  if (!res.ok) throw new Error(`Failed to load auth lookbook (${res.status})`);
  return normalizeAuthLookbook(await res.json());
}
