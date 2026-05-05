import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain.trim(), ROUNDS);
}

export function verifyPassword(plain: string, hash: string | undefined | null): boolean {
  if (!hash || !plain) return false;
  return bcrypt.compareSync(plain, hash);
}

/** Detecta hash bcrypt guardado en columna/campo `password` heredado. */
export function looksLikeBcryptHash(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith('$2');
}

/** Login local o en memoria: acepta `passwordHash` bcrypt o `password` en claro legado. */
export function matchesStoredPassword(
  u: { password?: string; passwordHash?: string },
  plain: string,
): boolean {
  const stored = u.passwordHash ?? u.password;
  if (!stored) return false;
  if (looksLikeBcryptHash(stored)) return verifyPassword(plain, stored);
  return stored === plain;
}
