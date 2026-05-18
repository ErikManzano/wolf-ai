import { Pool } from 'pg';
import type { ProgramAssignment, WolfUser } from '../models/training';
import { hashPassword, looksLikeBcryptHash, verifyPassword } from '../utils/passwordCrypto';
import type { AuthRole, AuthUser } from './auth/types';

type AssignmentCreateInput = {
  id: string;
  coachId: string;
  athleteProfileId: string;
  athleteUserId?: string;
  program: ProgramAssignment['program'];
};

type UserCreateInput = {
  id: string;
  name: string;
  role: WolfUser['role'];
  email: string;
  password: string;
  coachId?: string;
  linkedAthleteId?: string;
};

export class PostgresStore {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  static fromEnv(): PostgresStore | null {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) return null;
    const pool = new Pool({
      connectionString,
      ssl: process.env.PGSSL_DISABLE === '1' ? false : { rejectUnauthorized: false },
    });
    return new PostgresStore(pool);
  }

  async init(seedUsers: WolfUser[]): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL DEFAULT 'wolf2026',
        coach_id TEXT,
        linked_athlete_id TEXT
      );
    `);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT 'wolf2026';`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT TRUE;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'password';`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_email_token_hash TEXT;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_email_token_expires_at TIMESTAMPTZ;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token_hash TEXT;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token_expires_at TIMESTAMPTZ;`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
    await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        coach_id TEXT NOT NULL,
        athlete_user_id TEXT,
        athlete_profile_id TEXT NOT NULL UNIQUE,
        version INTEGER NOT NULL,
        version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        program JSONB NOT NULL,
        assigned_at TIMESTAMPTZ NOT NULL
      );
    `);

    const syncPasswords = process.env.WOLF_SYNC_SEED_PASSWORDS !== '0';

    for (const user of seedUsers) {
      const storedPassword =
        user.passwordHash && looksLikeBcryptHash(user.passwordHash)
          ? user.passwordHash
          : hashPassword(user.password ?? 'wolf2026');
      const params = [user.id, user.name, user.role, user.email ?? '', storedPassword, user.coachId ?? null, user.linkedAthleteId ?? null];
      try {
        await this.pool.query(
          `
        INSERT INTO users (id, name, role, email, password, coach_id, linked_athlete_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          coach_id = EXCLUDED.coach_id,
          linked_athlete_id = EXCLUDED.linked_athlete_id;
        `,
          params,
        );
      } catch (err: unknown) {
        const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
        if (code !== '23505') throw err;
        await this.pool.query(
          `
          UPDATE users SET
            name = $1,
            role = $2,
            password = $3,
            coach_id = $4,
            linked_athlete_id = $5
          WHERE lower(email) = lower($6);
        `,
          [user.name, user.role, storedPassword, user.coachId ?? null, user.linkedAthleteId ?? null, user.email ?? ''],
        );
      }
    }

    if (syncPasswords) {
      for (const user of seedUsers) {
        const storedPassword =
          user.passwordHash && looksLikeBcryptHash(user.passwordHash)
            ? user.passwordHash
            : hashPassword(user.password ?? 'wolf2026');
        await this.pool.query(`UPDATE users SET password = $1 WHERE lower(email) = lower($2);`, [
          storedPassword,
          user.email ?? '',
        ]);
      }
    }
  }

  async getUsers(): Promise<WolfUser[]> {
    const result = await this.pool.query(
      'SELECT id, name, role, email, coach_id, linked_athlete_id FROM users ORDER BY name ASC;',
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      role: row.role as WolfUser['role'],
      email: row.email as string,
      coachId: (row.coach_id as string | null) ?? undefined,
      linkedAthleteId: (row.linked_athlete_id as string | null) ?? undefined,
    }));
  }

  async getUserByEmail(email: string): Promise<WolfUser | null> {
    const result = await this.pool.query(
      'SELECT id, name, role, email, coach_id, linked_athlete_id FROM users WHERE lower(email) = lower($1) LIMIT 1;',
      [email],
    );
    if (result.rows.length === 0) return null;
    return {
      id: result.rows[0].id as string,
      name: result.rows[0].name as string,
      role: result.rows[0].role as WolfUser['role'],
      email: result.rows[0].email as string,
      coachId: (result.rows[0].coach_id as string | null) ?? undefined,
      linkedAthleteId: (result.rows[0].linked_athlete_id as string | null) ?? undefined,
    };
  }

  async validateUser(email: string, password: string): Promise<WolfUser | null> {
    const result = await this.pool.query(
      `
      SELECT id, name, role, email, coach_id, linked_athlete_id, password AS stored_password
      FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1;
      `,
      [email],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const stored = row.stored_password as string;
    const ok =
      looksLikeBcryptHash(stored) ? verifyPassword(password, stored) : stored === password;
    if (!ok) return null;
    return {
      id: row.id as string,
      name: row.name as string,
      role: row.role as WolfUser['role'],
      email: row.email as string,
      coachId: (row.coach_id as string | null) ?? undefined,
      linkedAthleteId: (row.linked_athlete_id as string | null) ?? undefined,
    };
  }

  async createUser(input: UserCreateInput): Promise<WolfUser> {
    const passHash = hashPassword(input.password);
    const result = await this.pool.query(
      `
      INSERT INTO users (id, name, role, email, password, coach_id, linked_athlete_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, role, email, coach_id, linked_athlete_id;
      `,
      [input.id, input.name, input.role, input.email, passHash, input.coachId ?? null, input.linkedAthleteId ?? null],
    );
    const row = result.rows[0];
    return {
      id: row.id as string,
      name: row.name as string,
      role: row.role as WolfUser['role'],
      email: row.email as string,
      coachId: (row.coach_id as string | null) ?? undefined,
      linkedAthleteId: (row.linked_athlete_id as string | null) ?? undefined,
    };
  }

  async updateUser(
    id: string,
    input: Partial<Pick<UserCreateInput, 'name' | 'role' | 'email' | 'coachId' | 'linkedAthleteId'>>,
  ): Promise<WolfUser | null> {
    const existing = await this.pool.query(
      'SELECT id, name, role, email, coach_id, linked_athlete_id FROM users WHERE id = $1 LIMIT 1;',
      [id],
    );
    if (existing.rows.length === 0) return null;
    const row = existing.rows[0];
    const next = {
      name: input.name ?? (row.name as string),
      role: input.role ?? (row.role as WolfUser['role']),
      email: input.email ?? (row.email as string),
      coachId: input.coachId ?? ((row.coach_id as string | null) ?? undefined),
      linkedAthleteId: input.linkedAthleteId ?? ((row.linked_athlete_id as string | null) ?? undefined),
    };
    const result = await this.pool.query(
      `
      UPDATE users
      SET name = $2, role = $3, email = $4, coach_id = $5, linked_athlete_id = $6
      WHERE id = $1
      RETURNING id, name, role, email, coach_id, linked_athlete_id;
      `,
      [id, next.name, next.role, next.email, next.coachId ?? null, next.linkedAthleteId ?? null],
    );
    const updated = result.rows[0];
    return {
      id: updated.id as string,
      name: updated.name as string,
      role: updated.role as WolfUser['role'],
      email: updated.email as string,
      coachId: (updated.coach_id as string | null) ?? undefined,
      linkedAthleteId: (updated.linked_athlete_id as string | null) ?? undefined,
    };
  }

  async changePassword(email: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const found = await this.pool.query(`SELECT password FROM users WHERE lower(email) = lower($1) LIMIT 1;`, [email]);
    if (found.rows.length === 0) return false;
    const stored = found.rows[0].password as string;
    const valid =
      looksLikeBcryptHash(stored) ? verifyPassword(currentPassword, stored) : stored === currentPassword;
    if (!valid) return false;
    const newHash = hashPassword(newPassword);
    const result = await this.pool.query(
      `UPDATE users SET password = $2 WHERE lower(email) = lower($1);`,
      [email, newHash],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM users WHERE id = $1;', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getAssignments(): Promise<ProgramAssignment[]> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at
      FROM assignments
      ORDER BY assigned_at DESC;
      `,
    );
    return result.rows.map(this.mapAssignmentRow);
  }

  async getAssignmentByAthlete(athleteProfileId: string): Promise<ProgramAssignment | null> {
    const result = await this.pool.query(
      `
      SELECT id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at
      FROM assignments
      WHERE athlete_profile_id = $1
      LIMIT 1;
      `,
      [athleteProfileId],
    );
    if (result.rows.length === 0) return null;
    return this.mapAssignmentRow(result.rows[0]);
  }

  async createOrReplaceAssignment(input: AssignmentCreateInput): Promise<ProgramAssignment> {
    await this.pool.query('DELETE FROM assignments WHERE athlete_profile_id = $1;', [input.athleteProfileId]);
    const assignedAt = new Date().toISOString();
    const result = await this.pool.query(
      `
      INSERT INTO assignments (
        id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at
      )
      VALUES ($1, $2, $3, $4, 1, '[]'::jsonb, $5::jsonb, $6::timestamptz)
      RETURNING id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at;
      `,
      [
        input.id,
        input.coachId,
        input.athleteUserId ?? null,
        input.athleteProfileId,
        JSON.stringify({ ...input.program, athleteId: input.athleteProfileId }),
        assignedAt,
      ],
    );
    return this.mapAssignmentRow(result.rows[0]);
  }

  async updateAssignmentProgram(id: string, program: ProgramAssignment['program']): Promise<ProgramAssignment | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const currentRes = await client.query(
        `
        SELECT id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at
        FROM assignments
        WHERE id = $1
        FOR UPDATE;
        `,
        [id],
      );
      if (currentRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const current = this.mapAssignmentRow(currentRes.rows[0]);
      const nextHistory = [
        ...current.versionHistory,
        { version: current.version, editedAt: new Date().toISOString(), program: current.program },
      ];
      const updatedRes = await client.query(
        `
        UPDATE assignments
        SET version = $2, version_history = $3::jsonb, program = $4::jsonb
        WHERE id = $1
        RETURNING id, coach_id, athlete_user_id, athlete_profile_id, version, version_history, program, assigned_at;
        `,
        [
          id,
          current.version + 1,
          JSON.stringify(nextHistory),
          JSON.stringify({ ...program, athleteId: current.athleteProfileId }),
        ],
      );
      await client.query('COMMIT');
      return this.mapAssignmentRow(updatedRes.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAssignment(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM assignments WHERE id = $1;', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private mapAssignmentRow = (row: Record<string, unknown>): ProgramAssignment => ({
    id: row.id as string,
    coachId: row.coach_id as string,
    athleteUserId: (row.athlete_user_id as string | null) ?? undefined,
    athleteProfileId: row.athlete_profile_id as string,
    version: Number(row.version),
    versionHistory: (row.version_history as ProgramAssignment['versionHistory']) ?? [],
    program: row.program as ProgramAssignment['program'],
    assignedAt: new Date(row.assigned_at as string | Date).toISOString(),
  });

  async findAuthUserByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.pool.query(
      `SELECT id, name, email, role, password, verified, auth_provider, refresh_token_hash,
              verify_email_token_hash, verify_email_token_expires_at,
              reset_password_token_hash, reset_password_token_expires_at,
              created_at, updated_at
       FROM users WHERE lower(email) = lower($1) LIMIT 1;`,
      [email],
    );
    if (result.rows.length === 0) return null;
    return this.mapAuthRow(result.rows[0]);
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const result = await this.pool.query(
      `SELECT id, name, email, role, password, verified, auth_provider, refresh_token_hash,
              verify_email_token_hash, verify_email_token_expires_at,
              reset_password_token_hash, reset_password_token_expires_at,
              created_at, updated_at
       FROM users WHERE id = $1 LIMIT 1;`,
      [id],
    );
    if (result.rows.length === 0) return null;
    return this.mapAuthRow(result.rows[0]);
  }

  async createAuthUser(input: {
    name: string;
    email: string;
    passwordHash?: string;
    verified: boolean;
    role: AuthRole;
    provider: 'password' | 'google';
  }): Promise<AuthUser> {
    const mappedRole: WolfUser['role'] = input.role === 'owner' ? 'super_admin' : 'coach';
    const id = `auth-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const result = await this.pool.query(
      `INSERT INTO users (
          id, name, role, email, password, verified, auth_provider, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())
        RETURNING id, name, email, role, password, verified, auth_provider, refresh_token_hash,
                  verify_email_token_hash, verify_email_token_expires_at,
                  reset_password_token_hash, reset_password_token_expires_at,
                  created_at, updated_at;`,
      [id, input.name, mappedRole, input.email, input.passwordHash ?? '', input.verified, input.provider],
    );
    return this.mapAuthRow(result.rows[0]);
  }

  async updateAuthUserById(id: string, changes: Partial<AuthUser>): Promise<AuthUser | null> {
    const current = await this.findAuthUserById(id);
    if (!current) return null;
    return this.updateAuthUserByEmail(current.email, changes);
  }

  async updateAuthUserByEmail(email: string, changes: Partial<AuthUser>): Promise<AuthUser | null> {
    const current = await this.findAuthUserByEmail(email);
    if (!current) return null;
    const nextRole = changes.role ?? current.role;
    const mappedRole: WolfUser['role'] = nextRole === 'owner' ? 'super_admin' : 'coach';
    const result = await this.pool.query(
      `UPDATE users SET
          name = $2,
          role = $3,
          password = $4,
          verified = $5,
          auth_provider = $6,
          refresh_token_hash = $7,
          verify_email_token_hash = $8,
          verify_email_token_expires_at = $9,
          reset_password_token_hash = $10,
          reset_password_token_expires_at = $11,
          updated_at = now()
        WHERE lower(email) = lower($1)
        RETURNING id, name, email, role, password, verified, auth_provider, refresh_token_hash,
                  verify_email_token_hash, verify_email_token_expires_at,
                  reset_password_token_hash, reset_password_token_expires_at,
                  created_at, updated_at;`,
      [
        email,
        changes.name ?? current.name,
        mappedRole,
        changes.passwordHash ?? current.passwordHash ?? '',
        changes.verified ?? current.verified,
        changes.provider ?? current.provider,
        changes.refreshTokenHash ?? null,
        changes.verifyEmailTokenHash ?? null,
        changes.verifyEmailTokenExpiresAt ?? null,
        changes.resetPasswordTokenHash ?? null,
        changes.resetPasswordTokenExpiresAt ?? null,
      ],
    );
    if (result.rows.length === 0) return null;
    return this.mapAuthRow(result.rows[0]);
  }

  private mapAuthRow(row: Record<string, unknown>): AuthUser {
    const role = (row.role as WolfUser['role']) === 'super_admin' ? 'owner' : 'trainer';
    return {
      id: row.id as string,
      name: row.name as string,
      email: (row.email as string).toLowerCase(),
      passwordHash: (row.password as string | null) ?? undefined,
      verified: Boolean(row.verified),
      role,
      provider: ((row.auth_provider as string | null) ?? 'password') === 'google' ? 'google' : 'password',
      refreshTokenHash: (row.refresh_token_hash as string | null) ?? undefined,
      verifyEmailTokenHash: (row.verify_email_token_hash as string | null) ?? undefined,
      verifyEmailTokenExpiresAt: row.verify_email_token_expires_at
        ? new Date(row.verify_email_token_expires_at as string | Date).toISOString()
        : undefined,
      resetPasswordTokenHash: (row.reset_password_token_hash as string | null) ?? undefined,
      resetPasswordTokenExpiresAt: row.reset_password_token_expires_at
        ? new Date(row.reset_password_token_expires_at as string | Date).toISOString()
        : undefined,
      createdAt: row.created_at ? new Date(row.created_at as string | Date).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string | Date).toISOString() : new Date().toISOString(),
    };
  }
}
