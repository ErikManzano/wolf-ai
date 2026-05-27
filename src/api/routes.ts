import { Router, type IRouter, type Request } from 'express';
import type { Athlete, Exercise, ProgramAssignment, Session, SessionCompletion, SessionGoal, WolfUser } from '../models/training';
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
import { hashPassword, matchesStoredPassword } from '../utils/passwordCrypto';
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
}
type RealtimeNotifier = (event: string, payload?: unknown) => void;

function sanitizeUser(u: WolfUser): Omit<WolfUser, 'password' | 'passwordHash'> {
  return { id: u.id, name: u.name, role: u.role, email: u.email, coachId: u.coachId, linkedAthleteId: u.linkedAthleteId };
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
    res.json({ user: sanitizeUser(user) });
  });

  router.post('/auth/login', async (req, res) => {
    const body = req.body as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    let user: WolfUser | null = null;
    if (store) {
      user = await store.validateUser(email ?? '', password);
    } else {
      user = state.users.find((u) => u.email?.toLowerCase() === email && matchesStoredPassword(u, password)) ?? null;
    }
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const { token, expiresIn } = await signAccessToken(user.id, {
      role: user.role,
      verified: true,
      email: user.email ?? '',
    });
    res.json({ user: sanitizeUser(user), token, expiresIn });
  });

  router.post('/auth/register', async (req, res) => {
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
    const body = req.body as { name?: string; email?: string; password?: string; role?: WolfUser['role']; coachId?: string; linkedAthleteId?: string };
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
    const next: WolfUser = {
      id: `user-${Date.now()}`,
      name,
      role,
      email,
      passwordHash: hashPassword(password),
      coachId: body.coachId,
      linkedAthleteId: body.linkedAthleteId,
    };
    if (store) {
      const created = await store.createUser({
        id: next.id,
        name: next.name,
        role: next.role,
        email: next.email ?? '',
        password,
        coachId: next.coachId,
        linkedAthleteId: next.linkedAthleteId,
      });
      res.status(201).json(sanitizeUser(created));
      return;
    }
    state.users = [...state.users, next];
    res.status(201).json(sanitizeUser(next));
  });

  router.patch('/users/:id', async (req, res) => {
    const actor = await userFromBearer(req, state, store);
    if (!actor || actor.role !== 'super_admin') {
      res.status(403).json({ error: 'Super admin session required to manage users.' });
      return;
    }
    const { id } = req.params as { id: string };
    const body = req.body as Partial<Pick<WolfUser, 'name' | 'role' | 'email' | 'coachId' | 'linkedAthleteId'>>;
    if (store) {
      const updated = await store.updateUser(id, body);
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
    const next: WolfUser = {
      ...prev,
      ...(body.name ? { name: body.name } : {}),
      ...(body.role ? { role: body.role } : {}),
      ...(body.email ? { email: body.email.toLowerCase() } : {}),
      ...(body.coachId !== undefined ? { coachId: body.coachId } : {}),
      ...(body.linkedAthleteId !== undefined ? { linkedAthleteId: body.linkedAthleteId } : {}),
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

  router.get('/assignments', async (_req, res) => {
    const assignments = store ? await store.getAssignments() : state.assignments;
    res.json(assignments);
  });

  router.get('/assignments/athlete/:athleteProfileId', async (req, res) => {
    const { athleteProfileId } = req.params as { athleteProfileId: string };
    const match = store
      ? await store.getAssignmentByAthlete(athleteProfileId)
      : state.assignments
          .filter((a) => a.athleteProfileId === athleteProfileId)
          .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];
    if (!match) {
      res.status(404).json({ error: 'No assignment found for athlete profile.' });
      return;
    }
    res.json(match);
  });

  router.post('/assignments', async (req, res) => {
    const body = req.body as { coachId?: string; athleteProfileId?: string; athleteUserId?: string; program?: ProgramAssignment['program'] };
    if (!body.coachId || !body.athleteProfileId || !body.program) {
      res.status(400).json({ error: 'coachId, athleteProfileId and program are required.' });
      return;
    }
    const id = `asg-${Date.now()}`;
    const next: ProgramAssignment = {
      id,
      coachId: body.coachId,
      athleteProfileId: body.athleteProfileId,
      ...(body.athleteUserId ? { athleteUserId: body.athleteUserId } : {}),
      version: 1,
      versionHistory: [],
      program: { ...body.program, athleteId: body.athleteProfileId },
      assignedAt: new Date().toISOString(),
    };
    if (store) {
      const created = await store.createOrReplaceAssignment(next);
      notify?.('assignments:changed', { id: created.id, athleteProfileId: created.athleteProfileId });
      res.status(201).json(created);
      return;
    }
    state.assignments = [...state.assignments.filter((x) => x.athleteProfileId !== body.athleteProfileId), next];
    notify?.('assignments:changed', { id: next.id, athleteProfileId: next.athleteProfileId });
    res.status(201).json(next);
  });

  router.patch('/assignments/:id/program', async (req, res) => {
    const { id } = req.params as { id: string };
    const body = req.body as { program?: ProgramAssignment['program'] };
    if (!body.program) {
      res.status(400).json({ error: 'program is required.' });
      return;
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
    const assignmentId = typeof req.query.assignmentId === 'string' ? req.query.assignmentId : undefined;
    if (store) {
      res.json(await store.getCompletions(assignmentId));
      return;
    }
    const list = assignmentId
      ? state.completions.filter((c) => c.assignmentId === assignmentId)
      : state.completions;
    res.json(list);
  });

  router.post('/completions/toggle', async (req, res) => {
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

  router.delete('/assignments/:id', async (req, res) => {
    const { id } = req.params as { id: string };
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
