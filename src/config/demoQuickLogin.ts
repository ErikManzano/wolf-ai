/**
 * Credenciales seed para accesos rápidos en login (mantener alineado con .env.example y users.json).
 */
export type DemoQuickProfileId = 'coach' | 'athlete' | 'admin';

export type DemoQuickProfile = {
  id: DemoQuickProfileId;
  email: string;
  password: string;
};

export const DEMO_QUICK_PROFILES: DemoQuickProfile[] = [
  { id: 'coach', email: 'coach-wl', password: 'CoachWL2026!' },
  { id: 'athlete', email: 'erik', password: 'ErikWL2026!' },
  { id: 'admin', email: 'admin@wolf-ai.app', password: 'WolfAdmin_9jH3nM8vPq' },
];
