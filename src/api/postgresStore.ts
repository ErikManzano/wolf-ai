import { Pool } from 'pg';
import type { ProgramAssignment, WolfUser } from '../models/training';

type AssignmentCreateInput = {
  id: string;
  coachId: string;
  athleteProfileId: string;
  athleteUserId?: string;
  program: ProgramAssignment['program'];
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
        coach_id TEXT,
        linked_athlete_id TEXT
      );
    `);
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

    for (const user of seedUsers) {
      await this.pool.query(
        `
        INSERT INTO users (id, name, role, email, coach_id, linked_athlete_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          email = EXCLUDED.email,
          coach_id = EXCLUDED.coach_id,
          linked_athlete_id = EXCLUDED.linked_athlete_id;
        `,
        [user.id, user.name, user.role, user.email ?? '', user.coachId ?? null, user.linkedAthleteId ?? null],
      );
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
}
