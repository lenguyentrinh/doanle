// Centralized API configuration. Used by all API calls (SSR and client) to ensure
// consistent behavior across the app, both when env var is present and when it falls back
// to localhost dev environment.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';
