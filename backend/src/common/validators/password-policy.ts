// Single source of truth for the password policy, shared by every DTO that
// accepts a new password (signup, reset-password). Keep frontend/features/
// auth/validation/authSchemas.ts's signupSchema/resetPasswordSchema in sync
// with these values so client-side validation never accepts what the server
// would reject (or vice versa).
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_LENGTH_MESSAGE = `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`;

export const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
export const PASSWORD_UPPERCASE_MESSAGE =
  'Mật khẩu phải chứa ít nhất 1 chữ hoa';
