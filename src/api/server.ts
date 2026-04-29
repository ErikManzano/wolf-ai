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
import { PostgresStore } from './postgresStore';

const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

function seedAssignments(): ProgramAssignment[] {
  const athlete = mockAthletes.find((a) => a.id === 'ath-you');
  if (!athlete) return [];
  const program = generatePeriodizedProgram({
    athleteId: athlete.id,
    athlete,
    exercises: mockExercises,
    totalWeeks: 4,
    daysPerWeek: 3,
    primaryGoal: 'strength',
    programName: 'Plan inicial API — Ivan → Erik',
  });
  return [
    {
      id: 'asg-api-seed-1',
      coachId: 'user-coach',
      athleteUserId: 'user-athlete',
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
  exercises: [...mockExercises],
  sessions: [] as Session[],
  users: [...mockUsers],
  assignments: seedAssignments(),
};

async function bootstrap() {
  const store = PostgresStore.fromEnv();
  if (store) {
    await store.init(mockUsers);
    console.log('Postgres connected. Persisting users/assignments in DATABASE_URL.');
  } else {
    console.log('DATABASE_URL not set. Running in mock memory mode.');
  }

  const app = express();
  app.use(
    cors({
      origin: [FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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
  app.use(createTrainingRouter(state, store ?? undefined, notify));
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ event: 'connected', payload: { service: 'wolf-ai-realtime' }, ts: Date.now() }));
  });

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: store ? 'wolf-ai-api-postgres' : 'wolf-ai-mock-api',
      frontendOrigin: FRONTEND_ORIGIN,
      persistence: store ? 'postgres' : 'memory',
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
