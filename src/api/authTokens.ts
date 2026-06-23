import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const ISS = 'wolf-ai';
const ACCESS_AUD = 'wolf-ai-spa';
const REFRESH_AUD = 'wolf-ai-refresh';

let secretBytes: Uint8Array | null = null;

/** Falla al arrancar en producción si falta un secreto fuerte. */
export function assertJwtConfiguredForProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const raw = process.env.JWT_SECRET?.trim();
  if (!raw || raw.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a random string of at least 32 characters in production. ' +
        'Generate one: npm run generate-jwt-secret (or openssl rand -base64 48). ' +
        'Then add JWT_SECRET in Railway/Render → Environment variables and redeploy.',
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

/** Normaliza TTL para jose: acepta `7d`, `15m` o segundos en número (`604800` → `604800s`). */
export function normalizeJoseExpiration(raw: string | undefined, fallback: string): string {
  const v = raw?.trim();
  if (!v) return fallback;
  if (/^\d+$/.test(v)) return `${v}s`;
  return v;
}

/** Valores tipo `15m`, `12h`, `7d` (jose). Por defecto 15 minutos. */
export function getAccessTokenExpiresIn(): string {
  const v = process.env.JWT_ACCESS_EXPIRES_IN?.trim() ?? process.env.JWT_EXPIRES_IN?.trim();
  return normalizeJoseExpiration(v, '15m');
}

/** Valores tipo `15m`, `12h`, `7d` (jose). Por defecto 7 días. */
export function getRefreshTokenExpiresIn(): string {
  const v = process.env.JWT_REFRESH_EXPIRES_IN?.trim();
  return normalizeJoseExpiration(v, '7d');
}

export function expiryToSeconds(exp: string): number {
  const trimmed = exp.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const m = /^(\d+)([smhd])$/i.exec(trimmed);
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

export interface AuthAccessClaims {
  role: string;
  verified: boolean;
  email: string;
  [key: string]: unknown;
}

export interface RefreshClaims {
  tokenId: string;
  [key: string]: unknown;
}

export function hashOpaqueToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function generateOpaqueToken(byteLength = 48): string {
  return randomBytes(byteLength).toString('base64url');
}

export async function signAccessToken(sub: string, claims: AuthAccessClaims): Promise<{ token: string; expiresIn: number }> {
  const secret = getSecretBytes();
  const exp = getAccessTokenExpiresIn();
  const jwt = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(exp)
    .setIssuer(ISS)
    .setAudience(ACCESS_AUD)
    .sign(secret);
  return { token: jwt, expiresIn: expiryToSeconds(exp) };
}

export async function verifyAccessToken(token: string): Promise<JWTPayload & { sub: string }> {
  const secret = getSecretBytes();
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISS,
    audience: ACCESS_AUD,
    algorithms: ['HS256'],
  });
  if (typeof payload.sub !== 'string') throw new Error('missing sub');
  return payload as JWTPayload & { sub: string };
}

export async function signRefreshToken(sub: string, claims: RefreshClaims): Promise<{ token: string; expiresIn: number }> {
  const secret = getSecretBytes();
  const exp = getRefreshTokenExpiresIn();
  const jwt = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(exp)
    .setJti(randomUUID())
    .setIssuer(ISS)
    .setAudience(REFRESH_AUD)
    .sign(secret);
  return { token: jwt, expiresIn: expiryToSeconds(exp) };
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload & { sub: string; tokenId?: string }> {
  const secret = getSecretBytes();
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISS,
    audience: REFRESH_AUD,
    algorithms: ['HS256'],
  });
  if (typeof payload.sub !== 'string') throw new Error('missing sub');
  return payload as JWTPayload & { sub: string; tokenId?: string };
}
