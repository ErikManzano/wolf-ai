/**
 * Mock API server (Express). Run: `npm run server`
 * MVP: el cliente React **no** llama a este API; usa `src/data/*.json` + localStorage.
 * Este servidor es opcional (tests locales o futura integración). Ver `src/config/mvp.ts`.
 *
 * Endpoints: GET/POST — /athletes, /exercises, /sessions, /sessions/generate, etc.
 */
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import type { ProgramAssignment, Session } from '../models/training';
import { mockAthletes, mockExercises, mockUsers } from '../data/loadMockData';
import { generatePeriodizedProgram } from '../services/programGenerator';
import { createTrainingRouter } from './routes';
import { seedExerciseDefinitionsFromLegacy, seedRelationshipRules } from './exerciseCatalogSeed';
import { seedTechnicalCollectionsLocal } from '../data/exercise-intelligence/seedCollections';
import { PostgresStore } from './postgresStore';
import { assertJwtConfiguredForProduction } from './authTokens';
import { createAuthRouter } from './auth/router';

const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

/** Orígenes CORS: FRONTEND_ORIGIN + FRONTEND_ORIGINS (coma) + localhost. */
function corsAllowedOrigins(): string[] {
  const fromList = (process.env.FRONTEND_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const base = FRONTEND_ORIGIN.trim();
  const set = new Set<string>(['http://localhost:5173', 'http://127.0.0.1:5173', base, ...fromList]);
  return [...set];
}

function seedAssignments(): ProgramAssignment[] {
  const athlete = mockAthletes.find((a) => a.id === 'ath-erik');
  if (!athlete) return [];
  const program = generatePeriodizedProgram({
    athleteId: athlete.id,
    athlete,
    exercises: mockExercises,
    totalWeeks: 4,
    daysPerWeek: 3,
    primaryGoal: 'strength',
    programName: 'Plan inicial API — Coach → Erik Manzano',
  });
  return [
    {
      id: 'asg-api-seed-1',
      coachId: 'user-coach-wl',
      athleteUserId: 'user-erik',
      athleteProfileId: athlete.id,
      version: 1,
      versionHistory: [],
      program,
      assignedAt: new Date().toISOString(),
    },
  ];
}

const state = {
  athletes: [...mockAthletes],
  exercises: [] as import('../models/training').Exercise[],
  exerciseDefinitions: seedExerciseDefinitionsFromLegacy(),
  exerciseRelationships: seedRelationshipRules(),
  coachExerciseOverrides: [],
  technicalCollections: seedTechnicalCollectionsLocal(),
  athleteLoadCalibrations: [],
  prescriptionEvents: [],
  sessions: [] as Session[],
  users: [...mockUsers],
  assignments: seedAssignments(),
  completions: [],
  setLogs: [],
};

async function bootstrap() {
  assertJwtConfiguredForProduction();
  const store = PostgresStore.fromEnv();
  if (store) {
    await store.init(mockUsers);
    console.log('Postgres connected. Persisting users/assignments in DATABASE_URL.');
  } else {
    console.log('DATABASE_URL not set. Running in mock memory mode.');
  }

  const allowedOrigins = corsAllowedOrigins();
  const app = express();
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) {
          cb(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          cb(null, true);
          return;
        }
        console.warn(`[cors] blocked Origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`);
        cb(null, false);
      },
    }),
  );
  app.use(express.json());
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const notify = (event: string, payload?: unknown) => {
    const message = JSON.stringify({ event, payload, ts: Date.now() });
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(message);
    }
  };
  // Training router primero: /auth/login y /auth/register usan roles coach|athlete (WolfUser).
  // Si va después, createAuthRouter captura login y mapea atleta → trainer (UI de coach).
  app.use(createTrainingRouter(state, store ?? undefined, notify));
  app.use(createAuthRouter(state, store ?? undefined));
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ event: 'connected', payload: { service: 'wolf-ai-realtime' }, ts: Date.now() }));
  });

  app.get('/health', async (_req, res) => {
    const exerciseCatalog = store ? await store.getExerciseCatalogStats().catch(() => null) : null;
    res.json({
      ok: true,
      service: store ? 'wolf-ai-api-postgres' : 'wolf-ai-mock-api',
      frontendOrigin: FRONTEND_ORIGIN,
      corsOrigins: allowedOrigins,
      persistence: store ? 'postgres' : 'memory',
      exerciseCatalog,
    });
  });

  server.listen(PORT, () => {
    console.log(`Wolf AI API listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
