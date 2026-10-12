// User/account shapes returned by the backend Auth + Users APIs.
// Mirrors the sanitized responses exactly — see
// backend/src/modules/auth (GET /auth/me) and backend/src/modules/users.

// Sanitized current user — returned by GET /auth/me and PATCH /users/profile.
export interface MeResponse {
  id: string;
  email: string;
  userName: string;
  phoneNumber: string | null;
  role: string;
}

// Profile update — `email` is immutable and never sent.
export interface ProfilePayload {
  userName?: string;
  phoneNumber?: string;
}

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  isDefault: boolean;
}

export type AddressPayload = Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean };
