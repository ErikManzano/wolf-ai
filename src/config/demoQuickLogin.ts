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
  { id: 'coach', email: 'coach@wolf-ai.app', password: 'WolfCoach_7kM9pX2wLq' },
  { id: 'athlete', email: 'atleta@wolf-ai.app', password: 'WolfAtleta_4nR8tY5wZx' },
  { id: 'admin', email: 'admin@wolf-ai.app', password: 'WolfAdmin_9jH3nM8vPq' },
];
