import type {
  Exercise,
  ExerciseCategory,
  ExerciseComplexity,
  ExerciseGoal,
  ExerciseLoadAnchor,
  ExerciseSubtype,
  StartPosition,
} from '../models/training';

export const EXERCISE_LOAD_ANCHOR_OPTIONS: { value: ExerciseLoadAnchor; labelEs: string; labelEn: string }[] = [
  { value: 'auto', labelEs: 'Automático (categoría)', labelEn: 'Automatic (category)' },
  { value: 'snatch', labelEs: '1RM Snatch', labelEn: 'Snatch 1RM' },
  { value: 'clean_jerk', labelEs: '1RM Envión (C&J)', labelEn: 'Clean & jerk 1RM' },
  { value: 'back_squat', labelEs: '1RM Sentadilla trasera', labelEn: 'Back squat 1RM' },
  { value: 'front_squat', labelEs: '1RM Sentadilla frontal', labelEn: 'Front squat 1RM' },
];

const CATEGORIES = new Set<ExerciseCategory>(['snatch', 'clean_jerk', 'squat', 'accessory']);
const SUBTYPES = new Set<ExerciseSubtype>(['classic', 'power', 'pull', 'complex']);
const POSITIONS = new Set<StartPosition>([
  'floor',
  'below_knee',
  'at_knee',
  'above_knee',
  'blocks',
  'rack',
  'straight_legs',
]);
const COMPLEXITIES = new Set<ExerciseComplexity>(['single', 'complex']);
const GOALS = new Set<ExerciseGoal>(['technique', 'strength', 'power']);
const ANCHORS = new Set<ExerciseLoadAnchor>(['auto', 'snatch', 'clean_jerk', 'back_squat', 'front_squat']);

function clampIntensityPair(lo: number, hi: number): [number, number] {
  const a = Math.round(Math.min(lo, hi));
  const b = Math.round(Math.max(lo, hi));
  return [Math.max(1, Math.min(120, a)), Math.max(1, Math.min(120, b))];
}

export function coerceLoadScale(n: unknown): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 1;
  return Math.round(Math.min(2.5, Math.max(0.1, n)) * 1000) / 1000;
}

export function normalizeExercise(raw: Record<string, unknown>): Exercise {
  const id = String(raw.id ?? '').trim() || `ex-${Date.now()}`;
  const name = String(raw.name ?? 'Exercise').trim() || 'Exercise';
  const cat = raw.category as string;
  const category: ExerciseCategory = CATEGORIES.has(cat as ExerciseCategory) ? (cat as ExerciseCategory) : 'accessory';
  const st = raw.subtype as string;
  const subtype: ExerciseSubtype = SUBTYPES.has(st as ExerciseSubtype) ? (st as ExerciseSubtype) : 'classic';
  const sp = raw.startPosition ?? raw.start_position;
  const startPosition: StartPosition = POSITIONS.has(String(sp) as StartPosition)
    ? (String(sp) as StartPosition)
    : 'floor';
  const cx = raw.complexity as string;
  const complexity: ExerciseComplexity = COMPLEXITIES.has(cx as ExerciseComplexity) ? (cx as ExerciseComplexity) : 'single';
  const g = raw.goal as string;
  const goal: ExerciseGoal = GOALS.has(g as ExerciseGoal) ? (g as ExerciseGoal) : 'technique';
  let lo = 50;
  let hi = 85;
  const ir = raw.intensityRange ?? raw.intensity_range;
  if (Array.isArray(ir) && ir.length >= 2) {
    lo = Number(ir[0]);
    hi = Number(ir[1]);
  }
  const intensityRange = clampIntensityPair(
    Number.isFinite(lo) ? lo : 50,
    Number.isFinite(hi) ? hi : 85,
  );
  const la = (raw.loadAnchor ?? raw.load_anchor) as string | undefined;
  const loadAnchor: ExerciseLoadAnchor | undefined = la && ANCHORS.has(la as ExerciseLoadAnchor) ? (la as ExerciseLoadAnchor) : undefined;
  const loadScaleRaw = raw.loadScale ?? raw.load_scale;
  const loadScale = loadScaleRaw !== undefined && loadScaleRaw !== null ? coerceLoadScale(Number(loadScaleRaw)) : undefined;

  const ex: Exercise = {
    id,
    name,
    category,
    subtype,
    startPosition,
    complexity,
    goal,
    intensityRange,
  };
  if (loadAnchor !== undefined && loadAnchor !== 'auto') {
    ex.loadAnchor = loadAnchor;
  }
  if (loadScale !== undefined && loadScale !== 1) {
    ex.loadScale = loadScale;
  }
  const tagsRaw = raw.tags;
  if (Array.isArray(tagsRaw)) {
    ex.tags = tagsRaw.map((t) => String(t).trim()).filter(Boolean);
  }
  const catalogGroup = raw.catalogGroup ?? raw.catalog_group;
  if (catalogGroup) ex.catalogGroup = String(catalogGroup);
  const nameEs = raw.nameEs ?? raw.name_es;
  if (nameEs) ex.nameEs = String(nameEs).trim();
  return ex;
}

/** Built-ins first; coach rows override by id if duplicated. */
export function mergeExerciseCatalog(builtIns: Exercise[], coachRows: Exercise[]): Exercise[] {
  const byId = new Map<string, Exercise>();
  for (const e of builtIns) {
    byId.set(e.id, normalizeExercise({ ...e } as unknown as Record<string, unknown>));
  }
  for (const e of coachRows) {
    byId.set(e.id, normalizeExercise({ ...e } as unknown as Record<string, unknown>));
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
