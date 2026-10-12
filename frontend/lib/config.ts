// Centralized API configuration. Used by all API calls (SSR and client) to ensure
// consistent behavior across the app, both when env var is present and when it falls back
// to localhost dev environment.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

// Browser-side calls (axios) go through the Next.js `/api` rewrite when
// NEXT_PUBLIC_USE_API_PROXY=true, so auth cookies are first-party (same origin
// as the frontend) and survive third-party-cookie blocking. SSR fetches keep
// using API_BASE_URL directly.
export const CLIENT_API_BASE_URL =
  process.env.NEXT_PUBLIC_USE_API_PROXY === 'true' ? '' : API_BASE_URL;
