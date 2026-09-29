import type { SessionExerciseBlock, SetScheme } from '../../src/models/training';

/** Erik Manzano — referencia kg (Sep–Oct 2026 mesociclo coach). */
export const ERIK_RM = {
  snatch: 92.5,
  cleanJerk: 110,
  backSquat: 165,
  frontSquat: 132,
} as const;

/** Catalog exercise ids (bulgarian + legacy merge used in PRD). */
export const EX = {
  classicSnatch: 'ex-wl-g01-01',
  blockSnatch: 'ex-wl-g02-06',
  hangSnatchKnee: 'ex-wl-g02-02',
  powerSnatch: 'ex-wl-g03-01',
  snatchPull: 'ex-wl-g04-01',
  classicCJ: 'ex-wl-g05-01',
  jerkSplit: 'ex-022',
  powerCleanBelow: 'ex-wl-g07-02',
  cleanAtKnee: 'ex-wl-g07-03',
  hangPowerClean: 'ex-wl-g07-02',
  pushPress: 'ex-wl-g12-02',
  powerJerkRack: 'ex-wl-g08-01',
  jerkOffRack: 'ex-wl-g08-05',
  cleanPull: 'ex-wl-g09-07',
  clean: 'ex-016',
  backSquat: 'ex-wl-g10-01',
  frontSquat: 'ex-wl-g10-02',
  goodMorning: 'ex-wl-g11-02',
  snatchBalance: 'ex-012',
} as const;

function kgs(v: number | string): number {
  if (typeof v === 'number') return v;
  const trimmed = v.trim();
  if (trimmed.includes('-')) {
    const [a, b] = trimmed.split('-').map((s) => Number.parseFloat(s.trim()));
    if (!Number.isNaN(a!) && !Number.isNaN(b!)) return (a! + b!) / 2;
  }
  const n = Number.parseFloat(trimmed);
  return Number.isNaN(n) ? 0 : n;
}

function clampPct(pct: number): number {
  return Math.round(Math.min(120, Math.max(20, pct)));
}

const pSn = (kg: number | string): number => clampPct((kgs(kg) / ERIK_RM.snatch) * 100);
const pCj = (kg: number | string): number => clampPct((kgs(kg) / ERIK_RM.cleanJerk) * 100);
const pBs = (kg: number | string): number => clampPct((kgs(kg) / ERIK_RM.backSquat) * 100);
const pFs = (kg: number | string): number => clampPct((kgs(kg) / ERIK_RM.frontSquat) * 100);

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

type AccBlock = SessionExerciseBlock & { coachNote?: string };

function acc(text: string): AccBlock {
  return {
    exerciseId: EX.backSquat,
    blockType: 'single',
    countsTowardTechnicalNBL: false,
    coachNote: text,
    sets: [S(50, 1, 1)],
  };
}

function pauseFs(sets: number, reps: number, kg: number | string): SessionExerciseBlock {
  const note = 'Pausa 3 seg en el fondo';
  return {
    exerciseId: EX.frontSquat,
    blockType: 'single',
    sets: [{ ...S(pFs(kg), reps, sets), coachNote: note }],
  };
}

function hangSnatchPause(kg: number | string, sets: number): SessionExerciseBlock {
  const note = 'Pausa 2 seg en el punto bajo';
  return {
    exerciseId: EX.hangSnatchKnee,
    blockType: 'single',
    sets: [{ ...S(pSn(kg), 3, sets), coachNote: note }],
  };
}

function cjFs(kg: number | string, workSets: number): SessionExerciseBlock {
  return complex([EX.clean, EX.frontSquat], [C(pCj(kg), ['1', '1'], workSets)]);
}

export type DaySpec = { label: string; blocks: SessionExerciseBlock[] };

