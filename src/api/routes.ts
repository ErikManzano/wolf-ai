import { Router, type IRouter, type Request } from 'express';
import type { Athlete, Exercise, ProgramAssignment, ProgramAssignmentVersion, Session, SessionCompletion, SessionGoal, SetCompletionLog, WolfUser, CoachWlProgramTemplate, GeneratedProgram } from '../models/training';
import type {
  AthleteLoadCalibration,
  CoachExerciseOverride,
  ExerciseDefinition,
  ExerciseRelationshipRule,
  OverridePatch,
  PrescriptionEvent,
  TechnicalCollectionWithItems,
} from '../models/exercise';
import { mockExercises } from '../data/loadMockData';
import { mergeExerciseCatalog, normalizeExercise } from '../utils/exerciseCatalog';
import { parseExerciseUpsertBody } from './exercisePayload';
import { parseComposePreviewBody, parseExerciseDefinitionBody } from './exerciseDefinitionPayload';
import {
  browseExerciseRegistry,
  composeDisplayName,
  definitionsToLegacyExercises,
  getExerciseTaxonomy,
  resolveLoadSuggestion,
  validateComposition,
  buildSignature,
} from '../services/exercise';
import { buildExerciseDefinition } from '../services/exercise/buildDefinition';
import { isDayComplete } from '../utils/completionHelpers';
import { generateSession } from '../services/sessionGenerator';
import { evaluateSessionFull } from '../services/sessionEvaluator';
import { adaptSession } from '../services/adaptiveEngine';
import { simulateMicrocycle } from '../services/simulateMicrocycle';
import { PostgresStore } from './postgresStore';
import { CoachService, CoachServiceError } from './coach-service';
import { cloneProgramForAthlete, TEMPLATE_PROGRAM_ATHLETE_ID } from '../models/coach-architecture';
import type { CoachProgram, CoachProgramRow, CoachProgramStatus } from '../models/coach-architecture';
import { getEnrollmentsForCoachProgram, upsertAssignmentInList } from '../utils/wlAssignmentRules';
import { hashPassword, matchesStoredPassword } from '../utils/passwordCrypto';
import { userMatchesLoginId } from '../utils/loginIdentifier';
import { signAccessToken, verifyAccessToken } from './authTokens';

export interface MockApiState {
  athletes: Athlete[];
  exercises: Exercise[];
  exerciseDefinitions: ExerciseDefinition[];
  exerciseRelationships: ExerciseRelationshipRule[];
  coachExerciseOverrides: CoachExerciseOverride[];
  technicalCollections: TechnicalCollectionWithItems[];
  athleteLoadCalibrations: AthleteLoadCalibration[];
  prescriptionEvents: PrescriptionEvent[];
  sessions: Session[];
  users: WolfUser[];
  assignments: ProgramAssignment[];
  completions: SessionCompletion[];
  setLogs: SetCompletionLog[];
  coachWlTemplates: CoachWlProgramTemplate[];
  coachPrograms: CoachProgram[];
  /** athleteProfileId → coachId dueño (modo memoria sin Postgres) */
  wlAthleteCoachById: Record<string, string>;
}
type RealtimeNotifier = (event: string, payload?: unknown) => void;

function sanitizeUser(u: WolfUser): Omit<WolfUser, 'password' | 'passwordHash'> {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    email: u.email,
    username: u.username,
    coachId: u.coachId,
    linkedAthleteId: u.linkedAthleteId,
  };
}

function isCoachOrAdmin(user: WolfUser | null): user is WolfUser {
  return user?.role === 'coach' || user?.role === 'super_admin';
}

function coachIdForExercises(user: WolfUser): string {
  if (user.role === 'coach') return user.id;
  if (user.role === 'athlete' && user.coachId) return user.coachId;
  return 'user-coach';
}

function listExercisesMock(state: MockApiState): Exercise[] {
  const bundle = getExerciseTaxonomy();
  if (state.exerciseDefinitions.length > 0) {
    return definitionsToLegacyExercises(state.exerciseDefinitions, bundle);
  }
  return mergeExerciseCatalog(mockExercises, state.exercises);
}

function listDefinitionsMock(state: MockApiState, coachId: string): ExerciseDefinition[] {
  return state.exerciseDefinitions.filter((d) => !d.coachId || d.coachId === coachId);
}

function canReadAssignment(actor: WolfUser, assignment: ProgramAssignment): boolean {
  if (actor.role === 'super_admin') return true;
  if (actor.role === 'coach') return assignment.coachId === actor.id;
  if (actor.role === 'athlete') {
    return assignment.athleteUserId === actor.id || assignment.athleteProfileId === actor.linkedAthleteId;
  }
  return false;
}

function canWriteAssignment(actor: WolfUser, assignment: ProgramAssignment): boolean {
  if (actor.role === 'super_admin') return true;
  if (actor.role === 'coach') return assignment.coachId === actor.id;
  return false;
}

function canLogAssignment(actor: WolfUser, assignment: ProgramAssignment): boolean {
  return canReadAssignment(actor, assignment);
}

function coachIdForMockAthlete(athleteId: string, users: WolfUser[], owners: Record<string, string>): string {
  if (owners[athleteId]) return owners[athleteId];
  const linked = users.find((u) => u.linkedAthleteId === athleteId && u.coachId);
  return linked?.coachId ?? 'user-coach-wl';
}

function listMockWlAthletes(actor: WolfUser, state: MockApiState): Athlete[] {
  if (actor.role === 'super_admin') return state.athletes;
  if (actor.role === 'coach') {
    return state.athletes.filter(
      (a) => coachIdForMockAthlete(a.id, state.users, state.wlAthleteCoachById) === actor.id,
    );
  }
  return [];
}

function coachScopeId(actor: WolfUser): string {
  if (actor.role === 'coach') return actor.id;
  return 'user-coach-wl';
}

function coachProgramsScope(actor: WolfUser): string {
  return actor.role === 'super_admin' ? coachScopeId(actor) : actor.id;
}

function resolveAthleteUserId(profileId: string, users: WolfUser[]): string | undefined {
  return users.find((u) => u.role === 'athlete' && u.linkedAthleteId === profileId)?.id;
}

