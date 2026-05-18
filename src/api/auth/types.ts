export type AuthRole = 'owner' | 'trainer';
export type AuthProvider = 'password' | 'google';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  verified: boolean;
  role: AuthRole;
  provider: AuthProvider;
  refreshTokenHash?: string;
  verifyEmailTokenHash?: string;
  verifyEmailTokenExpiresAt?: string;
  resetPasswordTokenHash?: string;
  resetPasswordTokenExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafeAuthUser {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  role: AuthRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthApiError {
  success: false;
  message: string;
  code: string;
}