export const ERICK_SEPT_OCT_WEEKS: DaySpec[][] = [
  // Semana 5 (14–20 Sep)
  [
    {
      label: 'LUNES 14 — A: SNATCH / B: CLEAN POWER',
      blocks: [
        single(EX.classicSnatch, [S(pSn(75), 3, 5)]),
        complex([EX.powerCleanBelow, EX.pushPress], [C(pCj(80), ['2', '2'], 5)]),
        single(EX.backSquat, [S(pBs(135), 3, 5)]),
        single(EX.snatchPull, [S(pSn(120), 3, 3)]),
        acc('Playa: dominadas + face pulls'),
      ],
    },
    {
      label: 'MARTES 15',
      blocks: [
        complex([EX.classicCJ, EX.jerkSplit], [C(pCj(85), ['2', '1'], 5)]),
        single(EX.powerSnatch, [S(pSn(70), 3, 5)]),
        single(EX.frontSquat, [S(pFs(120), 3, 5)]),
        single(EX.cleanPull, [S(pCj(130), 3, 3)]),
        acc('Playa: press militar + laterales + tríceps'),
      ],
    },
    {
      label: 'MIÉRCOLES 16',
      blocks: [
        single(EX.blockSnatch, [S(pSn(77.5), 3, 5)]),
        complex([EX.powerCleanBelow, EX.powerJerkRack], [C(pCj(75), ['2', '2'], 5)]),
        single(EX.backSquat, [S(pBs(140), 3, 5)]),
        single(EX.cleanPull, [S(pCj(135), 3, 3)]),
        acc('Playa: press inclinado + curl'),
      ],
    },
    {
      label: 'JUEVES 17',
      blocks: [
        complex([EX.classicCJ, EX.jerkSplit], [C(pCj(90), ['2', '1'], 5)]),
        single(EX.powerSnatch, [S(pSn(72.5), 3, 5)]),
        single(EX.frontSquat, [S(pFs(125), 3, 5)]),
        single(EX.snatchPull, [S(pSn(125), 3, 3)]),
        acc('Playa: remo + face pulls + ab wheel'),
      ],
    },
    {
      label: 'VIERNES 18 — INTENSIDAD',
      blocks: [
        single(EX.classicSnatch, [
          S(pSn(60), 2, 2),
          S(pSn(70), 2, 2),
          S(pSn(80), 1, 1),
          S(pSn(85), 1, 1),
          S(pSn(87.5), 1, 1),
        ]),
        complex(
          [EX.classicCJ, EX.jerkSplit],
          [
            C(pCj(70), ['1', '1'], 1),
            C(pCj(85), ['1', '1'], 1),
            C(pCj(95), ['1', '1'], 1),
            C(pCj(100), ['1', '1'], 1),
            C(pCj(107.5), ['1', '1'], 1),
          ],
        ),
        single(EX.backSquat, [
          S(pBs(100), 3, 1),
          S(pBs(120), 3, 1),
          S(pBs(140), 2, 1),
          S(pBs(150), 1, 1),
          S(pBs(155), 1, 1),
        ]),
        single(EX.snatchPull, [S(pSn(110), 3, 1), S(pSn(125), 3, 1)]),
        acc('Playa: accesorios'),
      ],
    },
    {
      label: 'SÁBADO 19',
      blocks: [
        hangSnatchPause(67.5, 5),
        cjFs(85, 5),
        pauseFs(4, 3, 100),
        single(EX.snatchPull, [S(pSn(120), 3, 3)]),
        acc('Playa: accesorios'),
      ],
    },
    {
      label: 'DOMINGO 20 — DESCANSO',
      blocks: [acc('DESCANSO TOTAL')],
    },
  ],
  // Semana 6 (21–27 Sep)
  [
    {
      label: 'LUNES 21 — VOLUMEN',
      blocks: [
        single(EX.classicSnatch, [S(pSn(77.5), 3, 5)]),
        cjFs(85, 5),
        single(EX.backSquat, [S(pBs(140), 3, 5)]),
        single(EX.snatchPull, [S(pSn(125), 3, 3)]),
        acc('Playa: dominadas 4×5 + face pulls 3×15'),
      ],
    },
    {
      label: 'MARTES 22',
      blocks: [
        complex([EX.classicCJ, EX.jerkSplit], [C(pCj(85), ['2', '1'], 5)]),
        single(EX.powerSnatch, [S(pSn(72.5), 3, 5)]),
        pauseFs(5, 3, 110),
        single(EX.cleanPull, [S(pCj(135), 3, 3)]),
        acc('Playa: press militar 3×8 + laterales + tríceps'),
      ],
    },
    {
      label: 'MIÉRCOLES 23',
      blocks: [
        single(EX.blockSnatch, [S(pSn(80), 3, 5)]),
        single(EX.cleanAtKnee, [S(pCj(85), 3, 5)]),
        single(EX.backSquat, [S(pBs(145), 3, 5)]),
        single(EX.cleanPull, [S(pCj(140), 3, 3)]),
        acc('Playa: press inclinado'),
      ],
    },
    {
      label: 'JUEVES 24',
      blocks: [
        complex([EX.classicCJ, EX.jerkSplit], [C(pCj(87.5), ['2', '1'], 5)]),
        single(EX.powerSnatch, [S(pSn(75), 3, 5)]),
        pauseFs(5, 3, 115),
        single(EX.snatchPull, [S(pSn(130), 3, 3)]),
        acc('Playa: remo + face pulls + ab wheel'),
      ],
    },
    {
      label: 'VIERNES 25 — INTENSIDAD',
      blocks: [
        single(EX.classicSnatch, [
          S(pSn(60), 2, 2),
          S(pSn(70), 2, 2),
          S(pSn(80), 1, 1),
          S(pSn(85), 1, 1),
          S(pSn(90), 1, 1),
        ]),
        complex(
          [EX.classicCJ, EX.jerkSplit],
          [
            C(pCj(70), ['1', '1'], 1),
            C(pCj(85), ['1', '1'], 1),
            C(pCj(95), ['1', '1'], 1),
            C(pCj(100), ['1', '1'], 1),
            C(pCj(105), ['1', '1'], 1),
          ],
        ),
        single(EX.backSquat, [
          S(pBs(100), 3, 1),
          S(pBs(120), 3, 1),
          S(pBs(140), 2, 1),
          S(pBs(150), 1, 1),
          S(pBs(160), 1, 1),
        ]),
        single(EX.snatchPull, [S(pSn(110), 3, 1), S(pSn(130), 3, 1)]),
        acc('Playa: accesorios'),
      ],
    },
    {
      label: 'SÁBADO 26',
      blocks: [
        hangSnatchPause(70, 5),
        cjFs(85, 5),
        pauseFs(5, 5, 105),
        single(EX.snatchBalance, [S(pSn(75), 3, 3)]),
        single(EX.snatchPull, [S(pSn(120), 3, 3)]),
        acc('Playa: reverse hyper + face pulls'),
      ],
    },
    {
      label: 'DOMINGO 27 — DESCANSO',
      blocks: [acc('DESCANSO TOTAL')],
    },
  ],
  // Semana 7 (28 Sep – 4 Oct)
  [
    {
      label: 'LUNES 28 — NOCHE',
      blocks: [
        single(EX.classicSnatch, [S(pSn(80), 3, 5)]),
        complex([EX.classicCJ, EX.jerkSplit], [C(pCj(85), ['2', '1'], 3)]),
        single(EX.powerJerkRack, [S(pCj(kgs('85-90')), 2, 5)]),
        single(EX.frontSquat, [S(pFs(kgs('125-130')), 3, 5)]),
        single(EX.snatchPull, [S(pSn(kgs('110-115')), 3, 5)]),
      ],
    },
    {
      label: 'MARTES 29',
      blocks: [
        single(EX.cleanAtKnee, [S(pCj(kgs('85-90')), 3, 5)]),
        single(EX.powerSnatch, [S(pSn(75), 3, 3)]),
        single(EX.cleanPull, [S(pCj(132.5), 3, 5)]),
        single(EX.backSquat, [S(pBs(145), 3, 5)]),
        acc('Playa: pull-ups + dips'),
      ],
    },
    {
      label: 'MIÉRCOLES 30 — TEMPRANO',
      blocks: [
        single(EX.blockSnatch, [S(pSn(kgs('82.5-85')), 3, 5)]),
        complex([EX.classicCJ, EX.jerkSplit], [C(pCj(85), ['2', '1'], 3)]),
        single(EX.pushPress, [S(pCj(87.5), 3, 5)]),
        single(EX.powerJerkRack, [S(pCj(92.5), 2, 4)]),
        single(EX.backSquat, [S(pBs(150), 3, 5)]),
        single(EX.cleanPull, [S(pCj(132.5), 3, 5)]),
      ],
    },
    {
      label: 'JUEVES 1 OCT',
      blocks: [
        single(EX.clean, [S(pCj(kgs('92.5-95')), 1, 5)]),
        single(EX.hangSnatchKnee, [S(pSn(72.5), 3, 3)]),
        single(EX.frontSquat, [S(pFs(120), 3, 5)]),
        single(EX.snatchPull, [S(pSn(117.5), 3, 5)]),
        single(EX.goodMorning, [S(pBs(65), 8, 3)]),
        acc('Playa: crunch con peso / weighted crunch'),
      ],
    },
    {
      label: 'VIERNES 2',
      blocks: [
        single(EX.classicSnatch, [
          S(pSn(70), 1, 1),
          S(pSn(80), 1, 1),
          S(pSn(85), 1, 1),
          S(pSn(90), 1, 1),
          S(pSn(92.5), 1, 1),
        ]),
        single(EX.clean, [
          S(pCj(85), 1, 1),
          S(pCj(95), 1, 1),
          S(pCj(100), 1, 1),
          S(pCj(102.5), 1, 1),
        ]),
        single(EX.powerJerkRack, [S(pCj(97.5), 1, 3)]),
        single(EX.backSquat, [S(pBs(162.5), 1, 1)]),
        single(EX.snatchPull, [S(pSn(127.5), 3, 3)]),
        single(EX.cleanPull, [S(pCj(142.5), 3, 3)]),
        acc('Playa: pull-ups + dips'),
      ],
    },
    {
      label: 'SÁBADO 3',
      blocks: [
        single(EX.powerCleanBelow, [S(pCj(kgs('60-65')), 2, 4)]),
        single(EX.hangPowerClean, [S(pCj(82.5), 3, 4)]),
        single(EX.hangSnatchKnee, [S(pSn(72.5), 3, 3)]),
        pauseFs(5, 5, 107.5),
        single(EX.snatchBalance, [S(pSn(75), 3, 3)]),
        single(EX.snatchPull, [S(pSn(122.5), 3, 3)]),
        acc('Playa: reverse hyper + face pulls'),
      ],
    },
    {
      label: 'DOMINGO 4 — DESCANSO',
      blocks: [acc('DESCANSO TOTAL')],
    },
  ],
];
