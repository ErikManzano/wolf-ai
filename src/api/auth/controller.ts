import type { NextFunction, Request, Response } from 'express';
import { asAuthError } from './errors';
import type { AuthService } from './service';

function readRefreshToken(req: Request): string {
  const bodyToken = (req.body as { refreshToken?: unknown })?.refreshToken;
  if (typeof bodyToken === 'string' && bodyToken.trim()) return bodyToken.trim();
  const header = String(req.headers['x-refresh-token'] ?? '').trim();
  return header;
}

export class AuthController {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { name?: string; email?: string; password?: string };
      const out = await this.authService.register(
        {
          name: body.name ?? '',
          email: body.email ?? '',
          password: body.password ?? '',
        },
        req,
      );
      res.status(201).json({ success: true, message: 'User registered. Verify your email.', user: out.user });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = String(req.query.token ?? '');
      const email = String(req.query.email ?? '');
      const out = await this.authService.verifyEmail(token, email);
      res.json({ success: true, message: 'Email verified.', user: out.user });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { email?: string; password?: string };
      const out = await this.authService.login(body.email ?? '', body.password ?? '');
      res.json({
        success: true,
        user: out.user,
        accessToken: out.tokens.accessToken,
        refreshToken: out.tokens.refreshToken,
        accessTokenExpiresIn: out.tokens.accessTokenExpiresIn,
        refreshTokenExpiresIn: out.tokens.refreshTokenExpiresIn,
        token: out.tokens.accessToken,
        expiresIn: out.tokens.accessTokenExpiresIn,
      });
    } catch (error) {
      next(error);
    }
  };

  google = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { idToken?: string };
      const out = await this.authService.googleLogin(body.idToken ?? '');
      res.json({
        success: true,
        user: out.user,
        accessToken: out.tokens.accessToken,
        refreshToken: out.tokens.refreshToken,
        accessTokenExpiresIn: out.tokens.accessTokenExpiresIn,
        refreshTokenExpiresIn: out.tokens.refreshTokenExpiresIn,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = readRefreshToken(req);
      const out = await this.authService.refresh(refreshToken);
      res.json({
        success: true,
        user: out.user,
        accessToken: out.tokens.accessToken,
        refreshToken: out.tokens.refreshToken,
        accessTokenExpiresIn: out.tokens.accessTokenExpiresIn,
        refreshTokenExpiresIn: out.tokens.refreshTokenExpiresIn,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = readRefreshToken(req);
      await this.authService.logout(refreshToken);
      res.json({ success: true, message: 'Logged out.' });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { email?: string };
      await this.authService.forgotPassword(body.email ?? '');
      res.json({ success: true, message: 'If the email exists, recovery instructions were sent.' });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as { email?: string; token?: string; newPassword?: string };
      await this.authService.resetPassword(body.email ?? '', body.token ?? '', body.newPassword ?? '');
      res.json({ success: true, message: 'Password reset completed.' });
    } catch (error) {
      next(error);
    }
  };
}

export function authErrorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const authError = asAuthError(error);
  res.status(authError.status).json({
    success: false,
    message: authError.message,
    code: authError.code,
  });
}
