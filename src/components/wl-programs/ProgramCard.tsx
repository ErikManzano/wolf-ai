import { Calendar, LayoutGrid } from 'lucide-react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import { formatProgramDateRange, formatShortDateFriendly } from '../../utils/programSchedule';
import { ProgramActionsMenu } from './ProgramActionsMenu';
import { ProgramEnrolledAvatars } from './ProgramEnrolledAvatars';
import { ProgramStatusBadge } from './ProgramStatusBadge';

export function ProgramCard({
  row,
  isEs,
  onOpen,
  onEdit,
  onSchedule,
  onAssign,
  onDuplicate,
  onDelete,
}: {
  row: CoachProgramRow;
  isEs: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onSchedule: () => void;
  onAssign: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const weeks = row.program.totalWeeks ?? row.program.weeks?.length ?? 0;
  const daysPerWeek = row.program.daysPerWeek ?? row.program.weeks?.[0]?.days?.length ?? 0;
  const dateRange = formatProgramDateRange(row.program, isEs);
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
            onSchedule={onSchedule}
            onAssign={onAssign}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      </header>

      <div className="wl-program-card__meta">
        <span>
          <Calendar size={14} aria-hidden />
          {dateRange ?? (isEs ? `${weeks} semanas` : `${weeks} weeks`)}
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
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            role="presentation"
          >
            <ProgramEnrolledAvatars
              enrolledAthletes={row.enrolledAthletes}
              isEs={isEs}
              onClick={row.enrolledAthletes.length > 0 ? onAssign : undefined}
            />
          </div>
          {row.enrolledAthletes.length > 0 ? (
            <span className={`wl-program-card__adherence ${adherenceClass}`}>
              {adherence != null ? `${adherence}%` : '—'}
            </span>
          ) : null}
        </div>
      </section>

      <div className="wl-program-card__divider" aria-hidden />

      <section className="wl-program-card__section">
        <p className="wl-program-card__label">{isEs ? 'Actualización' : 'Updated'}</p>
        <p className="wl-program-card__updated">
          <Calendar size={14} aria-hidden />
          {formatShortDateFriendly(row.updatedAt, isEs)}
        </p>
      </section>
    </article>
  );
}
