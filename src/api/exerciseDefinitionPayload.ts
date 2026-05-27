import type {
  ExerciseComposition,
  ExerciseDefinitionInput,
  ExerciseLoadAnchorCode,
  TrainingObjectiveCode,
} from '../models/exercise';
import { isComplexComposition, isSingleComposition } from '../models/exercise';

const OBJECTIVES = new Set<TrainingObjectiveCode>([
  'technique',
  'strength',
  'speed',
  'positional',
  'pulling_strength',
  'recovery',
]);
const ANCHORS = new Set<ExerciseLoadAnchorCode>(['auto', 'snatch', 'clean_jerk', 'back_squat', 'front_squat']);

export function parseExerciseDefinitionBody(
  body: unknown,
): { ok: true; value: ExerciseDefinitionInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'JSON body required.' };
  const b = body as Record<string, unknown>;
  const kind = b.kind === 'complex' ? 'complex' : b.kind === 'single' ? 'single' : null;
  if (!kind) return { ok: false, error: 'kind must be single or complex.' };
  const composition = b.composition as ExerciseComposition | undefined;
  if (!composition || typeof composition !== 'object') {
    return { ok: false, error: 'composition is required.' };
  }
  if (composition.kind !== kind) {
    return { ok: false, error: 'composition.kind must match kind.' };
  }
  if (isSingleComposition(composition)) {
    if (!composition.family || !composition.variation || !composition.startPosition) {
      return { ok: false, error: 'single composition requires family, variation, startPosition.' };
    }
  }
  if (isComplexComposition(composition)) {
    if (!Array.isArray(composition.segments) || composition.segments.length < 2) {
      return { ok: false, error: 'complex composition requires at least 2 segments.' };
    }
  }
  const objective = String(b.objective ?? 'technique');
  if (!OBJECTIVES.has(objective as TrainingObjectiveCode)) {
    return { ok: false, error: 'Invalid objective.' };
  }
  const loadAnchor = String(b.loadAnchor ?? b.load_anchor ?? 'auto');
  if (!ANCHORS.has(loadAnchor as ExerciseLoadAnchorCode)) {
    return { ok: false, error: 'Invalid loadAnchor.' };
  }
  const tags = Array.isArray(b.tags) ? b.tags.map(String) : undefined;
  return {
    ok: true,
    value: {
      kind,
      composition: composition as ExerciseComposition,
      objective: objective as TrainingObjectiveCode,
      loadAnchor: loadAnchor as ExerciseLoadAnchorCode,
      tags,
    },
  };
}

export type ComposePreviewBody = {
  composition: ExerciseComposition;
  locale?: 'es' | 'en';
};

export function parseComposePreviewBody(
  body: unknown,
): { ok: true; value: ComposePreviewBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'JSON body required.' };
  const b = body as Record<string, unknown>;
  const composition = b.composition as ExerciseComposition | undefined;
  if (!composition) return { ok: false, error: 'composition required.' };
  const locale = b.locale === 'es' ? 'es' : 'en';
  return { ok: true, value: { composition, locale } };
}
