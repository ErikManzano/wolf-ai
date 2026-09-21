import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Clock3,
  Copy,
  Pencil,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import { formatProgramDateRange, formatShortDateFriendly } from '../../utils/programSchedule';
import { ProgramStatusBadge } from './ProgramStatusBadge';

export function ProgramMobileDetail({
  row,
  isEs,
  showBack = true,
  onBack,
  onEdit,
  onSchedule,
  onAssign,
  onDuplicate,
  onDelete,
  onRemoveEnrollment,
}: {
  row: CoachProgramRow;
  isEs: boolean;
  showBack?: boolean;
  onBack: () => void;
  onEdit: () => void;
  onSchedule: () => void;
  onAssign: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRemoveEnrollment?: (assignmentId: string, athleteName: string) => void;
}) {
  const weeks = row.program.totalWeeks ?? row.program.weeks?.length ?? 0;
  const daysPerWeek = row.program.daysPerWeek ?? row.program.weeks?.[0]?.days?.length ?? 0;
  const dateRange = formatProgramDateRange(row.program, isEs);

  return (
    <section className="wl-program-mobile-detail">
      <header className="wl-program-mobile-detail__head">
        {showBack ? (
          <button type="button" className="wl-program-mobile-detail__back" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
        ) : null}
        <div className="wl-program-mobile-detail__title-wrap">
          <h2>{row.name}</h2>
          <ProgramStatusBadge status={row.status} isEs={isEs} />
        </div>
      </header>

      <div
        className="wl-program-mobile-detail__action-bar"
        role="toolbar"
        aria-label={isEs ? 'Acciones del programa' : 'Program actions'}
      >
        <button
          type="button"
          className="wl-program-mobile-detail__action-chip wl-program-mobile-detail__action-chip--primary"
          onClick={onEdit}
        >
          <Pencil size={18} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Editar' : 'Edit'}</span>
        </button>
        <button type="button" className="wl-program-mobile-detail__action-chip" onClick={onSchedule}>
          <CalendarRange size={18} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Fechas' : 'Dates'}</span>
        </button>
        <button type="button" className="wl-program-mobile-detail__action-chip" onClick={onAssign}>
          <UserPlus size={18} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Asignar' : 'Assign'}</span>
        </button>
        <button type="button" className="wl-program-mobile-detail__action-chip" onClick={onDuplicate}>
          <Copy size={18} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Duplicar' : 'Duplicate'}</span>
        </button>
        <button
          type="button"
          className="wl-program-mobile-detail__action-chip wl-program-mobile-detail__action-chip--danger"
          onClick={onDelete}
        >
          <Trash2 size={18} strokeWidth={2.1} aria-hidden />
          <span>{isEs ? 'Eliminar' : 'Delete'}</span>
        </button>
      </div>

      <section className="wl-program-mobile-detail__section">
        <h3 className="wl-program-mobile-detail__section-title">{isEs ? 'Resumen' : 'Summary'}</h3>
        <div className="wl-program-mobile-detail__summary">
          <article className="wl-program-mobile-detail__summary-card">
            <div>
              <strong>{weeks}</strong>
              <p>{isEs ? 'Semanas' : 'Weeks'}</p>
            </div>
            <CalendarDays size={18} />
          </article>
          <article className="wl-program-mobile-detail__summary-card">
            <div>
              <strong>{daysPerWeek}</strong>
              <p>{isEs ? 'Días / semana' : 'Days / week'}</p>
            </div>
            <Clock3 size={18} />
          </article>
        </div>
        {dateRange ? (
          <div className="wl-program-mobile-detail__panel wl-program-mobile-detail__calendar">
            <p className="wl-program-mobile-detail__label">
              {isEs ? 'Calendario competitivo' : 'Competition calendar'}
            </p>
            <p>{dateRange}</p>
            <button type="button" className="wl-program-mobile-detail__link" onClick={onSchedule}>
              {isEs ? 'Editar fechas' : 'Edit dates'}
            </button>
          </div>
        ) : null}
      </section>

      <section className="wl-program-mobile-detail__section">
        <h3 className="wl-program-mobile-detail__section-title">{isEs ? 'Atletas asignados' : 'Assigned athletes'}</h3>
        <div className="wl-program-mobile-detail__panel">
          {row.enrolledAthletes.length === 0 ? (
            <p className="wl-program-mobile-detail__muted">{isEs ? 'Sin atletas asignados' : 'No athletes assigned'}</p>
          ) : (
            row.enrolledAthletes.map((athlete) => (
              <div key={athlete.assignmentId} className="wl-program-mobile-detail__athlete-row">
                <span className="wl-program-mobile-detail__athlete-avatar">
                  {athlete.athleteName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((v) => v[0]?.toUpperCase() ?? '')
                    .join('')}
                </span>
                <div className="wl-program-mobile-detail__athlete-text">
                  <strong>{athlete.athleteName}</strong>
                  <p>
                    {athlete.completionPct != null
                      ? `${athlete.completionPct}% ${isEs ? 'adherencia' : 'adherence'}`
                      : isEs
                        ? 'Sin adherencia'
                        : 'No adherence'}
                  </p>
                </div>
                {onRemoveEnrollment ? (
                  <button
                    type="button"
                    className="wl-program-mobile-detail__athlete-remove"
                    aria-label={isEs ? `Quitar a ${athlete.athleteName}` : `Remove ${athlete.athleteName}`}
                    onClick={() => onRemoveEnrollment(athlete.assignmentId, athlete.athleteName)}
                  >
                    <UserMinus size={16} aria-hidden />
                  </button>
                ) : (
                  <ChevronRight size={16} className="wl-program-mobile-detail__athlete-chevron" aria-hidden />
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="wl-program-mobile-detail__section">
        <h3 className="wl-program-mobile-detail__section-title">{isEs ? 'Adherencia general' : 'Overall adherence'}</h3>
        <div className="wl-program-mobile-detail__panel">
          <p>{row.avgAdherencePct != null ? `${row.avgAdherencePct}%` : '—'}</p>
          <div className="wl-program-mobile-detail__adherence-bar" aria-hidden>
            <i style={{ width: `${row.avgAdherencePct ?? 0}%` }} />
          </div>
          <p className="wl-program-mobile-detail__muted">
            {isEs
              ? `${row.enrolledAthletes.length} atleta(s) con programa`
              : `${row.enrolledAthletes.length} athlete(s) on this program`}
          </p>
        </div>
      </section>

      <section className="wl-program-mobile-detail__section">
        <h3 className="wl-program-mobile-detail__section-title">{isEs ? 'Actualizado' : 'Updated'}</h3>
        <div className="wl-program-mobile-detail__panel">
          <p>
            {formatShortDateFriendly(row.updatedAt, isEs)}
          </p>
        </div>
      </section>
    </section>
  );
}
