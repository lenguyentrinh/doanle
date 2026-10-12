import axios from "axios";
import { API_BASE_URL } from "@/lib/config";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
}

// Pre-auth endpoints where a 401 means "wrong credentials / code", not "expired
// session". Running the refresh flow for them fails (no refresh cookie) and ends
// in the hard reload below — so a wrong password reloaded the whole login page.
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/verify-email",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/reset-password",
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !PUBLIC_AUTH_PATHS.some((path) => originalRequest.url?.includes(path)) &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // The access token never leaves the server as JSON — refresh just
        // sets a new HttpOnly access_token cookie, which the retried request
        // picks up automatically via withCredentials.
        await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // `/auth/me` is the passive session-check AuthBootstrap fires on
        // every page load (app/providers.tsx) — for an anonymous visitor on
        // ANY page (home, products, ...) it's expected to 401 and fail
        // refresh. That's not "your session expired", it's "you were never
        // logged in", so it must never force-navigate; authSlice already
        // handles it by setting isAuthenticated=false. Force-navigating here
        // broke guest browsing entirely (every page bounced to /login) and,
        // when the guest was already ON /login, hard-reloaded the app and
        // re-fired this same failing `/me` call — an infinite reload loop
        // only stopped by the auth throttle bucket running out.
        if (
          typeof window !== "undefined" &&
          !originalRequest.url?.includes("/auth/me")
        ) {
          // Deliberate hard reload (not useRouter/redirect): this runs
          // outside the React tree, and a full reload is wanted here to
          // wipe all client state (Redux store, in-memory tokens, etc.)
          // now that the session is genuinely expired.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
