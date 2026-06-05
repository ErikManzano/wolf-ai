import type { ExerciseCategory, ExerciseComplexity, ExerciseGoal, ExerciseLoadAnchor, ExerciseSubtype, StartPosition } from '../models/training';

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

export type ExerciseUpsertPayload = {
  name: string;
  category: ExerciseCategory;
  subtype: ExerciseSubtype;
  startPosition: StartPosition;
  complexity: ExerciseComplexity;
  goal: ExerciseGoal;
  intensityRange: [number, number];
  loadAnchor: ExerciseLoadAnchor;
  loadScale: number;
};

function numPair(a: unknown, b: unknown): [number, number] | null {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

/**
 * Validates coach exercise create/update body (camelCase JSON).
 */
export function parseExerciseUpsertBody(body: unknown): { ok: true; value: ExerciseUpsertPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'JSON body required.' };
  const b = body as Record<string, unknown>;
  const name = String(b.name ?? '').trim();
  if (!name || name.length > 120) return { ok: false, error: 'name is required (max 120 chars).' };
  const cat = String(b.category ?? '');
  if (!CATEGORIES.has(cat as ExerciseCategory)) return { ok: false, error: 'Invalid category.' };
  const st = String(b.subtype ?? '');
  if (!SUBTYPES.has(st as ExerciseSubtype)) return { ok: false, error: 'Invalid subtype.' };
  const sp = String(b.startPosition ?? b.start_position ?? 'floor');
  if (!POSITIONS.has(sp as StartPosition)) return { ok: false, error: 'Invalid startPosition.' };
  const cx = String(b.complexity ?? 'single');
  if (!COMPLEXITIES.has(cx as ExerciseComplexity)) return { ok: false, error: 'Invalid complexity.' };
  const g = String(b.goal ?? 'technique');
  if (!GOALS.has(g as ExerciseGoal)) return { ok: false, error: 'Invalid goal.' };
  const irRaw = b.intensityRange ?? b.intensity_range;
  let pair: [number, number] | null = null;
  if (Array.isArray(irRaw) && irRaw.length >= 2) {
    pair = numPair(irRaw[0], irRaw[1]);
  }
  if (!pair) return { ok: false, error: 'intensityRange [min, max] is required.' };
  const laRaw = b.loadAnchor ?? b.load_anchor ?? 'auto';
  const la = String(laRaw);
  if (!ANCHORS.has(la as ExerciseLoadAnchor)) return { ok: false, error: 'Invalid loadAnchor.' };
  const lsRaw = b.loadScale ?? b.load_scale ?? 1;
  const ls = Number(lsRaw);
  if (!Number.isFinite(ls)) return { ok: false, error: 'loadScale must be a number.' };
  const loadScale = Math.round(Math.min(2.5, Math.max(0.1, ls)) * 1000) / 1000;
  return {
    ok: true,
    value: {
      name,
      category: cat as ExerciseCategory,
      subtype: st as ExerciseSubtype,
      startPosition: sp as StartPosition,
      complexity: cx as ExerciseComplexity,
      goal: g as ExerciseGoal,
      intensityRange: pair,
      loadAnchor: la as ExerciseLoadAnchor,
      loadScale,
    },
  };
}