function buildMockCoachProgramRows(coachId: string, state: MockApiState): CoachProgramRow[] {
  const nameById = Object.fromEntries(state.athletes.map((a) => [a.id, a.name] as const));
  const coachAssignments = state.assignments.filter((a) => a.coachId === coachId);
  return state.coachPrograms
    .filter((p) => p.coachId === coachId && p.status !== 'archived')
    .map((program) => ({
      ...program,
      enrolledAthletes: getEnrollmentsForCoachProgram(program.id, coachAssignments, [], nameById),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function findAssignmentById(
  id: string,
  state: MockApiState,
  store?: PostgresStore,
): Promise<ProgramAssignment | null> {
  if (store) {
    return store.getAssignmentById(id);
  }
  return state.assignments.find((a) => a.id === id) ?? null;
}

async function resolveActorUser(
  actor: WolfUser,
  _state: MockApiState,
  store?: PostgresStore,
): Promise<WolfUser> {
  if (!store || actor.role !== 'athlete') return actor;
  const reconciled = await store.reconcileAthleteUserLink(actor.id);
  return reconciled ?? actor;
}

async function listAssignmentsForActor(
  actor: WolfUser,
  state: MockApiState,
  store?: PostgresStore,
): Promise<ProgramAssignment[]> {
  const resolved = await resolveActorUser(actor, state, store);
  if (store && resolved.role === 'athlete') {
    return store.getAssignmentsForAthleteUser(resolved);
  }
  const all = store ? await store.getAssignments() : state.assignments;
  if (resolved.role === 'super_admin') return all;
  if (resolved.role === 'coach') return all.filter((a) => a.coachId === resolved.id);
  if (resolved.role === 'athlete') {
    return all.filter(
      (a) => a.athleteUserId === resolved.id || a.athleteProfileId === resolved.linkedAthleteId,
    );
  }
  return [];
}

/** Resuelve el usuario actual desde `Authorization: Bearer <JWT>`; el rol se toma siempre de la fuente de datos. */
async function userFromBearer(req: Request, state: MockApiState, store?: PostgresStore): Promise<WolfUser | null> {
  const raw = (req.headers.authorization ?? '').trim();
  const m = /^Bearer\s+(\S+)/i.exec(raw);
  if (!m) return null;
  let sub: string;
  try {
    const payload = await verifyAccessToken(m[1]);
    sub = payload.sub;
  } catch {
    return null;
  }
  const list = store ? await store.getUsers() : state.users;
  return list.find((u) => u.id === sub) ?? null;
}

/**
 * Mock REST API — sin base de datos; `sessions` vive en memoria del proceso.
 */
export function createTrainingRouter(state: MockApiState, store?: PostgresStore, notify?: RealtimeNotifier): IRouter {
  const router = Router();
  const coachService = store
    ? new CoachService({
        store,
        onAssignmentsChanged: (coachId) => notify?.('assignments:changed', { coachId }),
        onTemplatesChanged: (coachId) => notify?.('wl-templates:changed', { coachId }),
        onProgramsChanged: (coachId) => notify?.('coach-programs:changed', { coachId }),
      })
    : null;

  router.get('/users', async (_req, res) => {
    const users = store ? await store.getUsers() : state.users;
    const sanitized = users.map(sanitizeUser);
    res.json(sanitized);
  });

  router.get('/auth/me', async (req, res) => {
    const user = await userFromBearer(req, state, store);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const resolved = store && user.role === 'athlete' ? await store.reconcileAthleteUserLink(user.id) : user;
    res.json({ user: sanitizeUser(resolved ?? user) });
  });

  router.post('/auth/login', async (req, res) => {
    try {
      const body = req.body as { email?: string; password?: string };
      const loginId = body.email?.trim().toLowerCase() ?? '';
      const password = body.password ?? '';
      let user: WolfUser | null = null;
      if (store) {
        user = await store.validateUser(loginId, password);
      } else {
        user =
          state.users.find((u) => userMatchesLoginId(u, loginId) && matchesStoredPassword(u, password)) ?? null;
      }
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }
      const resolved =
        store && user.role === 'athlete' ? (await store.reconcileAthleteUserLink(user.id)) ?? user : user;
      const { token, expiresIn } = await signAccessToken(resolved.id, {
        role: resolved.role,
        verified: true,
        email: resolved.email ?? '',
      });
      res.json({ user: sanitizeUser(resolved), token, expiresIn });
    } catch (err) {
      console.error('[auth/login]', err);
      const message = err instanceof Error ? err.message : 'Login failed.';
      res.status(500).json({ error: message });
    }
  });

  router.post('/auth/register', async (req, res) => {
    if (process.env.WOLF_ALLOW_PUBLIC_REGISTER === '0') {
      res.status(403).json({ error: 'Public registration is disabled.' });
      return;
    }
    const body = req.body as { name?: string; email?: string; password?: string; role?: WolfUser['role']; coachId?: string; linkedAthleteId?: string };
    if (body.role === 'super_admin') {
      res.status(403).json({ error: 'Super admin accounts cannot be created via public registration.' });
      return;
    }
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const role = body.role === 'coach' || body.role === 'athlete' ? body.role : 'athlete';
    if (!name || !email || !password || password.length < 6) {
      res.status(400).json({ error: 'name, email and password(min 6) are required.' });
      return;
    }
    const users = store ? await store.getUsers() : state.users;
    if (users.some((u) => u.email?.toLowerCase() === email)) {
      res.status(409).json({ error: 'Email already registered.' });
      return;
    }
    const next: WolfUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      passwordHash: hashPassword(password),
      ...(body.coachId ? { coachId: body.coachId } : {}),
      ...(body.linkedAthleteId ? { linkedAthleteId: body.linkedAthleteId } : {}),
    };
    if (store) {
      const created = await store.createUser({
        id: next.id,
        name: next.name,
        email: next.email ?? '',
        role: next.role,
        password,
        coachId: next.coachId,
        linkedAthleteId: next.linkedAthleteId,
      });
      const { token, expiresIn } = await signAccessToken(created.id, {
        role: created.role,
        verified: true,
        email: created.email ?? '',
      });
      res.status(201).json({ user: sanitizeUser(created), token, expiresIn });
      return;
    }
    state.users = [...state.users, next];
    const { token, expiresIn } = await signAccessToken(next.id, {
      role: next.role,
      verified: true,
      email: next.email ?? '',
    });
    res.status(201).json({ user: sanitizeUser(next), token, expiresIn });
  });

  router.post('/auth/change-password', async (req, res) => {
    const body = req.body as { email?: string; currentPassword?: string; newPassword?: string };
    const email = body.email?.trim().toLowerCase();
    const currentPassword = body.currentPassword ?? '';
    const newPassword = body.newPassword?.trim() ?? '';
    if (!email || !currentPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'email, currentPassword and newPassword(min 6) are required.' });
      return;
    }
    if (store) {
      const changed = await store.changePassword(email, currentPassword, newPassword);
      if (!changed) {
        res.status(401).json({ error: 'Current credentials are invalid.' });
        return;
      }
      res.json({ ok: true });
      return;
    }
    const idx = state.users.findIndex((u) => u.email?.toLowerCase() === email && matchesStoredPassword(u, currentPassword));
    if (idx < 0) {
      res.status(401).json({ error: 'Current credentials are invalid.' });
      return;
    }
    const prev = state.users[idx];
    const { password, passwordHash, ...rest } = prev;
    void password;
    void passwordHash;
    state.users[idx] = { ...rest, passwordHash: hashPassword(newPassword) };
    res.json({ ok: true });
  });

  router.post('/users', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor || actor.role !== 'super_admin') {
      res.status(403).json({ error: 'Super admin session required to manage users.' });
      return;
    }
    const body = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: WolfUser['role'];
      username?: string;
      coachId?: string;
      linkedAthleteId?: string;
      level?: Athlete['level'];
      bodyweight?: number;
      oneRM?: Athlete['oneRM'];
    };
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const role = body.role;
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'name, email, password and role are required.' });
      return;
    }
    if (!['super_admin', 'coach', 'athlete'].includes(role)) {
      res.status(400).json({ error: 'Invalid role.' });
      return;
    }
    const users = store ? await store.getUsers() : state.users;
    if (users.some((u) => u.email?.toLowerCase() === email)) {
      res.status(409).json({ error: 'Email already registered.' });
      return;
    }
    const username = body.username?.trim().toLowerCase();
    if (username && users.some((u) => u.username?.toLowerCase() === username)) {
      res.status(409).json({ error: 'Username already registered.' });
      return;
    }
    const athleteProfileId = body.linkedAthleteId?.trim() || (role === 'athlete' ? `ath-${Date.now()}` : undefined);
    const athleteCoachId = role === 'athlete' ? (body.coachId?.trim() || 'user-coach-wl') : body.coachId;
    const next: WolfUser = {
      id: `user-${Date.now()}`,
      name,
      role,
      email,
      username,
      passwordHash: hashPassword(password),
      coachId: athleteCoachId,
      linkedAthleteId: athleteProfileId,
    };
    if (store) {
      const created = await store.createUser({
        id: next.id,
        name: next.name,
        role: next.role,
        email: next.email ?? '',
        password,
        username: next.username,
        coachId: next.coachId,
        linkedAthleteId: next.linkedAthleteId,
      });
      if (role === 'athlete' && athleteProfileId && athleteCoachId) {
        await store.createAthleteProfile(athleteCoachId, {
          id: athleteProfileId,
          name,
          level: body.level ?? 'intermediate',
          bodyweight: Number(body.bodyweight ?? 75),
          oneRM: body.oneRM ?? { snatch: 60, cleanJerk: 80, backSquat: 100, frontSquat: 85 },
          fatigueScore: 40,
          readinessScore: 70,
        });
        notify?.('wl-athletes:changed', { coachId: athleteCoachId });
      }
      res.status(201).json(sanitizeUser(created));
      return;
    }
    state.users = [...state.users, next];
    if (role === 'athlete' && athleteProfileId && athleteCoachId) {
      const athlete: Athlete = {
        id: athleteProfileId,
        name,
        level: body.level ?? 'intermediate',
        bodyweight: Number(body.bodyweight ?? 75),
        oneRM: body.oneRM ?? { snatch: 60, cleanJerk: 80, backSquat: 100, frontSquat: 85 },
        fatigueScore: 40,
        readinessScore: 70,
      };
      state.athletes.push(athlete);
      state.wlAthleteCoachById[athleteProfileId] = athleteCoachId;
      notify?.('wl-athletes:changed', { coachId: athleteCoachId });
    }
    res.status(201).json(sanitizeUser(next));
  });

  router.patch('/users/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor || actor.role !== 'super_admin') {
      res.status(403).json({ error: 'Super admin session required to manage users.' });
      return;
    }
    const { id } = req.params as { id: string };
    const body = req.body as Partial<Pick<WolfUser, 'name' | 'role' | 'email' | 'coachId' | 'linkedAthleteId'>> & {
      password?: string;
    };
    if (store) {
      if (body.password?.trim()) {
        const ok = await store.setUserPassword(id, body.password.trim());
        if (!ok) {
          res.status(404).json({ error: 'User not found.' });
          return;
        }
        if (Object.keys(body).length === 1) {
          res.json({ ok: true });
          return;
        }
      }
      const { password: _p, ...userPatch } = body;
      void _p;
      const updated = await store.updateUser(id, userPatch);
      if (!updated) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      res.json(sanitizeUser(updated));
      return;
    }
    const idx = state.users.findIndex((u) => u.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const prev = state.users[idx];
    if (body.password?.trim()) {
      const { password, passwordHash, ...rest } = prev;
      void password;
      void passwordHash;
      state.users[idx] = { ...rest, passwordHash: hashPassword(body.password.trim()) };
      if (Object.keys(body).length === 1) {
        res.json({ ok: true });
        return;
      }
    }
    const { password: _pw, ...userPatch } = body;
    void _pw;
    const next: WolfUser = {
      ...prev,
      ...(userPatch.name ? { name: userPatch.name } : {}),
      ...(userPatch.role ? { role: userPatch.role } : {}),
      ...(userPatch.email ? { email: userPatch.email.toLowerCase() } : {}),
      ...(userPatch.coachId !== undefined ? { coachId: userPatch.coachId } : {}),
      ...(userPatch.linkedAthleteId !== undefined ? { linkedAthleteId: userPatch.linkedAthleteId } : {}),
    };
    state.users[idx] = next;
    res.json(sanitizeUser(next));
  });

  router.delete('/users/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor || actor.role !== 'super_admin') {
      res.status(403).json({ error: 'Super admin session required to manage users.' });
      return;
    }
    const { id } = req.params as { id: string };
    if (store) {
      const removed = await store.deleteUser(id);
      if (!removed) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      res.status(204).send();
      return;
    }
    const before = state.users.length;
    state.users = state.users.filter((u) => u.id !== id);
    if (state.users.length === before) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.status(204).send();
  });

  router.get('/athletes', (_req, res) => {
    res.json(state.athletes);
  });

  router.get('/exercises', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const scopeCoachId = coachIdForExercises(actor);
    if (store) {
      const rows = await store.listExercisesForCoach(scopeCoachId);
      res.json(rows);
      return;
    }
    res.json(listExercisesMock(state));
  });

  router.get('/exercise-taxonomy', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    if (store) {
      res.json(await store.getExerciseTaxonomyBundle());
      return;
    }
    res.json(getExerciseTaxonomy());
  });

  router.get('/exercise-registry/browse', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const scopeCoachId = coachIdForExercises(actor);
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const family = typeof req.query.family === 'string' ? req.query.family : 'all';
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const kind = typeof req.query.kind === 'string' ? req.query.kind : 'all';
    const includeDeprecated = req.query.includeDeprecated === 'true';

    let definitions: ExerciseDefinition[];
    let overrides: CoachExerciseOverride[];
    let taxonomy = getExerciseTaxonomy();

    if (store) {
      definitions = await store.listExerciseDefinitionsForCoach(scopeCoachId);
      overrides = await store.listCoachExerciseOverrides(scopeCoachId);
      taxonomy = await store.getExerciseTaxonomyBundle();
    } else {
      definitions = listDefinitionsMock(state, scopeCoachId);
      overrides = state.coachExerciseOverrides.filter((o) => o.coachId === scopeCoachId);
    }

    const result = browseExerciseRegistry(definitions, overrides, {
      q,
      family: family as 'all',
      status: status as 'all',
      kind: kind as 'all',
      includeDeprecated,
      coachId: scopeCoachId,
    }, taxonomy);
    res.json(result);
  });

  router.get('/exercise-definitions/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const { id } = req.params as { id: string };
    if (store) {
      const row = await store.getExerciseDefinition(id);
      if (!row) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      const versions = await store.getDefinitionVersionHistory(id);
      res.json({ definition: row.def, versions });
      return;
    }
    const def = state.exerciseDefinitions.find((d) => d.id === id);
    if (!def) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    res.json({ definition: def, versions: [] });
  });

  router.post('/exercise-definitions/:id/publish', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    if (actor.role !== 'super_admin') {
      res.status(403).json({ error: 'Registry admin required.' });
      return;
    }
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { changeReason?: string };
    if (store) {
      const published = await store.publishExerciseDefinitionById(id, actor.id, body.changeReason);
      if (!published) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      notify?.('exercise-catalog:changed');
      res.json(published);
      return;
    }
    const def = state.exerciseDefinitions.find((d) => d.id === id);
    if (!def) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    def.version = (def.version ?? 1) + 1;
    def.lifecycleStatus = 'official';
    def.publishedAt = new Date().toISOString();
    notify?.('exercise-catalog:changed');
    res.json(def);
  });

  router.post('/exercise-definitions/:id/fork', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = parseExerciseDefinitionBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const coachId = coachIdForExercises(actor);
    if (store) {
      const forked = await store.forkExerciseDefinitionForCoach(coachId, id, parsed.value);
      notify?.('exercise-catalog:changed');
      res.status(201).json(forked);
      return;
    }
    const bundle = getExerciseTaxonomy();
    const forked = buildExerciseDefinition(`def-fork-${Date.now()}`, parsed.value, bundle, { coachId });
    forked.parentDefinitionId = id;
    forked.lifecycleStatus = 'coach_modified';
    state.exerciseDefinitions = [...state.exerciseDefinitions, forked];
    notify?.('exercise-catalog:changed');
    res.status(201).json(forked);
  });

  router.get('/coach-exercise-overrides', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const coachId = coachIdForExercises(actor);
    if (store) {
      res.json(await store.listCoachExerciseOverrides(coachId));
      return;
    }
    res.json(state.coachExerciseOverrides.filter((o) => o.coachId === coachId));
  });

  router.put('/coach-exercise-overrides/:baseId', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { baseId } = req.params as { baseId: string };
    const patch = req.body as OverridePatch;
    const coachId = coachIdForExercises(actor);
    if (store) {
      const saved = await store.upsertCoachExerciseOverride(coachId, baseId, patch, patch.methodology);
      notify?.('exercise-catalog:changed');
      res.json(saved);
      return;
    }
    const id = `ovr-${coachId}-${baseId}`;
    const existing = state.coachExerciseOverrides.find((o) => o.coachId === coachId && o.baseDefinitionId === baseId);
    const saved: CoachExerciseOverride = existing
      ? { ...existing, override: { ...existing.override, ...patch } }
      : { id, coachId, baseDefinitionId: baseId, override: patch };
    state.coachExerciseOverrides = [
      ...state.coachExerciseOverrides.filter((o) => o.id !== saved.id),
      saved,
    ];
    notify?.('exercise-catalog:changed');
    res.json(saved);
  });

  router.get('/technical-collections', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const scopeCoachId = coachIdForExercises(actor);
    if (store) {
      res.json(await store.listTechnicalCollectionsForCoach(scopeCoachId));
      return;
    }
    res.json(state.technicalCollections);
  });

  router.get('/exercise-relationships/graph', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const scopeCoachId = coachIdForExercises(actor);
    const rules = store
      ? await store.listExerciseRelationshipRules(scopeCoachId)
      : state.exerciseRelationships.filter((r) => !r.coachId || r.coachId === scopeCoachId);
    const nodes = new Set<string>();
    for (const r of rules) {
      if (r.fromRef.type === 'family') nodes.add(r.fromRef.code);
      if (r.toRef.type === 'family') nodes.add(r.toRef.code);
    }
    res.json({
      nodes: [...nodes].map((code) => ({ id: code, label: code })),
      edges: rules.filter((r) => r.isActive).map((r) => ({
        id: r.id,
        from: r.fromRef.code,
        to: r.toRef.code,
        ratioMean: r.ratioMean,
        type: r.relationshipType,
      })),
    });
  });

  router.get('/exercise-definitions', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const scopeCoachId = coachIdForExercises(actor);
    if (store) {
      res.json(await store.listExerciseDefinitionsForCoach(scopeCoachId));
      return;
    }
    res.json(listDefinitionsMock(state, scopeCoachId));
  });

  router.post('/exercise-definitions/compose-preview', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const parsed = parseComposePreviewBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const bundle = store ? await store.getExerciseTaxonomyBundle() : getExerciseTaxonomy();
    const { composition, locale } = parsed.value;
    const displayName = composeDisplayName(composition, bundle, locale);
    const signature = buildSignature(composition);
    const warnings = validateComposition(composition, bundle);
    res.json({ displayName, signature, warnings });
  });

  router.post('/exercise-definitions', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const parsed = parseExerciseDefinitionBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const coachId = coachIdForExercises(actor);
    const id = `def-${Date.now()}`;
    if (store) {
      const created = await store.createExerciseDefinitionForCoach(coachId, id, parsed.value);
      notify?.('exercise-catalog:changed');
      res.status(201).json(created);
      return;
    }
    const bundle = getExerciseTaxonomy();
    const created = buildExerciseDefinition(id, parsed.value, bundle, { coachId });
    const sig = created.signature;
    if (state.exerciseDefinitions.some((d) => d.coachId === coachId && d.signature === sig)) {
      res.status(409).json({ error: 'Duplicate composition for this coach.' });
      return;
    }
    state.exerciseDefinitions = [...state.exerciseDefinitions, created];
    notify?.('exercise-catalog:changed');
    res.status(201).json(created);
  });

  router.patch('/exercise-definitions/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = parseExerciseDefinitionBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    if (store) {
      const existing = await store.getExerciseDefinition(id);
      if (!existing) {
        res.status(404).json({ error: 'Exercise not found.' });
        return;
      }
      if (existing.coachId === null) {
        res.status(403).json({ error: 'System exercises cannot be edited.' });
        return;
      }
      if (existing.coachId !== coachIdForExercises(actor)) {
        res.status(403).json({ error: 'You can only edit your own exercises.' });
        return;
      }
      const updated = await store.updateExerciseDefinitionById(id, parsed.value);
      if (!updated) {
        res.status(404).json({ error: 'Exercise not found.' });
        return;
      }
      notify?.('exercise-catalog:changed');
      res.json(updated);
      return;
    }
    const idx = state.exerciseDefinitions.findIndex((d) => d.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Exercise not found.' });
      return;
    }
    if (!state.exerciseDefinitions[idx]?.coachId) {
      res.status(403).json({ error: 'System exercises cannot be edited.' });
      return;
    }
    const bundle = getExerciseTaxonomy();
    const updated = buildExerciseDefinition(id, parsed.value, bundle, { coachId: state.exerciseDefinitions[idx]!.coachId! });
    state.exerciseDefinitions[idx] = updated;
    notify?.('exercise-catalog:changed');
    res.json(updated);
  });

  router.delete('/exercise-definitions/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    if (store) {
      const existing = await store.getExerciseDefinition(id);
      if (!existing) {
        res.status(404).json({ error: 'Exercise not found.' });
        return;
      }
      if (existing.coachId === null) {
        res.status(403).json({ error: 'System exercises cannot be deleted.' });
        return;
      }
      const removed = await store.deleteExerciseDefinitionById(id, coachIdForExercises(actor));
      if (!removed) {
        res.status(404).json({ error: 'Exercise not found.' });
        return;
      }
      notify?.('exercise-catalog:changed');
      res.status(204).send();
      return;
    }
    const def = state.exerciseDefinitions.find((d) => d.id === id);
    if (!def) {
      res.status(404).json({ error: 'Exercise not found.' });
      return;
    }
    if (!def.coachId) {
      res.status(403).json({ error: 'System exercises cannot be deleted.' });
      return;
    }
    state.exerciseDefinitions = state.exerciseDefinitions.filter((d) => d.id !== id);
    notify?.('exercise-catalog:changed');
    res.status(204).send();
  });

  router.get('/exercise-relationships', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const scopeCoachId = coachIdForExercises(actor);
    if (store) {
      res.json(await store.listExerciseRelationshipRules(scopeCoachId));
      return;
    }
    res.json(state.exerciseRelationships.filter((r) => !r.coachId || r.coachId === scopeCoachId));
  });

  router.post('/exercise-relationships', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body as Partial<ExerciseRelationshipRule>;
    if (store) {
      const coachId = coachIdForExercises(actor);
      const rule = await store.createExerciseRelationshipRule(
        coachId,
        body as Omit<ExerciseRelationshipRule, 'id' | 'coachId'>,
      );
      notify?.('exercise-catalog:changed');
      res.status(201).json(rule);
      return;
    }
    if (!body.fromRef?.code || !body.toRef?.code || !body.relationshipType) {
      res.status(400).json({ error: 'fromRef, toRef, relationshipType required.' });
      return;
    }
    const coachId = coachIdForExercises(actor);
    const rule: ExerciseRelationshipRule = {
      id: `rel-${Date.now()}`,
      coachId,
      fromRef: body.fromRef,
      toRef: body.toRef,
      relationshipType: body.relationshipType,
      ratioMin: Number(body.ratioMin ?? 0.9),
      ratioMax: Number(body.ratioMax ?? 1.1),
      ratioMean: Number(body.ratioMean ?? 1),
      confidence: Number(body.confidence ?? 0.5),
      methodology: body.methodology ?? 'custom',
      athleteLevel: body.athleteLevel ?? null,
      notes: body.notes ?? null,
      isActive: body.isActive !== false,
    };
    state.exerciseRelationships = [...state.exerciseRelationships, rule];
    notify?.('exercise-catalog:changed');
    res.status(201).json(rule);
  });

  router.delete('/exercise-relationships/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const { id } = req.params as { id: string };
    if (store) {
      const coachId = coachIdForExercises(actor);
      const ok = await store.deleteExerciseRelationshipRule(id, coachId);
      if (!ok) {
        res.status(404).json({ error: 'Rule not found.' });
        return;
      }
      notify?.('exercise-catalog:changed');
      res.status(204).send();
      return;
    }
    const rule = state.exerciseRelationships.find((r) => r.id === id);
    if (!rule) {
      res.status(404).json({ error: 'Rule not found.' });
      return;
    }
    if (!rule.coachId) {
      res.status(403).json({ error: 'System rules cannot be deleted.' });
      return;
    }
    state.exerciseRelationships = state.exerciseRelationships.filter((r) => r.id !== id);
    notify?.('exercise-catalog:changed');
    res.status(204).send();
  });

  router.get('/athletes/:athleteProfileId/load-resolver', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const { athleteProfileId } = req.params as { athleteProfileId: string };
    const definitionId = typeof req.query.definitionId === 'string' ? req.query.definitionId : '';
    if (!definitionId) {
      res.status(400).json({ error: 'definitionId query required.' });
      return;
    }
    const athlete = state.athletes.find((a) => a.id === athleteProfileId);
    if (!athlete) {
      res.status(404).json({ error: 'Athlete not found.' });
      return;
    }
    let def: ExerciseDefinition | undefined;
    if (store) {
      const row = await store.getExerciseDefinition(definitionId);
      def = row?.def;
    } else {
      def = state.exerciseDefinitions.find((d) => d.id === definitionId);
    }
    if (!def) {
      res.status(404).json({ error: 'Definition not found.' });
      return;
    }
    const scopeCoachId = coachIdForExercises(actor);
    const rules = store
      ? await store.listExerciseRelationshipRules(scopeCoachId)
      : state.exerciseRelationships;
    const calibrations = store
      ? await store.getAthleteLoadCalibrations(athleteProfileId)
      : state.athleteLoadCalibrations.filter((c) => c.athleteProfileId === athleteProfileId);
    const suggestion = resolveLoadSuggestion({
      athlete,
      definition: def,
      rules,
      calibrations: calibrations.map((c) => ({ relationshipRuleId: c.relationshipRuleId, ratioMean: c.ratioMean })),
    });
    res.json({ suggestion });
  });

  router.post('/prescription-events', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body as {
      athleteProfileId?: string;
      definitionId?: string;
      prescribedPct?: number;
      completed?: boolean;
      rpe?: number;
    };
    if (!body.athleteProfileId || !body.definitionId || body.prescribedPct == null) {
      res.status(400).json({ error: 'athleteProfileId, definitionId, prescribedPct required.' });
      return;
    }
    const event: Omit<PrescriptionEvent, 'id'> = {
      athleteProfileId: body.athleteProfileId,
      definitionId: body.definitionId,
      prescribedPct: Number(body.prescribedPct),
      completed: body.completed,
      rpe: body.rpe,
      recordedAt: new Date().toISOString(),
    };
    if (store) {
      const saved = await store.recordPrescriptionEvent(event);
      res.status(201).json(saved);
      return;
    }
    const saved: PrescriptionEvent = { ...event, id: `pe-${Date.now()}` };
    state.prescriptionEvents.push(saved);
    res.status(201).json(saved);
  });

  router.post('/exercises', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const parsed = parseExerciseUpsertBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const coachId = coachIdForExercises(actor);
    const id = `cex-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    if (store) {
      try {
        const created = await store.createCoachExercise(coachId, id, parsed.value);
        notify?.('exercises:changed');
        res.status(201).json(created);
      } catch (err: unknown) {
        const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
        if (code === '23505') {
          res.status(409).json({ error: 'Exercise id already exists.' });
          return;
        }
        throw err;
      }
      return;
    }
    const created = normalizeExercise({ id, ...parsed.value } as unknown as Record<string, unknown>);
    state.exercises = [...state.exercises, created];
    notify?.('exercises:changed');
    res.status(201).json(created);
  });

  router.patch('/exercises/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = parseExerciseUpsertBody(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    if (store) {
      const existing = await store.getExerciseById(id);
      if (!existing) {
        res.status(404).json({ error: 'Exercise not found.' });
        return;
      }
      if (existing.coachId === null) {
        res.status(403).json({ error: 'System exercises cannot be edited. Duplicate as a custom exercise.' });
        return;
      }
      if (existing.coachId !== coachIdForExercises(actor)) {
        res.status(403).json({ error: 'You can only edit your own exercises.' });
        return;
      }
      const updated = await store.updateCoachExercise(id, parsed.value);
      if (!updated) {
        res.status(404).json({ error: 'Exercise not found.' });
        return;
      }
      notify?.('exercises:changed');
      res.json(updated);
      return;
    }
    const idx = state.exercises.findIndex((e) => e.id === id);
    if (idx < 0) {
      if (mockExercises.some((e) => e.id === id)) {
        res.status(403).json({ error: 'System exercises cannot be edited. Duplicate as a custom exercise.' });
        return;
      }
      res.status(404).json({ error: 'Exercise not found.' });
      return;
    }
    const updated = normalizeExercise({ id, ...parsed.value } as unknown as Record<string, unknown>);
    state.exercises[idx] = updated;
    notify?.('exercises:changed');
    res.json(updated);
  });

  router.delete('/exercises/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    if (store) {
      const existing = await store.getExerciseById(id);
      if (!existing) {
        res.status(404).json({ error: 'Exercise not found.' });
        return;
      }
      if (existing.coachId === null) {
        res.status(403).json({ error: 'System exercises cannot be deleted.' });
        return;
      }
      const removed = await store.deleteCoachExercise(id, coachIdForExercises(actor));
      if (!removed) {
        res.status(404).json({ error: 'Exercise not found.' });
        return;
      }
      notify?.('exercises:changed');
      res.status(204).send();
      return;
    }
    if (mockExercises.some((e) => e.id === id)) {
      res.status(403).json({ error: 'System exercises cannot be deleted.' });
      return;
    }
    const before = state.exercises.length;
    state.exercises = state.exercises.filter((e) => e.id !== id);
    if (state.exercises.length === before) {
      res.status(404).json({ error: 'Exercise not found.' });
      return;
    }
    notify?.('exercises:changed');
    res.status(204).send();
  });

  router.get('/sessions', (_req, res) => {
    res.json(state.sessions);
  });

  router.get('/assignments', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const assignments = await listAssignmentsForActor(actor, state, store);
    res.json(assignments);
  });

  router.get('/assignments/athlete/:athleteProfileId', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const resolved = await resolveActorUser(actor, state, store);
    const { athleteProfileId } = req.params as { athleteProfileId: string };
    if (resolved.role === 'athlete' && resolved.linkedAthleteId !== athleteProfileId) {
      const allowed = await listAssignmentsForActor(resolved, state, store);
      if (!allowed.some((a) => a.athleteProfileId === athleteProfileId)) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }
    }
    const match = store
      ? await store.getAssignmentByAthlete(athleteProfileId)
      : state.assignments
          .filter((a) => a.athleteProfileId === athleteProfileId)
          .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];
    if (!match) {
      res.status(404).json({ error: 'No assignment found for athlete profile.' });
      return;
    }
    if (!canReadAssignment(actor, match)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    res.json(match);
  });

  router.post('/assignments', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const body = req.body as { coachId?: string; athleteProfileId?: string; athleteUserId?: string; program?: ProgramAssignment['program'] };
    if (!body.coachId || !body.athleteProfileId || !body.program) {
      res.status(400).json({ error: 'coachId, athleteProfileId and program are required.' });
      return;
    }
    if (actor.role === 'coach' && body.coachId !== actor.id) {
      res.status(403).json({ error: 'coachId must match the authenticated coach.' });
      return;
    }
    if (coachService) {
      try {
        const created = await coachService.assignProgramToAthlete(
          body.coachId,
          body.athleteProfileId,
          body.program,
          body.athleteUserId,
        );
        res.status(201).json(created);
        return;
      } catch (err) {
        if (err instanceof CoachServiceError) {
          res.status(err.code === 'ATHLETE_NOT_FOUND' ? 404 : 400).json({ error: err.message });
          return;
        }
        throw err;
      }
    }
    const id = `asg-${Date.now()}`;
    const clonedProgram = cloneProgramForAthlete(body.program, body.athleteProfileId);
    const next: ProgramAssignment = {
      id,
      coachId: body.coachId,
      athleteProfileId: body.athleteProfileId,
      ...(body.athleteUserId ? { athleteUserId: body.athleteUserId } : {}),
      version: 1,
      versionHistory: [],
      program: clonedProgram,
      assignedAt: new Date().toISOString(),
    };
    state.assignments = upsertAssignmentInList(state.assignments, next);
    notify?.('assignments:changed', { id: next.id, athleteProfileId: next.athleteProfileId });
    res.status(201).json(next);
  });

  router.patch('/assignments/:id/program', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const { id } = req.params as { id: string };
    const existing = await findAssignmentById(id, state, store);
    if (!existing) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    if (!canWriteAssignment(actor, existing)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const body = req.body as { program?: ProgramAssignment['program'] };
    if (!body.program) {
      res.status(400).json({ error: 'program is required.' });
      return;
    }
    if (coachService) {
      try {
        const updated = await coachService.updateActiveAssignment(existing.coachId, id, {
          program: body.program,
        });
        res.json(updated);
        return;
      } catch (err) {
        if (err instanceof CoachServiceError) {
          res.status(404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }
    if (store) {
      const updated = await store.updateAssignmentProgram(id, body.program);
      if (!updated) {
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }
      notify?.('assignments:changed', { id: updated.id, athleteProfileId: updated.athleteProfileId });
      res.json(updated);
      return;
    }
    const idx = state.assignments.findIndex((a) => a.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    const current = state.assignments[idx];
    const updated: ProgramAssignment = {
      ...current,
      version: current.version + 1,
      program: { ...body.program, athleteId: current.athleteProfileId },
      versionHistory: [
        ...current.versionHistory,
        { version: current.version, editedAt: new Date().toISOString(), program: current.program },
      ],
    };
    state.assignments[idx] = updated;
    notify?.('assignments:changed', { id: updated.id, athleteProfileId: updated.athleteProfileId });
    res.json(updated);
  });

  router.get('/completions', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const assignmentId = typeof req.query.assignmentId === 'string' ? req.query.assignmentId : undefined;
    if (assignmentId) {
      const assignment = await findAssignmentById(assignmentId, state, store);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }
      if (!canReadAssignment(actor, assignment)) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }
    }
    if (store) {
      const list = await store.getCompletions(assignmentId);
      if (!assignmentId && actor.role !== 'super_admin') {
        const allowed = new Set((await listAssignmentsForActor(actor, state, store)).map((a) => a.id));
        res.json(list.filter((c) => allowed.has(c.assignmentId)));
        return;
      }
      res.json(list);
      return;
    }
    const allowedIds = new Set((await listAssignmentsForActor(actor, state, store)).map((a) => a.id));
    const list = (assignmentId ? state.completions.filter((c) => c.assignmentId === assignmentId) : state.completions).filter(
      (c) => actor.role === 'super_admin' || allowedIds.has(c.assignmentId),
    );
    res.json(list);
  });

  router.post('/completions/toggle', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body as {
      assignmentId?: string;
      weekNumber?: number;
      dayNumber?: number;
      exerciseIndex?: number;
    };
    if (!body.assignmentId || body.weekNumber == null || body.dayNumber == null) {
      res.status(400).json({ error: 'assignmentId, weekNumber and dayNumber are required.' });
      return;
    }
    const assignment = await findAssignmentById(body.assignmentId, state, store);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    if (!canLogAssignment(actor, assignment)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const payload = {
      assignmentId: body.assignmentId,
      weekNumber: Number(body.weekNumber),
      dayNumber: Number(body.dayNumber),
      ...(body.exerciseIndex != null ? { exerciseIndex: Number(body.exerciseIndex) } : {}),
    };
    if (store) {
      const active = await store.toggleCompletion(payload);
      res.json({ active });
      return;
    }
    const match = (c: SessionCompletion) =>
      c.assignmentId === payload.assignmentId &&
      c.weekNumber === payload.weekNumber &&
      c.dayNumber === payload.dayNumber &&
      (payload.exerciseIndex == null ? c.exerciseIndex == null : c.exerciseIndex === payload.exerciseIndex);
    const idx = state.completions.findIndex(match);
    if (idx >= 0) {
      state.completions.splice(idx, 1);
      res.json({ active: false });
      return;
    }
    state.completions.push({
      ...payload,
      completedAt: new Date().toISOString(),
    });
    res.json({ active: true });
  });

  router.post('/completions/session-toggle', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body as {
      assignmentId?: string;
      weekNumber?: number;
      dayNumber?: number;
      exerciseCount?: number;
    };
    if (!body.assignmentId || body.weekNumber == null || body.dayNumber == null) {
      res.status(400).json({ error: 'assignmentId, weekNumber and dayNumber are required.' });
      return;
    }
    const assignment = await findAssignmentById(body.assignmentId, state, store);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    if (!canLogAssignment(actor, assignment)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const assignmentId = body.assignmentId;
    const weekNumber = Number(body.weekNumber);
    const dayNumber = Number(body.dayNumber);
    const exerciseCount = Number(body.exerciseCount ?? 0);
    if (store) {
      const list = await store.getCompletions(assignmentId);
      const dayDone = isDayComplete(list, assignmentId, weekNumber, dayNumber, exerciseCount);
      if (dayDone) {
        await store.deleteCompletionsForDay(assignmentId, weekNumber, dayNumber);
        res.json({ active: false });
        return;
      }
      await store.deleteCompletionsForDay(assignmentId, weekNumber, dayNumber);
      await store.toggleCompletion({ assignmentId, weekNumber, dayNumber });
      res.json({ active: true });
      return;
    }
    const dayDone = isDayComplete(state.completions, assignmentId, weekNumber, dayNumber, exerciseCount);
    state.completions = state.completions.filter(
      (c) => !(c.assignmentId === assignmentId && c.weekNumber === weekNumber && c.dayNumber === dayNumber),
    );
    if (!dayDone) {
      state.completions.push({
        assignmentId,
        weekNumber,
        dayNumber,
        completedAt: new Date().toISOString(),
      });
      res.json({ active: true });
      return;
    }
    res.json({ active: false });
  });

  router.get('/set-logs', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const assignmentId = typeof req.query.assignmentId === 'string' ? req.query.assignmentId : undefined;
    if (assignmentId) {
      const assignment = await findAssignmentById(assignmentId, state, store);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }
      if (!canReadAssignment(actor, assignment)) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }
    }
    if (store) {
      const list = await store.getSetLogs(assignmentId);
      if (!assignmentId && actor.role !== 'super_admin') {
        const allowed = new Set((await listAssignmentsForActor(actor, state, store)).map((a) => a.id));
        res.json(list.filter((l) => allowed.has(l.assignmentId)));
        return;
      }
      res.json(list);
      return;
    }
    const allowedIds = new Set((await listAssignmentsForActor(actor, state, store)).map((a) => a.id));
    const list = (assignmentId ? state.setLogs.filter((l) => l.assignmentId === assignmentId) : state.setLogs).filter(
      (l) => actor.role === 'super_admin' || allowedIds.has(l.assignmentId),
    );
    res.json(list);
  });

  router.post('/set-logs/toggle', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body as {
      assignmentId?: string;
      weekNumber?: number;
      dayNumber?: number;
      exerciseIndex?: number;
      schemeIndex?: number;
      setInstance?: number;
      actualKg?: number;
      actualReps?: number;
      actualSegmentReps?: number[];
      actualRpe?: number;
    };
    if (
      !body.assignmentId ||
      body.weekNumber == null ||
      body.dayNumber == null ||
      body.exerciseIndex == null ||
      body.schemeIndex == null ||
      body.setInstance == null
    ) {
      res.status(400).json({ error: 'assignmentId, weekNumber, dayNumber, exerciseIndex, schemeIndex, setInstance required.' });
      return;
    }
    const assignment = await findAssignmentById(body.assignmentId!, state, store);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    if (!canLogAssignment(actor, assignment)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const payload = {
      assignmentId: body.assignmentId,
      weekNumber: Number(body.weekNumber),
      dayNumber: Number(body.dayNumber),
      exerciseIndex: Number(body.exerciseIndex),
      schemeIndex: Number(body.schemeIndex),
      setInstance: Number(body.setInstance),
      actualKg: body.actualKg != null ? Number(body.actualKg) : undefined,
      actualReps: body.actualReps != null ? Number(body.actualReps) : undefined,
      actualSegmentReps: Array.isArray(body.actualSegmentReps)
        ? body.actualSegmentReps.map((n) => Number(n))
        : undefined,
      actualRpe: body.actualRpe != null ? Number(body.actualRpe) : undefined,
    };
    if (store) {
      const active = await store.toggleSetLog(payload);
      res.json({ active });
      return;
    }
    const match = (l: SetCompletionLog) =>
      l.assignmentId === payload.assignmentId &&
      l.weekNumber === payload.weekNumber &&
      l.dayNumber === payload.dayNumber &&
      l.exerciseIndex === payload.exerciseIndex &&
      l.schemeIndex === payload.schemeIndex &&
      l.setInstance === payload.setInstance;
    const idx = state.setLogs.findIndex(match);
    if (idx >= 0) {
      state.setLogs.splice(idx, 1);
      res.json({ active: false });
      return;
    }
    state.setLogs.push({
      ...payload,
      completedAt: new Date().toISOString(),
    });
    res.json({ active: true });
  });

  router.patch('/set-logs', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const body = req.body as {
      assignmentId?: string;
      weekNumber?: number;
      dayNumber?: number;
      exerciseIndex?: number;
      schemeIndex?: number;
      setInstance?: number;
      actualKg?: number;
      actualReps?: number;
      actualSegmentReps?: number[];
      actualRpe?: number;
    };
    if (
      !body.assignmentId ||
      body.weekNumber == null ||
      body.dayNumber == null ||
      body.exerciseIndex == null ||
      body.schemeIndex == null ||
      body.setInstance == null
    ) {
      res.status(400).json({ error: 'assignmentId, weekNumber, dayNumber, exerciseIndex, schemeIndex, setInstance required.' });
      return;
    }
    const patchAssignment = await findAssignmentById(body.assignmentId, state, store);
    if (!patchAssignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    if (!canLogAssignment(actor, patchAssignment)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const payload = {
      assignmentId: body.assignmentId,
      weekNumber: Number(body.weekNumber),
      dayNumber: Number(body.dayNumber),
      exerciseIndex: Number(body.exerciseIndex),
      schemeIndex: Number(body.schemeIndex),
      setInstance: Number(body.setInstance),
      actualKg: body.actualKg != null ? Number(body.actualKg) : undefined,
      actualReps: body.actualReps != null ? Number(body.actualReps) : undefined,
      actualSegmentReps: Array.isArray(body.actualSegmentReps)
        ? body.actualSegmentReps.map((n) => Number(n))
        : undefined,
      actualRpe: body.actualRpe != null ? Number(body.actualRpe) : undefined,
    };
    if (store) {
      const updated = await store.patchSetLog(payload);
      res.json(updated);
      return;
    }
    const match = (l: SetCompletionLog) =>
      l.assignmentId === payload.assignmentId &&
      l.weekNumber === payload.weekNumber &&
      l.dayNumber === payload.dayNumber &&
      l.exerciseIndex === payload.exerciseIndex &&
      l.schemeIndex === payload.schemeIndex &&
      l.setInstance === payload.setInstance;
    const idx = state.setLogs.findIndex(match);
    if (idx >= 0) {
      state.setLogs[idx] = {
        ...state.setLogs[idx]!,
        actualKg: payload.actualKg ?? state.setLogs[idx]!.actualKg,
        actualReps: payload.actualReps ?? state.setLogs[idx]!.actualReps,
        actualSegmentReps: payload.actualSegmentReps ?? state.setLogs[idx]!.actualSegmentReps,
        actualRpe: payload.actualRpe ?? state.setLogs[idx]!.actualRpe,
      };
      res.json(state.setLogs[idx]);
      return;
    }
    const created: SetCompletionLog = {
      ...payload,
      completedAt: new Date().toISOString(),
    };
    state.setLogs.push(created);
    res.json(created);
  });

  router.delete('/assignments/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const { id } = req.params as { id: string };
    const existing = await findAssignmentById(id, state, store);
    if (!existing) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    if (!canWriteAssignment(actor, existing)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    if (store) {
      const removed = await store.deleteAssignment(id);
      if (!removed) {
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }
      notify?.('assignments:changed', { id });
      res.status(204).send();
      return;
    }
    const before = state.assignments.length;
    state.assignments = state.assignments.filter((a) => a.id !== id);
    if (state.assignments.length === before) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    notify?.('assignments:changed', { id });
    res.status(204).send();
  });

  router.get('/wl-athletes/me', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor || actor.role !== 'athlete' || !actor.linkedAthleteId) {
      res.status(403).json({ error: 'Athlete session required.' });
      return;
    }
    if (store) {
      const profile = await store.getAthleteProfileById(actor.linkedAthleteId);
      if (!profile) {
        res.status(404).json({ error: 'Athlete profile not found.' });
        return;
      }
      const { coachId: _c, createdAt: _ca, updatedAt: _ua, ...athlete } = profile;
      res.json(athlete);
      return;
    }
    const athlete = state.athletes.find((a) => a.id === actor.linkedAthleteId);
    if (!athlete) {
      res.status(404).json({ error: 'Athlete profile not found.' });
      return;
    }
    res.json(athlete);
  });

  router.get('/wl-athletes', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    if (store) {
      const rows =
        actor.role === 'super_admin'
          ? await store.listAllAthleteProfiles()
          : await store.listAthleteProfiles(actor.id);
      res.json(rows.map(({ coachId: _c, createdAt: _ca, updatedAt: _ua, ...athlete }) => athlete));
      return;
    }
    if (actor.role === 'super_admin') {
      res.json(state.athletes);
      return;
    }
    res.json(listMockWlAthletes(actor, state));
  });

  router.post('/wl-athletes', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const body = (req.body ?? {}) as Partial<Athlete> & { id?: string; coachId?: string };
    const coachId = actor!.role === 'coach' ? actor!.id : body.coachId?.trim();
    if (!coachId) {
      res.status(400).json({ error: 'coachId is required.' });
      return;
    }
    if (!body.name?.trim() || !body.level || !body.oneRM) {
      res.status(400).json({ error: 'name, level and oneRM are required.' });
      return;
    }
    const id = body.id?.trim() || `ath-${Date.now()}`;
    const athlete: Athlete = {
      id,
      name: body.name.trim(),
      level: body.level,
      bodyweight: Number(body.bodyweight ?? 70),
      oneRM: body.oneRM,
      fatigueScore: Number(body.fatigueScore ?? 40),
      readinessScore: Number(body.readinessScore ?? 70),
    };
    if (store) {
      const created = await store.createAthleteProfile(coachId, athlete);
      notify?.('wl-athletes:changed', { coachId });
      const { coachId: _c, createdAt: _ca, updatedAt: _ua, ...profile } = created;
      res.status(201).json(profile);
      return;
    }
    if (state.athletes.some((a) => a.id === id)) {
      res.status(409).json({ error: 'Athlete id already exists.' });
      return;
    }
    state.athletes.push(athlete);
    state.wlAthleteCoachById[id] = coachId;
    notify?.('wl-athletes:changed', { coachId });
    res.status(201).json({ ...athlete, coachId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  });

  router.patch('/wl-athletes/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    const patch = (req.body ?? {}) as Partial<Athlete>;
    if (store) {
      const existing = await store.getAthleteProfileById(id);
      if (!existing) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      if (actor!.role === 'coach' && existing.coachId !== actor!.id) {
        res.status(403).json({ error: 'Not your athlete.' });
        return;
      }
      const updated = await store.updateAthleteProfile(existing.coachId, id, patch);
      if (!updated) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      notify?.('wl-athletes:changed', { coachId: updated.coachId });
      const { coachId: _c, createdAt: _ca, updatedAt: _ua, ...profile } = updated;
      res.json(profile);
      return;
    }
    const ownerCoachId = coachIdForMockAthlete(id, state.users, state.wlAthleteCoachById);
    if (actor!.role === 'coach' && ownerCoachId !== actor!.id) {
      res.status(403).json({ error: 'Not your athlete.' });
      return;
    }
    const idx = state.athletes.findIndex((a) => a.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    state.athletes[idx] = { ...state.athletes[idx]!, ...patch, id };
    const coachId = coachIdForMockAthlete(id, state.users, state.wlAthleteCoachById);
    notify?.('wl-athletes:changed', { coachId });
    res.json(state.athletes[idx]);
  });

  router.delete('/wl-athletes/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor || actor.role !== 'super_admin') {
      res.status(403).json({ error: 'Super admin session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    if (store) {
      const existing = await store.getAthleteProfileById(id);
      const result = await store.deleteAthleteProfileById(id);
      if (!result.ok) {
        res.status(result.error?.includes('active') ? 409 : 404).json({ error: result.error ?? 'Not found.' });
        return;
      }
      notify?.('wl-athletes:changed', { coachId: existing?.coachId });
      res.status(204).send();
      return;
    }
    const coachId = coachIdForMockAthlete(id, state.users, state.wlAthleteCoachById);
    if (!state.athletes.some((a) => a.id === id)) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    if (state.assignments.some((a) => a.athleteProfileId === id)) {
      res.status(409).json({ error: 'Cannot delete athlete with an active assignment.' });
      return;
    }
    state.athletes = state.athletes.filter((a) => a.id !== id);
    delete state.wlAthleteCoachById[id];
    notify?.('wl-athletes:changed', { coachId });
    res.status(204).send();
  });

  router.get('/wl-templates', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const coachId = actor.role === 'super_admin' ? coachScopeId(actor) : actor.id;
    if (store) {
      res.json(await store.listCoachTemplates(coachId));
      return;
    }
    res.json(state.coachWlTemplates.filter((t) => t.coachId === coachId));
  });

  router.post('/wl-templates', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor) || actor.role !== 'coach') {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const body = (req.body ?? {}) as { name?: string; program?: GeneratedProgram; sourceAssignmentId?: string };
    if (!body.name?.trim() || !body.program) {
      res.status(400).json({ error: 'name and program are required.' });
      return;
    }
    const id = `tpl-${Date.now()}`;
    const now = new Date().toISOString();
    if (store) {
      const created = await store.createCoachTemplate({
        id,
        coachId: actor.id,
        name: body.name.trim(),
        program: body.program,
        sourceAssignmentId: body.sourceAssignmentId,
      });
      notify?.('wl-templates:changed', { coachId: actor.id });
      res.status(201).json(created);
      return;
    }
    const next: CoachWlProgramTemplate = {
      id,
      coachId: actor.id,
      name: body.name.trim(),
      program: body.program,
      sourceAssignmentId: body.sourceAssignmentId,
      createdAt: now,
      updatedAt: now,
    };
    state.coachWlTemplates = [next, ...state.coachWlTemplates];
    notify?.('wl-templates:changed', { coachId: actor.id });
    res.status(201).json(next);
  });

  router.post('/wl-templates/:templateId/assign', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { templateId } = req.params as { templateId: string };
    const body = (req.body ?? {}) as { athleteProfileId?: string; athleteUserId?: string; programName?: string };
    if (!body.athleteProfileId?.trim()) {
      res.status(400).json({ error: 'athleteProfileId is required.' });
      return;
    }
    const coachId = actor.role === 'coach' ? actor.id : coachScopeId(actor);
    if (coachService) {
      try {
        const assignment = await coachService.assignTemplateToAthlete(coachId, templateId, {
          athleteProfileId: body.athleteProfileId.trim(),
          athleteUserId: body.athleteUserId,
          programName: body.programName,
        });
        res.status(201).json(assignment);
        return;
      } catch (err) {
        if (err instanceof CoachServiceError) {
          res.status(err.code === 'TEMPLATE_NOT_FOUND' || err.code === 'ATHLETE_NOT_FOUND' ? 404 : 400).json({
            error: err.message,
          });
          return;
        }
        throw err;
      }
    }
    const tpl = state.coachWlTemplates.find((t) => t.id === templateId && t.coachId === coachId);
    if (!tpl) {
      res.status(404).json({ error: 'Program template not found.' });
      return;
    }
    const athlete = state.athletes.find((a) => a.id === body.athleteProfileId);
    if (!athlete || coachIdForMockAthlete(athlete.id, state.users, state.wlAthleteCoachById) !== coachId) {
      res.status(404).json({ error: 'Athlete profile not found for this coach.' });
      return;
    }
    const clonedProgram = cloneProgramForAthlete(tpl.program, body.athleteProfileId, {
      name: body.programName?.trim() || tpl.name,
    });
    const id = `asg-${Date.now()}`;
    const next: ProgramAssignment = {
      id,
      coachId,
      athleteProfileId: body.athleteProfileId.trim(),
      ...(body.athleteUserId ? { athleteUserId: body.athleteUserId } : {}),
      sourceTemplateId: templateId,
      version: 1,
      versionHistory: [],
      program: clonedProgram,
      assignedAt: new Date().toISOString(),
    };
    state.assignments = upsertAssignmentInList(state.assignments, next);
    notify?.('assignments:changed', { id: next.id, athleteProfileId: next.athleteProfileId });
    res.status(201).json(next);
  });

  router.patch('/wl-templates/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor) || actor.role !== 'coach') {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    const patch = (req.body ?? {}) as { name?: string; program?: GeneratedProgram };
    if (store) {
      const updated = await store.updateCoachTemplate(actor.id, id, patch);
      if (!updated) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      notify?.('wl-templates:changed', { coachId: actor.id });
      res.json(updated);
      return;
    }
    const idx = state.coachWlTemplates.findIndex((t) => t.id === id && t.coachId === actor.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    const current = state.coachWlTemplates[idx]!;
    const updated: CoachWlProgramTemplate = {
      ...current,
      name: patch.name?.trim() || current.name,
      program: patch.program ?? current.program,
      updatedAt: new Date().toISOString(),
    };
    state.coachWlTemplates[idx] = updated;
    notify?.('wl-templates:changed', { coachId: actor.id });
    res.json(updated);
  });

  router.delete('/wl-templates/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor) || actor.role !== 'coach') {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    if (store) {
      const ok = await store.deleteCoachTemplate(actor.id, id);
      if (!ok) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      notify?.('wl-templates:changed', { coachId: actor.id });
      res.status(204).send();
      return;
    }
    const before = state.coachWlTemplates.length;
    state.coachWlTemplates = state.coachWlTemplates.filter((t) => !(t.id === id && t.coachId === actor.id));
    if (state.coachWlTemplates.length === before) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    notify?.('wl-templates:changed', { coachId: actor.id });
    res.status(204).send();
  });

  router.get('/coach-programs', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const coachId = actor.role === 'super_admin' ? coachScopeId(actor) : actor.id;
    if (coachService) {
      res.json(await coachService.listPrograms(coachId));
      return;
    }
    res.json(buildMockCoachProgramRows(coachId, state));
  });

  router.post('/coach-programs', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const coachId = coachProgramsScope(actor);
    const body = (req.body ?? {}) as { name?: string; program?: GeneratedProgram; status?: CoachProgramStatus };
    if (!body.name?.trim()) {
      res.status(400).json({ error: 'name is required.' });
      return;
    }
    if (coachService) {
      try {
        const created = await coachService.createProgram(coachId, {
          name: body.name.trim(),
          program: body.program ?? {
            id: `prog-${Date.now()}`,
            name: body.name.trim(),
            athleteId: TEMPLATE_PROGRAM_ATHLETE_ID,
            createdAt: new Date().toISOString(),
            totalWeeks: 4,
            daysPerWeek: 3,
            primaryGoal: 'strength',
            weeks: [],
          },
          status: body.status,
        });
        res.status(201).json(created);
        return;
      } catch (err) {
        if (err instanceof CoachServiceError) {
          res.status(400).json({ error: err.message });
          return;
        }
        throw err;
      }
    }
    const now = new Date().toISOString();
    const next: CoachProgram = {
      id: `cpr-${Date.now()}`,
      coachId,
      name: body.name.trim(),
      program: body.program ?? {
        id: `prog-${Date.now()}`,
        name: body.name.trim(),
        athleteId: TEMPLATE_PROGRAM_ATHLETE_ID,
        createdAt: now,
        totalWeeks: 4,
        daysPerWeek: 3,
        primaryGoal: 'strength',
        weeks: [],
      },
      status: body.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
    };
    state.coachPrograms = [next, ...state.coachPrograms];
    notify?.('coach-programs:changed', { coachId });
    res.status(201).json(next);
  });

  router.get('/coach-programs/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    const coachId = actor.role === 'super_admin' ? coachScopeId(actor) : actor.id;
    if (coachService) {
      const program = await coachService.getProgram(coachId, id);
      if (!program) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      res.json(program);
      return;
    }
    const program = state.coachPrograms.find((p) => p.id === id && p.coachId === coachId);
    if (!program) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    res.json(program);
  });

  router.patch('/coach-programs/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const coachId = coachProgramsScope(actor);
    const { id } = req.params as { id: string };
    const patch = (req.body ?? {}) as { name?: string; program?: GeneratedProgram; status?: CoachProgramStatus };
    if (coachService) {
      try {
        const updated = await coachService.updateProgram(coachId, id, patch);
        res.json(updated);
        return;
      } catch (err) {
        if (err instanceof CoachServiceError) {
          res.status(err.code === 'PROGRAM_NOT_FOUND' ? 404 : 400).json({ error: err.message });
          return;
        }
        throw err;
      }
    }
    const idx = state.coachPrograms.findIndex((p) => p.id === id && p.coachId === coachId);
    if (idx < 0) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    const current = state.coachPrograms[idx]!;
    const updated: CoachProgram = {
      ...current,
      name: patch.name?.trim() || current.name,
      program: patch.program ?? current.program,
      status: patch.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };
    state.coachPrograms[idx] = updated;
    if (patch.program) {
      for (const asg of state.assignments.filter((a) => a.coachProgramId === id)) {
        const cloned = cloneProgramForAthlete(patch.program, asg.athleteProfileId, { name: updated.name });
        const hist: ProgramAssignmentVersion = {
          version: asg.version,
          editedAt: new Date().toISOString(),
          program: asg.program,
        };
        asg.version += 1;
        asg.program = cloned;
        asg.versionHistory = [...(asg.versionHistory ?? []), hist];
      }
      notify?.('assignments:changed', { coachId });
    }
    notify?.('coach-programs:changed', { coachId });
    res.json(updated);
  });

  router.delete('/coach-programs/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const coachId = coachProgramsScope(actor);
    const { id } = req.params as { id: string };
    if (coachService) {
      try {
        await coachService.deleteProgram(coachId, id);
        res.status(204).send();
        return;
      } catch (err) {
        if (err instanceof CoachServiceError) {
          res.status(err.code === 'PROGRAM_HAS_ENROLLMENTS' ? 409 : 404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }
    if (state.assignments.some((a) => a.coachProgramId === id)) {
      res.status(409).json({ error: 'Cannot delete program with active athlete enrollments.' });
      return;
    }
    const before = state.coachPrograms.length;
    state.coachPrograms = state.coachPrograms.filter((p) => !(p.id === id && p.coachId === coachId));
    if (state.coachPrograms.length === before) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    notify?.('coach-programs:changed', { coachId });
    res.status(204).send();
  });

  router.post('/coach-programs/:id/duplicate', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const coachId = coachProgramsScope(actor);
    const { id } = req.params as { id: string };
    if (coachService) {
      try {
        const dup = await coachService.duplicateProgram(coachId, id);
        res.status(201).json(dup);
        return;
      } catch (err) {
        if (err instanceof CoachServiceError) {
          res.status(404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }
    const source = state.coachPrograms.find((p) => p.id === id && p.coachId === coachId);
    if (!source) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    const now = new Date().toISOString();
    const dup: CoachProgram = {
      ...structuredClone(source),
      id: `cpr-${Date.now()}`,
      name: `${source.name} (copia)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    state.coachPrograms = [dup, ...state.coachPrograms];
    notify?.('coach-programs:changed', { coachId });
    res.status(201).json(dup);
  });

  router.get('/coach-programs/:id/enrollments', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    const coachId = actor.role === 'super_admin' ? coachScopeId(actor) : actor.id;
    if (coachService) {
      try {
        res.json(await coachService.getProgramEnrollments(coachId, id));
        return;
      } catch (err) {
        if (err instanceof CoachServiceError) {
          res.status(404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }
    const program = state.coachPrograms.find((p) => p.id === id && p.coachId === coachId);
    if (!program) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    const nameById = Object.fromEntries(state.athletes.map((a) => [a.id, a.name] as const));
    res.json(
      state.assignments
        .filter((a) => a.coachProgramId === id)
        .map((a) => ({
          athleteProfileId: a.athleteProfileId,
          athleteName: nameById[a.athleteProfileId] ?? a.athleteProfileId,
          assignmentId: a.id,
          assignedAt: a.assignedAt,
        })),
    );
  });

  router.post('/coach-programs/:id/assign', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!isCoachOrAdmin(actor)) {
      res.status(403).json({ error: 'Coach session required.' });
      return;
    }
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { athleteProfileIds?: string[] };
    const athleteProfileIds = body.athleteProfileIds?.filter(Boolean) ?? [];
    if (athleteProfileIds.length === 0) {
      res.status(400).json({ error: 'athleteProfileIds is required.' });
      return;
    }
    const coachId = actor.role === 'coach' ? actor.id : coachScopeId(actor);
    const users = store ? await store.getUsers() : state.users;
    const resolveUser = (profileId: string) => resolveAthleteUserId(profileId, users);

    if (coachService) {
      try {
        const created = await coachService.assignProgramToAthletes(coachId, id, { athleteProfileIds }, resolveUser);
        notify?.('assignments:changed', { coachId });
        notify?.('coach-programs:changed', { coachId });
        res.status(201).json(created);
        return;
      } catch (err) {
        if (err instanceof CoachServiceError) {
          res.status(err.code === 'PROGRAM_NOT_FOUND' || err.code === 'ATHLETE_NOT_FOUND' ? 404 : 400).json({
            error: err.message,
          });
          return;
        }
        throw err;
      }
    }

    const program = state.coachPrograms.find((p) => p.id === id && p.coachId === coachId);
    if (!program) {
      res.status(404).json({ error: 'Coach program not found.' });
      return;
    }
    const created: ProgramAssignment[] = [];
    for (const athleteProfileId of athleteProfileIds) {
      const owner = coachIdForMockAthlete(athleteProfileId, state.users, state.wlAthleteCoachById);
      if (owner !== coachId) {
        res.status(404).json({ error: `Athlete profile not found: ${athleteProfileId}` });
        return;
      }
      const clonedProgram = cloneProgramForAthlete(program.program, athleteProfileId, { name: program.name });
      const next: ProgramAssignment = {
        id: `asg-${Date.now()}-${athleteProfileId}`,
        coachId,
        athleteProfileId,
        ...(resolveUser(athleteProfileId) ? { athleteUserId: resolveUser(athleteProfileId) } : {}),
        coachProgramId: id,
        version: 1,
        versionHistory: [],
        program: clonedProgram,
        assignedAt: new Date().toISOString(),
      };
      state.assignments = upsertAssignmentInList(state.assignments, next);
      created.push(next);
    }
    if (program.status === 'draft') {
      const idx = state.coachPrograms.findIndex((p) => p.id === id);
      if (idx >= 0) state.coachPrograms[idx] = { ...program, status: 'published', updatedAt: new Date().toISOString() };
    }
    notify?.('assignments:changed', { coachId });
    notify?.('coach-programs:changed', { coachId });
    res.status(201).json(created);
  });

  router.post('/sessions/generate', (req, res) => {
    const body = req.body as { athleteId?: string; goal?: SessionGoal };
    const { athleteId, goal } = body;
    const athlete = state.athletes.find((a) => a.id === athleteId);
    if (!athleteId || !goal || !athlete) {
      res.status(400).json({ error: 'Valid athleteId and goal (technique | strength | power) are required.' });
      return;
    }
    const session = generateSession(athleteId, goal, athlete, state.exercises);
    state.sessions.push(session);
    res.status(201).json(session);
  });

  router.post('/sessions/evaluate', (req, res) => {
    const body = req.body as { session?: Session; athleteId?: string };
    const { session, athleteId } = body;
    const aid = athleteId ?? session?.athleteId;
    const athlete = state.athletes.find((a) => a.id === aid);
    if (!session || !athlete) {
      res.status(400).json({ error: 'session object and resolvable athleteId are required.' });
      return;
    }
    const { session: filled, evaluation } = evaluateSessionFull(session, athlete, state.exercises);
    res.json({ session: filled, evaluation });
  });

  router.post('/sessions/adapt', (req, res) => {
    const body = req.body as { session?: Session; athleteId?: string };
    const { session, athleteId } = body;
    const aid = athleteId ?? session?.athleteId;
    const athlete = state.athletes.find((a) => a.id === aid);
    if (!session || !athlete) {
      res.status(400).json({ error: 'session object and resolvable athleteId are required.' });
      return;
    }
    const adapted = adaptSession(session, athlete, state.exercises);
    res.json(adapted);
  });

  /** Simulación de microciclo (4 semanas) — opcional en MVP API */
  router.post('/simulate/microcycle', (req, res) => {
    const body = req.body as { athleteId?: string; goal?: SessionGoal };
    const athlete = state.athletes.find((a) => a.id === body.athleteId);
    if (!body.athleteId || !athlete) {
      res.status(400).json({ error: 'athleteId required.' });
      return;
    }
    const goal = body.goal ?? 'strength';
    const result = simulateMicrocycle(athlete, state.exercises, goal);
    res.json(result);
  });

  return router;
}
