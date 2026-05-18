import type { MockApiState } from '../routes';
import { PostgresStore } from '../postgresStore';
import type { AuthRole, AuthUser } from './types';

type CreateAuthUserInput = {
  name: string;
  email: string;
  passwordHash?: string;
  verified: boolean;
  role: AuthRole;
  provider: 'password' | 'google';
};

type UpdateAuthUserInput = Partial<AuthUser>;

function nowIso(): string {
  return new Date().toISOString();
}

function memoryAuthUserFromLegacy(email: string, state: MockApiState): AuthUser | null {
  const legacy = state.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  if (!legacy?.email) return null;
  const t = nowIso();
  return {
    id: legacy.id,
    name: legacy.name,
    email: legacy.email.toLowerCase(),
    passwordHash: legacy.passwordHash,
    verified: true,
    role: legacy.role === 'super_admin' ? 'owner' : 'trainer',
    provider: 'password',
    createdAt: t,
    updatedAt: t,
  };
}

export class AuthRepository {
  private readonly state: MockApiState;
  private readonly store?: PostgresStore;

  constructor(state: MockApiState, store?: PostgresStore) {
    this.state = state;
    this.store = store;
  }

  private readonly memoryUsers = new Map<string, AuthUser>();

  async findByEmail(email: string): Promise<AuthUser | null> {
    if (this.store) return this.store.findAuthUserByEmail(email);
    const cached = this.memoryUsers.get(email);
    if (cached) return cached;
    const migrated = memoryAuthUserFromLegacy(email, this.state);
    if (!migrated) return null;
    this.memoryUsers.set(email, migrated);
    return migrated;
  }

  async findById(id: string): Promise<AuthUser | null> {
    if (this.store) return this.store.findAuthUserById(id);
    for (const user of this.memoryUsers.values()) {
      if (user.id === id) return user;
    }
    const legacy = this.state.users.find((u) => u.id === id)?.email;
    if (!legacy) return null;
    return this.findByEmail(legacy);
  }

  async create(input: CreateAuthUserInput): Promise<AuthUser> {
    if (this.store) return this.store.createAuthUser(input);
    const created: AuthUser = {
      id: `auth-${Date.now()}`,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      verified: input.verified,
      role: input.role,
      provider: input.provider,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.memoryUsers.set(created.email, created);
    return created;
  }

  async updateById(id: string, changes: UpdateAuthUserInput): Promise<AuthUser | null> {
    if (this.store) return this.store.updateAuthUserById(id, changes);
    const found = await this.findById(id);
    if (!found) return null;
    const updated: AuthUser = { ...found, ...changes, updatedAt: nowIso() };
    this.memoryUsers.set(updated.email, updated);
    return updated;
  }

  async updateByEmail(email: string, changes: UpdateAuthUserInput): Promise<AuthUser | null> {
    if (this.store) return this.store.updateAuthUserByEmail(email, changes);
    const found = await this.findByEmail(email);
    if (!found) return null;
    const updated: AuthUser = { ...found, ...changes, updatedAt: nowIso() };
    this.memoryUsers.set(updated.email, updated);
    return updated;
  }
}
