import { Router, type IRouter } from 'express';
import type { Athlete, Exercise, ProgramAssignment, Session, SessionGoal, WolfUser } from '../models/training';
import { generateSession } from '../services/sessionGenerator';
import { evaluateSessionFull } from '../services/sessionEvaluator';
import { adaptSession } from '../services/adaptiveEngine';
import { simulateMicrocycle } from '../services/simulateMicrocycle';
import { PostgresStore } from './postgresStore';

export interface MockApiState {
  athletes: Athlete[];
  exercises: Exercise[];
  sessions: Session[];
  users: WolfUser[];
  assignments: ProgramAssignment[];
}

const DEMO_PASSWORD = process.env.DEMO_LOGIN_PASSWORD || 'wolf2026';

/**
 * Mock REST API — sin base de datos; `sessions` vive en memoria del proceso.
 */
export function createTrainingRouter(state: MockApiState, store?: PostgresStore): IRouter {
  const router = Router();

  router.get('/users', async (_req, res) => {
    const users = store ? await store.getUsers() : state.users;
    const sanitized = users.map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email, coachId: u.coachId, linkedAthleteId: u.linkedAthleteId }));
    res.json(sanitized);
  });

  router.post('/auth/login', async (req, res) => {
    const body = req.body as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    const users = store ? await store.getUsers() : state.users;
    const user = users.find((u) => u.email?.toLowerCase() === email);
    if (!user || password !== DEMO_PASSWORD) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    res.json({ user, token: `demo-${user.id}` });
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
      res.status(201).json(created);
      return;
    }
    state.assignments = [...state.assignments.filter((x) => x.athleteProfileId !== body.athleteProfileId), next];
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
    res.json(updated);
  });

  router.delete('/assignments/:id', async (req, res) => {
    const { id } = req.params as { id: string };
    if (store) {
      const removed = await store.deleteAssignment(id);
      if (!removed) {
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }
      res.status(204).send();
      return;
    }
    const before = state.assignments.length;
    state.assignments = state.assignments.filter((a) => a.id !== id);
    if (state.assignments.length === before) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
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
