import type { Athlete } from '../../../models/training';
import { ProgramContextSection } from './ProgramContextSection';

export function AthleteContextTab({
  athlete,
  weekNumber,
  dayNumber,
  isEs,
  onEditPrs,
}: {
  athlete: Athlete | null;
  weekNumber: number;
  dayNumber: number;
  isEs: boolean;
  onEditPrs?: () => void;
}) {
  if (!athlete) {
    return (
      <div className="wl-program-context-tab">
        <ProgramContextSection title={isEs ? 'Atleta' : 'Athlete'}>
          <p className="wl-program-context-empty">
            {isEs ? 'Selecciona un atleta para ver PRs y perfil.' : 'Select an athlete to see PRs and profile.'}
          </p>
        </ProgramContextSection>
      </div>
    );
  }

  const profileSubtitle =
    athlete.bodyweight > 0
      ? `${athlete.bodyweight} kg`
      : isEs
        ? 'Perfil de carga'
        : 'Load profile';

  return (
    <div className="wl-program-context-tab">
      <ProgramContextSection title={athlete.name} subtitle={profileSubtitle}>
        <dl className="wl-program-context-kv">
          <div>
            <dt>{isEs ? 'Semana / día editando' : 'Editing week / day'}</dt>
            <dd>
              {isEs ? 'Sem' : 'Wk'} {weekNumber} · {isEs ? 'Día' : 'Day'} {dayNumber}
            </dd>
          </div>
        </dl>
      </ProgramContextSection>

      <ProgramContextSection
        title={isEs ? 'PRs actuales' : 'Current PRs'}
        action={
          onEditPrs ? (
            <button type="button" className="wl-program-context-link" onClick={onEditPrs}>
              {isEs ? 'Editar' : 'Edit'}
            </button>
          ) : undefined
        }
      >
        <dl className="wl-program-context-kv">
          <div>
            <dt>Snatch</dt>
            <dd>{athlete.oneRM.snatch} kg</dd>
          </div>
          <div>
            <dt>C&amp;J</dt>
            <dd>{athlete.oneRM.cleanJerk} kg</dd>
          </div>
          <div>
            <dt>{isEs ? 'Sent. atrás' : 'Back sq'}</dt>
            <dd>{athlete.oneRM.backSquat} kg</dd>
          </div>
          <div>
            <dt>{isEs ? 'Sent. front' : 'Front sq'}</dt>
            <dd>{athlete.oneRM.frontSquat} kg</dd>
          </div>
        </dl>
      </ProgramContextSection>
    </div>
  );
}
