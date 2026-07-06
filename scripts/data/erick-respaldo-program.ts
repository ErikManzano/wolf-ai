import type { SessionExerciseBlock, SetScheme } from '../../src/models/training';

/** Catalog exercise ids (bulgarian + legacy merge used in PRD). */
export const EX = {
  classicSnatch: 'ex-wl-g01-01',
  classicSnatchBelowKnee: 'ex-wl-g02-01',
  classicSnatchOnBlocks: 'ex-wl-g02-06',
  powerSnatch: 'ex-wl-g03-01',
  blockSnatchAboveKnee: 'ex-006',
  snatchPull: 'ex-wl-g04-01',
  snatchPull4Stops: 'ex-wl-g04-12',
  classicCJ: 'ex-wl-g05-01',
  powerCleanBelowKnee: 'ex-wl-g07-02',
  powerCJ: 'ex-wl-g07-07',
  powerCJPJOHS: 'ex-wl-g07-06',
  jerkOffRack: 'ex-wl-g08-05',
  jerkSplit: 'ex-022',
  powerJerk: 'ex-023',
  cleanPullSlow: 'ex-wl-g09-08',
  cleanPullStraightLegs: 'ex-wl-g09-07',
  clean: 'ex-016',
  cleanHighPull: 'ex-021',
  backSquat: 'ex-wl-g10-01',
  frontSquat: 'ex-wl-g10-02',
  goodMorning: 'ex-033',
  goodMorningLegsStraight: 'ex-wl-g14-02',
  goodMorningSeatedBench: 'ex-wl-g14-04',
  goodMorningSeatedFloor: 'ex-wl-g14-03',
  btnPushPressOHS: 'ex-wl-g12-04',
  benchPressCleanGrip: 'ex-wl-g12-07',
  pressingSnatchBalance: 'ex-wl-g12-06',
  snatchGripBtnPress: 'ex-wl-g15-01',
  squatSnatchPress: 'ex-wl-g15-03',
  snatchBalance: 'ex-012',
  tempoFrontSquat: 'ex-031',
  snatchExtension: 'ex-038',
  cleanExtension: 'ex-039',
  snatchDeadlift: 'ex-034',
  lungeBetweenLegs: 'ex-wl-g13-05',
} as const;

function S(pct: number, reps: number, sets = 1): SetScheme {
  return { percentage: pct, reps, sets, restSec: 150 };
}

function C(pct: number, segmentReps: string[], sets = 1): SetScheme {
  const reps = segmentReps.reduce((sum, token) => sum + Number.parseInt(token, 10), 0);
  return { percentage: pct, reps, sets, segmentReps, restSec: 150 };
}

function single(exerciseId: string, sets: SetScheme[]): SessionExerciseBlock {
  return { exerciseId, blockType: 'single', sets };
}

function complex(segmentIds: string[], sets: SetScheme[]): SessionExerciseBlock {
  return {
    exerciseId: segmentIds[0]!,
    blockType: 'complex',
    segments: segmentIds.map((exerciseId) => ({ exerciseId })),
    sets,
  };
}

export type DaySpec = { label: string; blocks: SessionExerciseBlock[] };

