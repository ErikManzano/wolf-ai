import type { ExerciseViewMode } from './types';

export function ExerciseSkeletonGrid({
  isEs,
  viewMode = 'grid',
}: {
  isEs: boolean;
  viewMode?: ExerciseViewMode;
}) {
  if (viewMode === 'list') {
    return (
      <div
        className="wl-exercise-table-wrap wl-exercise-table-wrap--compact"
        aria-busy="true"
        aria-label={isEs ? 'Cargando ejercicios' : 'Loading exercises'}
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="wl-exercise-table-row wl-exercise-table-row--skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="wl-exercises-grid" aria-busy="true" aria-label={isEs ? 'Cargando ejercicios' : 'Loading exercises'}>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="wl-exercise-card wl-exercise-card--skeleton" />
      ))}
    </div>
  );
}
