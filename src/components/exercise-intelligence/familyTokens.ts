import type { ExerciseFamilyCode } from '../../models/exercise';

export const FAMILY_TOKEN: Record<
  ExerciseFamilyCode,
  { abbr: string; hue: string; gradient: string }
> = {
  snatch: { abbr: 'SN', hue: '#22d3ee', gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)' },
  clean: { abbr: 'CL', hue: '#fbbf24', gradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)' },
  jerk: { abbr: 'JK', hue: '#fb923c', gradient: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)' },
  pull: { abbr: 'PL', hue: '#a78bfa', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' },
  squat: { abbr: 'SQ', hue: '#4ade80', gradient: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)' },
  press: { abbr: 'PR', hue: '#60a5fa', gradient: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)' },
  accessory: { abbr: 'AC', hue: '#94a3b8', gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)' },
};

export function familyClass(code: string): string {
  return `wolf-ei-fam--${code}`;
}
