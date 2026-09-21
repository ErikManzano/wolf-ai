import type {
  ExerciseFamilyCode,
  ExerciseLoadAnchorCode,
  ExerciseTaxonomyBundle,
  MergedDefinitionView,
  TrainingObjectiveCode,
} from '../../models/exercise';
import { isSingleComposition } from '../../models/exercise';
import type { Exercise } from '../../models/training';

/** Etiquetas de familia para picker (inglés de coaching). */
export const PICKER_FAMILY_LABEL: Record<ExerciseFamilyCode, string> = {
  snatch: 'Snatch',
  clean: 'Clean',
  jerk: 'Jerk',
  pull: 'Pull',
  squat: 'Squat',
  press: 'Press',
  accessory: 'Accessory',
};

const INTENSITY_REF_LABEL: Record<ExerciseLoadAnchorCode, string | null> = {
  auto: null,
  snatch: 'Snatch',
  clean_jerk: 'C&J',
  back_squat: 'Back squat',
  front_squat: 'Front squat',
};

export function definitionFamilyCode(def: MergedDefinitionView): ExerciseFamilyCode {
  if (def.family) return def.family;
  if (isSingleComposition(def.composition)) return def.composition.family;
  return def.composition.segments[0]?.family ?? 'accessory';
}

export function pickerFamilyLabel(family: ExerciseFamilyCode): string {
  return PICKER_FAMILY_LABEL[family] ?? family;
}

export function pickerTypeLabel(
  taxonomy: ExerciseTaxonomyBundle,
  objective: TrainingObjectiveCode,
  isEs: boolean,
): string {
  const item = taxonomy.objectives.find((entry) => entry.code === objective);
  if (!item) return objective;
  return isEs ? item.labelEs : item.labelEn;
}

export function pickerIntensityRefLabel(
  anchor: ExerciseLoadAnchorCode | null | undefined,
  isEs: boolean,
): string {
  if (!anchor || anchor === 'auto') return isEs ? 'Propio' : 'Self';
  return INTENSITY_REF_LABEL[anchor] ?? anchor;
}

/** Multiplicador 1RM desde catálogo legacy; null si es 1.0 o no existe. */
export function pickerLoadScale(motorExercises: Exercise[], def: MergedDefinitionView): number | null {
  const keys = new Set([def.id, def.legacyExerciseId].filter((id): id is string => Boolean(id)));
  for (const ex of motorExercises) {
    if (!keys.has(ex.id)) continue;
    const scale = ex.loadScale;
    if (scale != null && Number.isFinite(scale) && scale !== 1) {
      return Math.round(scale * 1000) / 1000;
    }
  }
  return null;
}

/** Texto extra para búsqueda fuzzy (familia + tipo en ambos idiomas). */
export function pickerSearchAugment(
  taxonomy: ExerciseTaxonomyBundle,
  def: MergedDefinitionView,
): string {
  const family = definitionFamilyCode(def);
  const familyLabel = pickerFamilyLabel(family);
  const typeEs = pickerTypeLabel(taxonomy, def.objective, true);
  const typeEn = pickerTypeLabel(taxonomy, def.objective, false);
  const refEs = pickerIntensityRefLabel(def.loadAnchor, true);
  const refEn = pickerIntensityRefLabel(def.loadAnchor, false);
  return [familyLabel, typeEs, typeEn, refEs, refEn].join(' ');
}
