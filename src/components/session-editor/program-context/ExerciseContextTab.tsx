import type { Athlete, Exercise, GeneratedProgram, SessionExerciseBlock } from '../../../models/training';
import { exerciseDisplayForBlock } from '../programExerciseHistory';
import { useExerciseHistory } from './hooks/useExerciseHistory';
import { formatStatsKg } from '../statsTonnage';

export function ExerciseContextTab({
  program,
  block,
  athlete,
  exercises,
  weekNumber,
  dayNumber,
  isEs,
}: {
  program: GeneratedProgram;
  block: SessionExerciseBlock | null;
  athlete: Athlete;
  exercises: Exercise[];
  weekNumber: number;
  dayNumber: number;
  isEs: boolean;
}) {
  const history = useExerciseHistory({
    program,
    block,
    athlete,
    exercises,
    weekNumber,
    dayNumber,
  });

  if (!block) {
    return (
      <p className="wl-program-context-empty">
        {isEs ? 'Selecciona un bloque en el editor.' : 'Select a block in the editor.'}
      </p>
    );
  }

  const title = exerciseDisplayForBlock(block, exercises);
  const totalTonnage = history.reduce((s, row) => s + row.tonnage, 0);
  const totalReps = history.reduce((s, row) => s + row.reps, 0);
  const impAvg =
    history.length > 0
      ? Math.round(history.reduce((s, row) => s + row.avgPct, 0) / history.length)
      : 0;

  return (
    <div className="wl-program-context-tab">
      <p className="wl-program-context-exercise-head">
        <strong>{title}</strong>
        <span className="wl-program-context-muted">
          {isEs ? ' · últimas semanas (mismo día)' : ' · recent weeks (same day)'}
        </span>
      </p>

      <ul className="wl-program-context-history">
        {history.map((row) => (
          <li key={row.weekNumber} className={row.isCurrent ? 'is-current' : undefined}>
            <span>
              {isEs ? 'Sem' : 'Wk'} {row.weekNumber}
              {row.isCurrent ? (isEs ? ' (editando)' : ' (editing)') : ''}
            </span>
            <span>
              {row.label} · {formatStatsKg(row.tonnage)}
            </span>
          </li>
        ))}
      </ul>

      {history.length === 0 ? (
        <p className="wl-program-context-empty">{isEs ? 'Sin histórico en el plan.' : 'No history in plan.'}</p>
      ) : (
        <dl className="wl-program-context-kv wl-program-context-kv--compact">
          <div>
            <dt>{isEs ? 'Total acumulado' : 'Total volume'}</dt>
            <dd>{formatStatsKg(totalTonnage)}</dd>
          </div>
          <div>
            <dt>{isEs ? 'IMP media' : 'Avg IMP'}</dt>
            <dd>{impAvg > 0 ? `${impAvg}%` : '—'}</dd>
          </div>
          <div>
            <dt>{isEs ? 'Reps totales' : 'Total reps'}</dt>
            <dd>{totalReps}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
