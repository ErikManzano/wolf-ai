/**
 * JWT de acceso (HS256, issuer/audience fijos). Solo debe importarse desde el servidor Node.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const ISS = 'wolf-ai';
const AUD = 'wolf-ai-spa';

let secretBytes: Uint8Array | null = null;

/** Falla al arrancar en producción si falta un secreto fuerte. */
export function assertJwtConfiguredForProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const raw = process.env.JWT_SECRET?.trim();
  if (!raw || raw.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a random string of at least 32 characters in production (e.g. openssl rand -base64 48).',
    );
  }
}

function getSecretBytes(): Uint8Array {
  if (secretBytes) return secretBytes;
  const raw = process.env.JWT_SECRET?.trim();
  if (raw && raw.length >= 32) {
    secretBytes = new TextEncoder().encode(raw);
    return secretBytes;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }
  console.warn(
    '[wolf-ai] JWT_SECRET not set; using insecure dev default. Set JWT_SECRET (32+ chars) before production.',
  );
  secretBytes = new TextEncoder().encode('dev-insecure-wolf-ai-jwt-do-not-use-in-prod-32');
  return secretBytes;
}

/** Valores tipo `15m`, `12h`, `7d` (jose). Por defecto 7 días. */
export function getJwtExpiresIn(): string {
  const v = process.env.JWT_EXPIRES_IN?.trim();
  return v && v.length > 0 ? v : '7d';
}

export function expiryToSeconds(exp: string): number {
  const m = /^(\d+)([smhd])$/i.exec(exp.trim());
  if (!m) return 7 * 86400;
  const n = parseInt(m[1], 10);
  switch (m[2].toLowerCase()) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return 7 * 86400;
  }
}

export async function signAccessToken(sub: string, role: string): Promise<{ token: string; expiresIn: number }> {
  const secret = getSecretBytes();
  const exp = getJwtExpiresIn();
  const jwt = await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(exp)
    .setIssuer(ISS)
    .setAudience(AUD)
    .sign(secret);
  return { token: jwt, expiresIn: expiryToSeconds(exp) };
}

export async function verifyAccessToken(token: string): Promise<JWTPayload & { sub: string }> {
  const secret = getSecretBytes();
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISS,
    audience: AUD,
    algorithms: ['HS256'],
  });
  if (typeof payload.sub !== 'string') throw new Error('missing sub');
  return payload as JWTPayload & { sub: string };
}
