import { describe, expect, it } from 'vitest';
import {
  BILLING_PLAN_LIMITS,
  canAddAthlete,
  canCreateActiveProgram,
  resolveCoachPlan,
} from '../config/billing';
import {
  copyDayAcrossProgram,
  duplicateWeekInGeneratedProgram,
  PROGRAM_STRUCTURE_LIMITS,
} from '../services/programStructureMutations';
import { parseHashDeepLink, buildHashDeepLink } from '../navigation/deepLinks';
import type { GeneratedProgram, Session } from '../models/training';

function emptySession(athleteId = 'a1'): Session {
  return {
    id: `ses-${Math.random().toString(36).slice(2, 8)}`,
    athleteId,
    exercises: [],
    totalReps: 0,
    avgRelativeIntensity: 0,
    avgAbsoluteIntensity: 0,
    load: 0,
    kValue: 0,
  };
}

function sampleProgram(): GeneratedProgram {
  return {
    id: 'prog-1',
    athleteId: 'a1',
    name: 'Test',
    createdAt: new Date().toISOString(),
    primaryGoal: 'strength',
    totalWeeks: 2,
    daysPerWeek: 2,
    weeks: [
      {
        weekNumber: 1,
        days: [
          { dayNumber: 1, label: 'Día 1', session: emptySession() },
          { dayNumber: 2, label: 'Día 2', session: emptySession() },
        ],
      },
      {
        weekNumber: 2,
        days: [
          { dayNumber: 1, label: 'Día 1', session: emptySession() },
          { dayNumber: 2, label: 'Día 2', session: emptySession() },
        ],
      },
    ],
  };
}

describe('billing limits', () => {
  it('free plan caps athletes at 3', () => {
    expect(canAddAthlete('free', 2)).toBe(true);
    expect(canAddAthlete('free', 3)).toBe(false);
    expect(BILLING_PLAN_LIMITS.free.maxAthletes).toBe(3);
  });

  it('pro plan allows unlimited athletes and programs', () => {
    expect(canAddAthlete('pro', 100)).toBe(true);
    expect(canCreateActiveProgram('pro', 50)).toBe(true);
  });

  it('free plan caps active programs at 1', () => {
    expect(canCreateActiveProgram('free', 0)).toBe(true);
    expect(canCreateActiveProgram('free', 1)).toBe(false);
  });

  it('resolveCoachPlan defaults to free', () => {
    expect(resolveCoachPlan('coach-x')).toBe('free');
    expect(resolveCoachPlan('coach-x', 'pro')).toBe('pro');
  });
});

describe('program structure mutations', () => {
  it('duplicateWeekInGeneratedProgram clones structure after source', () => {
    const prog = sampleProgram();
    const srcDay1Id = prog.weeks[0]!.days[0]!.session.id;
    const next = duplicateWeekInGeneratedProgram(prog, 1);
    expect(next.weeks).toHaveLength(3);
    expect(next.weeks[1]!.days).toHaveLength(2);
    expect(next.weeks[1]!.days[0]!.session.id).toBe(srcDay1Id);
    expect(next.totalWeeks).toBe(3);
  });

  it('duplicateWeek respects MAX_WEEKS', () => {
    let prog = sampleProgram();
    while (prog.weeks.length < PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS) {
      prog = duplicateWeekInGeneratedProgram(prog, 1);
    }
    const blocked = duplicateWeekInGeneratedProgram(prog, 1);
    expect(blocked.weeks).toHaveLength(PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS);
  });

  it('copyDayAcrossProgram overwrites destination session', () => {
    const prog = sampleProgram();
    prog.weeks[0]!.days[0]!.label = 'Fuente';
    const next = copyDayAcrossProgram(
      prog,
      { weekNumber: 1, dayNumber: 1 },
      { weekNumber: 2, dayNumber: 2 },
    );
    expect(next.weeks[1]!.days[1]!.label).toBe('Fuente');
  });
});

describe('deep links', () => {
  it('parses program week/day hash', () => {
    const link = parseHashDeepLink('#/programs/abc123/week/2/day/3');
    expect(link).toEqual({
      view: 'programs',
      programId: 'abc123',
      week: 2,
      day: 3,
    });
  });

  it('builds legal and dashboard hashes', () => {
    expect(buildHashDeepLink({ view: 'legal-terms' })).toBe('#/legal/terms');
    expect(buildHashDeepLink({ view: 'dashboard' })).toBe('#/dashboard');
  });
});
