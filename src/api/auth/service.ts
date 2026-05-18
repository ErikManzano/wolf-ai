import bcrypt from 'bcryptjs';
import type { Request } from 'express';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../authTokens';
import { AuthError } from './errors';
import type { EmailService } from './emailService';
import { verifyGoogleIdToken } from './googleVerifier';
import { AuthRepository } from './repository';
import type { AuthRole, AuthUser, SafeAuthUser } from './types';
import { normalizeEmail, requireEmail, requireStrongPassword } from './validators';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
}

function safeUser(user: AuthUser): SafeAuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    verified: user.verified,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function roleFromRequest(req: Request): AuthRole {
  const raw = String((req.body as { role?: unknown }).role ?? '').trim().toLowerCase();
  return raw === 'owner' ? 'owner' : 'trainer';
}

export class AuthService {
  private readonly repository: AuthRepository;
  private readonly emailService: EmailService;
  private readonly appBaseUrl: string;

  constructor(repository: AuthRepository, emailService: EmailService, appBaseUrl: string) {
    this.repository = repository;
    this.emailService = emailService;
    this.appBaseUrl = appBaseUrl;
  }

  async register(input: RegisterInput, req: Request): Promise<{ user: SafeAuthUser }> {
    const email = requireEmail(input.email);
    const name = input.name.trim();
    if (!name || name.length < 2) {
      throw new AuthError(400, 'INVALID_NAME', 'Name is required.');
    }
    const password = requireStrongPassword(input.password);
    const existing = await this.repository.findByEmail(email);
    if (existing) throw new AuthError(409, 'EMAIL_ALREADY_IN_USE', 'Email already in use.');

    const verifyToken = generateOpaqueToken();
    const verifyHash = hashOpaqueToken(verifyToken);
    const verifyExpiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.repository.create({
      name,
      email,
      passwordHash,
      verified: false,
      role: roleFromRequest(req),
      provider: 'password',
    });
    await this.repository.updateById(user.id, {
      verifyEmailTokenHash: verifyHash,
      verifyEmailTokenExpiresAt: verifyExpiresAt,
    });

    const verifyUrl = `${this.appBaseUrl.replace(/\/+$/, '')}/auth/verify-email?token=${encodeURIComponent(verifyToken)}&email=${encodeURIComponent(email)}`;
    await this.emailService.send({
      to: email,
      subject: 'Verify your Wolf AI account',
      html: `<p>Hi ${name},</p><p>Verify your account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
    return { user: { ...safeUser(user), verified: false } };
  }

  async verifyEmail(token: string, emailInput: string): Promise<{ user: SafeAuthUser }> {
    const email = requireEmail(emailInput);
    const user = await this.repository.findByEmail(email);
    if (!user) throw new AuthError(400, 'INVALID_VERIFY_TOKEN', 'Invalid verification token.');
    if (!user.verifyEmailTokenHash || !user.verifyEmailTokenExpiresAt) {
      throw new AuthError(400, 'INVALID_VERIFY_TOKEN', 'Invalid verification token.');
    }
    if (new Date(user.verifyEmailTokenExpiresAt).getTime() < Date.now()) {
      throw new AuthError(400, 'VERIFY_TOKEN_EXPIRED', 'Verification token expired.');
    }
    if (hashOpaqueToken(token) !== user.verifyEmailTokenHash) {
      throw new AuthError(400, 'INVALID_VERIFY_TOKEN', 'Invalid verification token.');
    }
    const updated = await this.repository.updateById(user.id, {
      verified: true,
      verifyEmailTokenHash: undefined,
      verifyEmailTokenExpiresAt: undefined,
    });
    if (!updated) throw new AuthError(500, 'USER_UPDATE_FAILED', 'Could not verify user.');
    return { user: safeUser(updated) };
  }

  private async issueTokens(user: AuthUser): Promise<AuthTokens> {
    const access = await signAccessToken(user.id, {
      role: user.role,
      verified: user.verified,
      email: user.email,
    });
    const tokenId = generateOpaqueToken(16);
    const refresh = await signRefreshToken(user.id, { tokenId });
    await this.repository.updateById(user.id, { refreshTokenHash: hashOpaqueToken(refresh.token) });
    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresIn,
      refreshToken: refresh.token,
      refreshTokenExpiresIn: refresh.expiresIn,
    };
  }

  async login(emailInput: string, password: string): Promise<{ user: SafeAuthUser; tokens: AuthTokens }> {
    const email = requireEmail(emailInput);
    const user = await this.repository.findByEmail(email);
    if (!user?.passwordHash) {
      throw new AuthError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.');
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new AuthError(401, 'INVALID_CREDENTIALS', 'Invalid credentials.');
    if (!user.verified) {
      throw new AuthError(403, 'EMAIL_NOT_VERIFIED', 'Email is not verified.');
    }
    return { user: safeUser(user), tokens: await this.issueTokens(user) };
  }

  async googleLogin(idToken: string): Promise<{ user: SafeAuthUser; tokens: AuthTokens }> {
    const identity = await verifyGoogleIdToken(idToken);
    let user = await this.repository.findByEmail(identity.email);
    if (!user) {
      user = await this.repository.create({
        name: identity.name,
        email: identity.email,
        verified: true,
        role: 'trainer',
        provider: 'google',
      });
    } else if (!user.verified) {
      const updated = await this.repository.updateById(user.id, { verified: true, provider: 'google' });
      if (updated) user = updated;
    }
    return { user: safeUser(user), tokens: await this.issueTokens(user) };
  }

  async refresh(refreshToken: string): Promise<{ user: SafeAuthUser; tokens: AuthTokens }> {
    const payload = await verifyRefreshToken(refreshToken);
    const user = await this.repository.findById(payload.sub);
    if (!user?.refreshTokenHash) throw new AuthError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token.');
    if (hashOpaqueToken(refreshToken) !== user.refreshTokenHash) {
      throw new AuthError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token.');
    }
    return { user: safeUser(user), tokens: await this.issueTokens(user) };
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await verifyRefreshToken(refreshToken);
    await this.repository.updateById(payload.sub, { refreshTokenHash: undefined });
  }

  async forgotPassword(emailInput: string): Promise<void> {
    const email = normalizeEmail(emailInput);
    const user = await this.repository.findByEmail(email);
    if (!user) return;
    const resetToken = generateOpaqueToken();
    const resetTokenHash = hashOpaqueToken(resetToken);
    const resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 20).toISOString();
    await this.repository.updateById(user.id, { resetPasswordTokenHash: resetTokenHash, resetPasswordTokenExpiresAt: resetTokenExpiresAt });
    const resetUrl = `${this.appBaseUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}`;
    await this.emailService.send({
      to: user.email,
      subject: 'Reset your Wolf AI password',
      html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  async resetPassword(emailInput: string, token: string, newPasswordInput: string): Promise<void> {
    const email = requireEmail(emailInput);
    const newPassword = requireStrongPassword(newPasswordInput);
    const user = await this.repository.findByEmail(email);
    if (!user?.resetPasswordTokenHash || !user.resetPasswordTokenExpiresAt) {
      throw new AuthError(400, 'INVALID_RESET_TOKEN', 'Invalid reset token.');
    }
    if (new Date(user.resetPasswordTokenExpiresAt).getTime() < Date.now()) {
      throw new AuthError(400, 'RESET_TOKEN_EXPIRED', 'Reset token expired.');
    }
    if (hashOpaqueToken(token) !== user.resetPasswordTokenHash) {
      throw new AuthError(400, 'INVALID_RESET_TOKEN', 'Invalid reset token.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.repository.updateById(user.id, {
      passwordHash,
      resetPasswordTokenHash: undefined,
      resetPasswordTokenExpiresAt: undefined,
      refreshTokenHash: undefined,
    });
  }
}