export const ERICK_RESPALDO_WEEKS: DaySpec[][] = [
  // Semana 1
  [
    {
      label: 'Día 1',
      blocks: [
        single(EX.classicSnatch, [S(60, 3), S(70, 2), S(75, 2), S(80, 2), S(85, 1), S(90, 1)]),
        single(EX.snatchPull, [S(80, 3), S(85, 3), S(90, 3), S(95, 2)]),
        single(EX.backSquat, [S(80, 3), S(85, 3), S(90, 2), S(95, 1)]),
        single(EX.snatchBalance, [S(70, 3), S(75, 3), S(80, 3), S(85, 3)]),
      ],
    },
    {
      label: 'Día 2',
      blocks: [
        single(EX.tempoFrontSquat, [S(75, 3), S(80, 3), S(85, 2, 2)]),
        single(EX.benchPressCleanGrip, [S(80, 3, 2), S(85, 4), S(90, 3)]),
        single(EX.snatchGripBtnPress, [S(80, 3, 2), S(85, 3), S(90, 3)]),
        single(EX.goodMorning, [S(60, 15, 4)]),
      ],
    },
    {
      label: 'Día 3',
      blocks: [
        complex([EX.classicCJ, EX.jerkSplit], [
          C(75, ['3', '1']),
          C(80, ['3', '1']),
          C(85, ['2', '1']),
          C(90, ['2', '2']),
        ]),
        single(EX.cleanPullSlow, [S(75, 3), S(80, 2), S(85, 2, 2)]),
        single(EX.cleanPullStraightLegs, [S(80, 2), S(85, 2), S(90, 2, 2)]),
        single(EX.jerkSplit, [S(80, 3, 3), S(85, 2, 2)]),
        single(EX.frontSquat, [S(80, 3), S(85, 3), S(90, 3), S(95, 2)]),
      ],
    },
    {
      label: 'Día 4',
      blocks: [
        single(EX.classicSnatch, [S(60, 3), S(70, 2), S(75, 3), S(80, 1), S(80, 1), S(85, 1)]),
        single(EX.snatchExtension, [S(80, 3), S(85, 3), S(90, 3), S(95, 2)]),
        single(EX.backSquat, [S(80, 3), S(85, 3), S(90, 2, 3)]),
        single(EX.snatchGripBtnPress, [S(75, 3), S(80, 3), S(80, 3), S(80, 3)]),
      ],
    },
  ],
  // Semana 2
  [
    {
      label: 'Día 1',
      blocks: [
        single(EX.powerSnatch, [S(70, 2), S(75, 2), S(80, 2), S(85, 2), S(90, 1, 2)]),
        single(EX.snatchExtension, [S(85, 4, 2), S(90, 4, 2)]),
        single(EX.blockSnatchAboveKnee, [S(75, 3, 3), S(80, 3), S(85, 2, 2)]),
        single(EX.snatchBalance, [S(70, 2, 2), S(75, 2, 2)]),
        single(EX.goodMorningSeatedBench, [S(60, 15, 4)]),
      ],
    },
    {
      label: 'Día 2',
      blocks: [
        single(EX.powerCleanBelowKnee, [S(70, 3), S(75, 3), S(80, 2), S(85, 2), S(90, 1)]),
        single(EX.frontSquat, [S(80, 5), S(85, 3), S(90, 3)]),
        single(EX.cleanExtension, [S(90, 3, 2), S(95, 3, 2)]),
        single(EX.lungeBetweenLegs, [S(70, 3), S(75, 3, 2)]),
      ],
    },
    {
      label: 'Día 3',
      blocks: [
        single(EX.powerSnatch, [S(70, 3), S(75, 3), S(80, 2), S(85, 2), S(90, 2)]),
        single(EX.snatchExtension, [S(80, 4, 2), S(85, 4, 2)]),
        single(EX.classicSnatchOnBlocks, [S(75, 3), S(80, 3), S(85, 3)]),
        single(EX.pressingSnatchBalance, [S(75, 3, 2), S(80, 3, 2), S(85, 2), S(90, 2)]),
        single(EX.goodMorning, [S(70, 15, 4)]),
      ],
    },
    {
      label: 'Día 4',
      blocks: [
        single(EX.powerCJ, [S(70, 3), S(75, 3), S(80, 2), S(85, 2), S(90, 2)]),
        single(EX.cleanExtension, [S(90, 4, 2), S(100, 4, 2)]),
        single(EX.clean, [S(75, 3), S(80, 3), S(85, 3)]),
        single(EX.powerJerk, [S(75, 3, 2), S(80, 2, 2)]),
        single(EX.frontSquat, [S(75, 4, 4)]),
      ],
    },
  ],
  // Semana 3
  [
    {
      label: 'Día 1',
      blocks: [
        single(EX.classicSnatchBelowKnee, [S(70, 3), S(75, 3), S(80, 3)]),
        single(EX.snatchPull4Stops, [S(70, 3), S(75, 3), S(80, 2), S(85, 2)]),
        single(EX.squatSnatchPress, [S(75, 3), S(80, 2, 2), S(85, 2, 2)]),
        single(EX.snatchDeadlift, [S(85, 4, 2), S(90, 2, 2)]),
        single(EX.goodMorningSeatedBench, [S(70, 15, 4)]),
      ],
    },
    {
      label: 'Día 2',
      blocks: [
        single(EX.benchPressCleanGrip, [S(80, 3, 2), S(85, 3, 2)]),
        single(EX.goodMorningLegsStraight, [S(70, 15, 4)]),
        single(EX.btnPushPressOHS, [S(70, 3), S(75, 3)]),
        single(EX.goodMorningSeatedFloor, [S(70, 15, 4)]),
      ],
    },
    {
      label: 'Día 3',
      blocks: [
        single(EX.powerCleanBelowKnee, [S(70, 3), S(75, 3), S(80, 3), S(85, 2)]),
        complex([EX.powerCJPJOHS, EX.jerkSplit], [
          C(75, ['3', '2']),
          C(80, ['3', '2']),
          C(85, ['3', '1']),
          C(90, ['3', '1']),
        ]),
        single(EX.frontSquat, [S(80, 3), S(85, 2, 2), S(90, 2, 2), S(95, 1)]),
        single(EX.cleanHighPull, [S(75, 4, 2), S(80, 4, 2)]),
      ],
    },
    {
      label: 'Día 4',
      blocks: [
        single(EX.classicSnatchBelowKnee, [S(75, 3), S(80, 3), S(85, 2, 2), S(90, 2, 2)]),
        single(EX.jerkOffRack, [S(80, 2, 3)]),
        single(EX.classicSnatch, [S(84, 1, 3)]),
      ],
    },
  ],
];
