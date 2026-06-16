import { Calendar, LayoutGrid } from 'lucide-react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import { ProgramActionsMenu } from './ProgramActionsMenu';
import { ProgramStatusBadge } from './ProgramStatusBadge';

function athleteInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProgramCard({
  row,
  isEs,
  onOpen,
  onEdit,
  onAssign,
  onDuplicate,
  onDelete,
}: {
  row: CoachProgramRow;
  isEs: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const weeks = row.program.totalWeeks ?? row.program.weeks?.length ?? 0;
  const daysPerWeek = row.program.daysPerWeek ?? row.program.weeks?.[0]?.days?.length ?? 0;
  const primaryAthlete = row.enrolledAthletes[0] ?? null;
  const adherence = row.avgAdherencePct;
  const adherenceClass =
    adherence == null
      ? 'wl-program-card__adherence--empty'
      : adherence >= 70
        ? 'wl-program-card__adherence--good'
        : 'wl-program-card__adherence--low';

  return (
    <article
      className="wl-program-card"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <header className="wl-program-card__header">
        <div className="wl-program-card__title-row">
          <h3>{row.name}</h3>
          <ProgramStatusBadge status={row.status} isEs={isEs} />
        </div>
        <div
          className="wl-program-card__menu"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="presentation"
        >
          <ProgramActionsMenu
            isEs={isEs}
            variant="card"
            onEdit={onEdit}
            onAssign={onAssign}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      </header>

      <div className="wl-program-card__meta">
        <span>
          <Calendar size={14} aria-hidden />
          {isEs ? `${weeks} semanas` : `${weeks} weeks`}
        </span>
        <span>
          <LayoutGrid size={14} aria-hidden />
          {isEs ? `${daysPerWeek} días / semana` : `${daysPerWeek} days / week`}
        </span>
      </div>

      <div className="wl-program-card__divider" aria-hidden />

      <section className="wl-program-card__section">
        <p className="wl-program-card__label">{isEs ? 'Atletas asignados' : 'Assigned athletes'}</p>
        <div className="wl-program-card__athletes-row">
          {primaryAthlete ? (
            <>
              <div className="wl-program-card__athlete">
                <span className="wl-program-card__avatar" aria-hidden>
                  {athleteInitials(primaryAthlete.athleteName)}
                </span>
                <div className="wl-program-card__athlete-text">
                  <strong>{primaryAthlete.athleteName}</strong>
                  <p>
                    {isEs
                      ? `${row.enrolledAthletes.length} atleta${row.enrolledAthletes.length === 1 ? '' : 's'}`
                      : `${row.enrolledAthletes.length} athlete${row.enrolledAthletes.length === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
              <span className={`wl-program-card__adherence ${adherenceClass}`}>
                {adherence != null ? `${adherence}%` : '—'}
              </span>
            </>
          ) : (
            <p className="wl-program-card__empty-athletes">
              {isEs ? 'Sin atletas asignados' : 'No athletes assigned'}
            </p>
          )}
        </div>
      </section>

      <div className="wl-program-card__divider" aria-hidden />

      <section className="wl-program-card__section">
        <p className="wl-program-card__label">{isEs ? 'Actualización' : 'Updated'}</p>
        <p className="wl-program-card__updated">
          <Calendar size={14} aria-hidden />
          {new Date(row.updatedAt).toLocaleDateString(isEs ? 'es' : 'en')}
        </p>
      </section>
    </article>
  );
}
