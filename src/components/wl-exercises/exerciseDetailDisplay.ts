import type { ExerciseLoadAnchorCode, MergedDefinitionView } from '../../models/exercise';
import { definitionFamily } from './exerciseListUtils';

const ANCHOR_LABELS: Record<ExerciseLoadAnchorCode, { es: string; en: string }> = {
  auto: { es: 'Auto', en: 'Auto' },
  snatch: { es: 'Snatch', en: 'Snatch' },
  clean_jerk: { es: 'C&J', en: 'C&J' },
  back_squat: { es: 'Sentadilla atrás', en: 'Back squat' },
  front_squat: { es: 'Sentadilla frontal', en: 'Front squat' },
};

/** Referencia de intensidad legible; accesorios/recuperación muestran «Propio» en lugar de Auto. */
export function displayIntensityReference(def: MergedDefinitionView, isEs: boolean): string {
  const family = definitionFamily(def);
  const anchor = def.coachOverride?.override.loadAnchor ?? def.loadAnchor;
  const isAccessoryLike = family === 'accessory' || def.objective === 'recovery';

  if (isAccessoryLike && anchor === 'auto') {
    return isEs ? 'Propio' : 'Own';
  }

  return ANCHOR_LABELS[anchor]?.[isEs ? 'es' : 'en'] ?? anchor;
}

export function formatUsageSummary(
  programCount: number,
  isEs: boolean,
  weekCount = 0,
  athleteCount = 0,
): string {
  const programs = isEs
    ? programCount === 1
      ? '1 programa'
      : `${programCount} programas`
    : programCount === 1
      ? '1 program'
      : `${programCount} programs`;
  const weeks = isEs
    ? weekCount === 1
      ? '1 semana'
      : `${weekCount} semanas`
    : weekCount === 1
      ? '1 week'
      : `${weekCount} weeks`;
  const athletes = isEs
    ? athleteCount === 1
      ? '1 atleta'
      : `${athleteCount} atletas`
    : athleteCount === 1
      ? '1 athlete'
      : `${athleteCount} athletes`;
  return `${programs} · ${weeks} · ${athletes}`;
}
