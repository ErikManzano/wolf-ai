import { AuthError } from './errors';

export interface GoogleIdentity {
  email: string;
  name: string;
  sub: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const audience = process.env.GOOGLE_CLIENT_ID?.trim();
  const url = new URL('https://oauth2.googleapis.com/tokeninfo');
  url.searchParams.set('id_token', idToken);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new AuthError(401, 'GOOGLE_TOKEN_INVALID', 'Invalid Google token.');
  }
  const payload = (await response.json()) as {
    email?: string;
    email_verified?: string;
    name?: string;
    aud?: string;
    sub?: string;
  };
  if (!payload.email || !payload.sub) {
    throw new AuthError(401, 'GOOGLE_TOKEN_INVALID', 'Invalid Google token claims.');
  }
  if (payload.email_verified !== 'true') {
    throw new AuthError(403, 'GOOGLE_EMAIL_NOT_VERIFIED', 'Google email is not verified.');
  }
  if (audience && payload.aud !== audience) {
    throw new AuthError(401, 'GOOGLE_AUDIENCE_MISMATCH', 'Google token audience mismatch.');
  }
  return {
    email: payload.email.toLowerCase(),
    name: payload.name?.trim() || 'Google User',
    sub: payload.sub,
  };
}
