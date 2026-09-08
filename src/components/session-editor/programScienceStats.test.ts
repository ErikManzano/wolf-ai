import { describe, expect, it } from 'vitest';
import type { Athlete, Exercise, GeneratedProgram, Session } from '../../models/training';
import {
  classifyAcwr,
  computeMesocycleAcwr,
  computeMonotony,
  computeRampRate,
  computeSessionScienceSummary,
  computeStimulusDistribution,
  computeWeekScience,
  programDayDate,
  scienceZoneForPct,
  sessionIntensityWeighted,
  sessionTrainingLoad,
} from './programScienceStats';

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

function makeSession(pcts: Array<{ pct: number; sets: number; reps: number }>): Session {
  return {
    id: 's1',
    athleteId: 'a1',
    exercises: [
      {
        exerciseId: 'ex-snatch',
        sets: pcts.map((p) => ({
          sets: p.sets,
          reps: p.reps,
          percentage: p.pct,
        })),
      },
    ],
    totalReps: 0,
    avgRelativeIntensity: 0,
    avgAbsoluteIntensity: 0,
    load: 0,
    kValue: 0,
  };
}

function makeProgram(weeks: number, daysPerWeek = 3): GeneratedProgram {
  const programWeeks = Array.from({ length: weeks }, (_, wi) => ({
    weekNumber: wi + 1,
    days: Array.from({ length: daysPerWeek }, (_, di) => ({
      dayNumber: di + 1,
      label: `D${di + 1}`,
      coachNote: di === 0 ? 'Nota día 1' : undefined,
      session: makeSession([
        { pct: 65 + wi * 2, sets: 3, reps: 3 },
        { pct: 80 + wi, sets: 2, reps: 2 },
        { pct: 90, sets: 1, reps: 1 },
      ]),
    })),
  }));
  return {
    id: 'p1',
    name: 'Prog',
    athleteId: 'a1',
    createdAt: '2026-01-01',
    totalWeeks: weeks,
    daysPerWeek,
    primaryGoal: 'strength',
    startDate: '2026-01-05',
    weeks: programWeeks,
  };
}

describe('scienceZoneForPct', () => {
  it('uses DeepSeek thresholds', () => {
    expect(scienceZoneForPct(69)).toBe('Tecnica_Velocidad');
    expect(scienceZoneForPct(70)).toBe('Acumulacion_Tension');
    expect(scienceZoneForPct(85)).toBe('Acumulacion_Tension');
    expect(scienceZoneForPct(86)).toBe('Potencia_Neural');
  });
});

describe('session science', () => {
  it('computes TL as Σ sets×reps×(%/100)', () => {
    const session = makeSession([{ pct: 80, sets: 3, reps: 2 }]);
    // 3*2*(0.8) = 4.8
    expect(sessionTrainingLoad(session)).toBeCloseTo(4.8, 5);
  });

  it('weights IMP by tonnage volume', () => {
    // 70%: 2×3×70kg = 420; 90%: 1×1×90 = 90 → IMP = (420*70 + 90*90)/(420+90)
    const session = makeSession([
      { pct: 70, sets: 2, reps: 3 },
      { pct: 90, sets: 1, reps: 1 },
    ]);
    const imp = sessionIntensityWeighted(session, athlete, exercises);
    expect(imp).toBeCloseTo((420 * 70 + 90 * 90) / (420 + 90), 0);
  });

  it('marks density as estimated', () => {
    const summary = computeSessionScienceSummary(makeSession([{ pct: 75, sets: 4, reps: 3 }]), athlete, exercises);
    expect(summary.densityEstimated).toBe(true);
    expect(summary.tonnage).toBeGreaterThan(0);
    expect(summary.density).toBeGreaterThan(0);
  });

  it('builds three-zone distribution', () => {
    const dist = computeStimulusDistribution(
      makeSession([
        { pct: 60, sets: 2, reps: 3 },
        { pct: 80, sets: 2, reps: 2 },
        { pct: 90, sets: 1, reps: 1 },
      ]),
      athlete,
      exercises,
    );
    expect(dist).toHaveLength(3);
    expect(dist.every((s) => s.volumePct >= 0)).toBe(true);
    const sum = dist.reduce((a, s) => a + s.volumePct, 0);
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });
});

describe('fatigue metrics', () => {
  it('computes monotony and classifies ACWR', () => {
    expect(computeMonotony([10, 10, 10])).toBeNull(); // sd=0
    const m = computeMonotony([10, 20, 30]);
    expect(m).not.toBeNull();
    expect(m!).toBeGreaterThan(0);
    expect(classifyAcwr(1.0)).toBe('OPTIMAL');
    expect(classifyAcwr(1.4)).toBe('ATENCION');
    expect(classifyAcwr(1.6)).toBe('RIESGO');
  });

  it('computes ramp rate week over week', () => {
    expect(computeRampRate(120, 100)).toBe(20);
    expect(computeRampRate(100, 0)).toBeNull();
  });

  it('builds mesocycle ACWR and week payload', () => {
    const program = makeProgram(4);
    const acwr = computeMesocycleAcwr(program, 4);
    expect(acwr.value).not.toBeNull();
    expect(acwr.status).not.toBeNull();

    const week = computeWeekScience(program, 2, athlete, exercises);
    expect(week).not.toBeNull();
    expect(week!.summary.trainingLoad).toBeGreaterThan(0);
    expect(week!.fatigue.rampRate).not.toBeNull();
    expect(week!.days[0]!.coachNote).toBe('Nota día 1');
    expect(week!.stimulusDistribution).toHaveLength(3);
  });

  it('derives calendar dates from startDate', () => {
    const program = makeProgram(2, 3);
    expect(programDayDate(program, 1, 1)).toBe('2026-01-05');
    expect(programDayDate(program, 1, 2)).toBe('2026-01-06');
    expect(programDayDate(program, 2, 1)).toBe('2026-01-08');
  });
});
