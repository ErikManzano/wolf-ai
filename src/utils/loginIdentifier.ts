/** Normaliza lo que el usuario escribe en login (email o username). */
export function normalizeLoginIdentifier(raw: string): string {
  return raw.trim().toLowerCase();
}

export function userMatchesLoginId(
  user: { email?: string; username?: string },
  loginId: string,
): boolean {
  const id = normalizeLoginIdentifier(loginId);
  if (!id) return false;
  if (user.username && user.username.toLowerCase() === id) return true;
  if (user.email && user.email.toLowerCase() === id) return true;
  return false;
}
