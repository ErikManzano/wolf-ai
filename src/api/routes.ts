import { Router, type IRouter, type Request } from 'express';
import type { Athlete, Exercise, ProgramAssignment, Session, SessionCompletion, SessionGoal, WolfUser } from '../models/training';
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
  sessions: Session[];
  users: WolfUser[];
  assignments: ProgramAssignment[];
  completions: SessionCompletion[];
}
type RealtimeNotifier = (event: string, payload?: unknown) => void;

function sanitizeUser(u: WolfUser): Omit<WolfUser, 'password' | 'passwordHash'> {
  return { id: u.id, name: u.name, role: u.role, email: u.email, coachId: u.coachId, linkedAthleteId: u.linkedAthleteId };
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

  router.get('/exercises', (_req, res) => {
    res.json(state.exercises);
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
