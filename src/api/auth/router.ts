import { Router, type IRouter, type Request, type Response } from 'express';
import type { MockApiState } from '../routes';
import { PostgresStore } from '../postgresStore';
import { AuthController, authErrorHandler } from './controller';
import { ConsoleEmailService } from './emailService';
import { authMiddleware, requireVerified, roleMiddleware } from './middleware';
import { AuthRepository } from './repository';
import { AuthService } from './service';

function getAppBaseUrl(req: Request): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured;
  const host = req.headers.host ?? 'localhost:5173';
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${proto}://${host}`;
}

export function createAuthRouter(state: MockApiState, store?: PostgresStore): IRouter {
  const router = Router();
  const repository = new AuthRepository(state, store);
  const emailService = new ConsoleEmailService();

  const serviceFor = (req: Request): AuthService => new AuthService(repository, emailService, getAppBaseUrl(req));
  const withController = (req: Request): AuthController => new AuthController(serviceFor(req));

  router.post('/auth/register', (req, res, next) => withController(req).register(req, res, next));
  router.get('/auth/verify-email', (req, res, next) => withController(req).verifyEmail(req, res, next));
  router.post('/auth/login', (req, res, next) => withController(req).login(req, res, next));
  router.post('/auth/google', (req, res, next) => withController(req).google(req, res, next));
  router.post('/auth/refresh', (req, res, next) => withController(req).refresh(req, res, next));
  router.post('/auth/logout', (req, res, next) => withController(req).logout(req, res, next));
  router.post('/auth/forgot-password', (req, res, next) => withController(req).forgotPassword(req, res, next));
  router.post('/auth/reset-password', (req, res, next) => withController(req).resetPassword(req, res, next));

  router.get('/auth/protected/trainer', authMiddleware, requireVerified, roleMiddleware('trainer', 'owner'), (_req: Request, res: Response) => {
    res.json({ success: true });
  });
  router.get('/auth/protected/owner', authMiddleware, requireVerified, roleMiddleware('owner'), (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  router.use(authErrorHandler);
  return router;
}
