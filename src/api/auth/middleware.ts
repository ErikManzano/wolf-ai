import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../authTokens';
import { AuthError } from './errors';
import type { AuthRole } from './types';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    role: AuthRole;
    verified: boolean;
    email: string;
  };
}

export async function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = (req.headers.authorization ?? '').trim();
    const match = /^Bearer\s+(\S+)$/i.exec(raw);
    if (!match) throw new AuthError(401, 'UNAUTHENTICATED', 'Authentication required.');
    const payload = await verifyAccessToken(match[1]);
    req.auth = {
      userId: payload.sub,
      role: (payload.role as AuthRole) ?? 'trainer',
      verified: Boolean(payload.verified),
      email: String(payload.email ?? ''),
    };
    next();
  } catch {
    next(new AuthError(401, 'UNAUTHENTICATED', 'Authentication required.'));
  }
}

export function requireVerified(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.auth?.verified) {
    next(new AuthError(403, 'EMAIL_NOT_VERIFIED', 'Email verification required.'));
    return;
  }
  next();
}

export function roleMiddleware(...roles: AuthRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      next(new AuthError(403, 'INSUFFICIENT_ROLE', 'Insufficient role for this resource.'));
      return;
    }
    next();
  };
}
