import { AuthError } from './errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function requireEmail(input: string): string {
  const email = normalizeEmail(input);
  if (!EMAIL_RE.test(email)) {
    throw new AuthError(400, 'INVALID_EMAIL', 'Invalid email format.');
  }
  return email;
}

export function requireStrongPassword(input: string): string {
  const password = input.trim();
  if (!STRONG_PASSWORD_RE.test(password)) {
    throw new AuthError(
      400,
      'WEAK_PASSWORD',
      'Password must be 8+ chars and include uppercase, lowercase, and number.',
    );
  }
  return password;
}
