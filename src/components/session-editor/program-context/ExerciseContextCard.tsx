import type { Athlete, Exercise, GeneratedProgram, SessionExerciseBlock } from '../../../models/training';
import { exerciseDisplayForBlock } from '../programExerciseHistory';
import { useExerciseHistory } from './hooks/useExerciseHistory';
import { formatStatsKg } from '../statsTonnage';

function ExerciseContextCardHistory({
  program,
  block,
  athlete,
  exercises,
  weekNumber,
  dayNumber,
  isEs,
}: {
  program: GeneratedProgram;
  block: SessionExerciseBlock;
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
  const totalTonnage = history.reduce((s, row) => s + row.tonnage, 0);
  const totalReps = history.reduce((s, row) => s + row.reps, 0);
  const impAvg =
    history.length > 0
      ? Math.round(history.reduce((s, row) => s + row.avgPct, 0) / history.length)
      : 0;

  return (
    <>
      <p className="wl-program-context-exercise-card__subtitle wl-program-context-muted">
        {isEs ? 'Últimas semanas (mismo día)' : 'Recent weeks (same day)'}
      </p>
      <ul className="wl-program-context-history wl-program-context-history--card">
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
        <p className="wl-program-context-empty">
          {isEs ? 'Sin histórico en el plan.' : 'No history in plan.'}
        </p>
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
    </>
  );
}

export function ExerciseContextCard({
  program,
  block,
  athlete,
  exercises,
  weekNumber,
  dayNumber,
  isEs,
  isTemplate,
  onDismiss,
}: {
  program: GeneratedProgram;
  block: SessionExerciseBlock;
  athlete: Athlete | null;
  exercises: Exercise[];
  weekNumber: number;
  dayNumber: number;
  isEs: boolean;
  isTemplate?: boolean;
  onDismiss?: () => void;
}) {
  const title = exerciseDisplayForBlock(block, exercises);
  const showHistory = athlete != null && !isTemplate;

  return (
    <section className="wl-program-context-exercise-card" aria-label={title}>
      <div className="wl-program-context-exercise-card__head">
        <p className="wl-program-context-exercise-card__title">{title}</p>
        {onDismiss ? (
          <button
            type="button"
            className="wl-program-context-exercise-card__close"
            onClick={onDismiss}
            aria-label={isEs ? 'Cerrar ejercicio' : 'Close exercise'}
          >
            ×
          </button>
        ) : null}
      </div>

      {!showHistory ? (
        <p className="wl-program-context-exercise-card__hint wl-program-context-muted">
          {isTemplate
            ? isEs
              ? 'Histórico con kg en el plan individual del atleta.'
              : 'Kg history lives on each athlete’s individual plan.'
            : isEs
              ? 'Selecciona un atleta para histórico de carga.'
              : 'Select an athlete for load history.'}
        </p>
      ) : (
        <ExerciseContextCardHistory
          program={program}
          block={block}
          athlete={athlete}
          exercises={exercises}
          weekNumber={weekNumber}
          dayNumber={dayNumber}
          isEs={isEs}
        />
      )}
    </section>
  );
}
