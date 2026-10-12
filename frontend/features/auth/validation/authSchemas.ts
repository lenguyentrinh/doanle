import { z } from 'zod';

// Single source of truth for auth form validation. Messages are kept verbatim
// from the original react-hook-form rules so behaviour (and tests) are unchanged.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Must match backend/src/common/validators/password-policy.ts — this is the
// policy for setting a NEW password (signup, reset), not for the existing
// `password` field on login, which only needs to be present.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const newPasswordField = z
  .string()
  .min(1, 'Mật khẩu không được để trống')
  .min(PASSWORD_MIN_LENGTH, `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`)
  .regex(PASSWORD_UPPERCASE_REGEX, 'Mật khẩu phải chứa ít nhất 1 chữ hoa');

const emailField = z
  .string()
  .min(1, 'Email không được để trống')
  .regex(EMAIL_REGEX, 'Email không đúng định dạng');

// ── Login ──────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});
export type LoginValues = z.infer<typeof loginSchema>;

// ── Signup ─────────────────────────────────────────────────────────────────
export const signupSchema = z
  .object({
    userName: z.string().min(1, 'Họ tên không được để trống'),
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    phoneNumber: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });
export type SignupValues = z.infer<typeof signupSchema>;

// ── Verify email (post-signup OTP) ───────────────────────────────────────────
export const verifyEmailSchema = z.object({
  code: z
    .string()
    .min(1, 'Vui lòng nhập mã xác thực')
    .regex(/^\d{6}$/, 'Mã xác thực phải gồm 6 chữ số'),
});
export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;

// ── Forgot password: request code ────────────────────────────────────────────
export const forgotEmailSchema = z.object({
  email: emailField,
});
export type ForgotEmailValues = z.infer<typeof forgotEmailSchema>;

// ── Forgot password: verify OTP ──────────────────────────────────────────────
export const forgotOtpSchema = z.object({
  otp: z.string().min(1, 'Vui lòng nhập mã xác thực'),
});
export type ForgotOtpValues = z.infer<typeof forgotOtpSchema>;

// ── Forgot password: reset ───────────────────────────────────────────────────
export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordField,
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmNewPassword'],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
