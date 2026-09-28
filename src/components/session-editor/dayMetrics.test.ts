import { describe, expect, it } from 'vitest';
import type { Athlete, Exercise, GeneratedProgram, Session } from '../../models/training';
import { computeDaySessionMetrics } from './programMetricsService';
import { statsSessionTonnage } from './statsTonnage';

const athlete: Athlete = {
  id: 'a1',
  name: 'Test',
  level: 'intermediate',
  bodyweight: 80,
  oneRM: { snatch: 100, cleanJerk: 120, frontSquat: 150, backSquat: 180 },
  fatigueScore: 0,
  readinessScore: 100,
};

const exercises: Exercise[] = [
  {
    id: 'ex-snatch',
    name: 'Snatch',
    category: 'snatch',
    subtype: 'classic',
    startPosition: 'floor',
    complexity: 'single',
    goal: 'strength',
    intensityRange: [60, 100],
  },
];

function programWithSession(session: Session): GeneratedProgram {
  return {
    id: 'p1',
    name: 'Prog',
    athleteId: 'a1',
    createdAt: '2026-01-01',
    totalWeeks: 1,
    daysPerWeek: 1,
    primaryGoal: 'strength',
    weeks: [
      {
        weekNumber: 1,
        days: [{ dayNumber: 1, label: 'D1', session }],
      },
    ],
  };
}

describe('computeDaySessionMetrics', () => {
  it('tonnage matches statsSessionTonnage (NBL canonical)', () => {
    const session: Session = {
      id: 's1',
      athleteId: 'a1',
      exercises: [
        {
          exerciseId: 'ex-snatch',
          sets: [{ sets: 3, reps: 3, percentage: 75 }],
        },
        {
          exerciseId: 'ex-snatch',
          countsTowardTechnicalNBL: false,
          sets: [{ sets: 2, reps: 5, percentage: 50 }],
        },
      ],
      totalReps: 0,
      avgRelativeIntensity: 0,
      avgAbsoluteIntensity: 0,
      load: 0,
      kValue: 0,
    };
    const program = programWithSession(session);
    const metrics = computeDaySessionMetrics({
      program,
      weekNumber: 1,
      dayNumber: 1,
      athlete,
      exercises,
    });
    expect(metrics.tonnage).toBe(statsSessionTonnage(session, athlete, exercises));
  });
});
