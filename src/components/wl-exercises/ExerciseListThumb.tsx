import { resolveExerciseMedia } from './exerciseMediaUtils';
import type { ExerciseFamilyId } from './types';

export function ExerciseListThumb({
  name,
  family,
  mediaUrl,
  isEs,
}: {
  name: string;
  family: ExerciseFamilyId;
  mediaUrl?: string | null;
  isEs: boolean;
}) {
  const media = resolveExerciseMedia(mediaUrl, family);
  const alt = isEs ? `Vista previa de ${name}` : `Preview of ${name}`;

  return (
    <div className="wl-exercise-table-row__thumb" aria-hidden>
      <img src={media.src} srcSet={media.srcSet} sizes="48px" alt={alt} loading="lazy" decoding="async" />
    </div>
  );
}
