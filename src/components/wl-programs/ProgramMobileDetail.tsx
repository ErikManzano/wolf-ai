import { ArrowLeft, CalendarDays, ChevronRight, Clock3 } from 'lucide-react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import { ProgramActionsMenu } from './ProgramActionsMenu';
import { ProgramStatusBadge } from './ProgramStatusBadge';

export function ProgramMobileDetail({
  row,
  isEs,
  showBack = true,
  onBack,
  onEdit,
  onAssign,
  onDuplicate,
  onDelete,
}: {
  row: CoachProgramRow;
  isEs: boolean;
  showBack?: boolean;
  onBack: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const weeks = row.program.totalWeeks ?? row.program.weeks?.length ?? 0;
  const daysPerWeek = row.program.daysPerWeek ?? row.program.weeks?.[0]?.days?.length ?? 0;

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
        <ProgramActionsMenu
          isEs={isEs}
          onEdit={onEdit}
          onAssign={onAssign}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </header>

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
                <ChevronRight size={16} className="wl-program-mobile-detail__athlete-chevron" aria-hidden />
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
            {new Date(row.updatedAt).toLocaleDateString(isEs ? 'es' : 'en')}
          </p>
        </div>
      </section>

      <div className="wl-program-mobile-detail__actions">
        <button type="button" className="btn-outline" onClick={onAssign}>
          {isEs ? 'Asignar atleta' : 'Assign athlete'}
        </button>
        <button type="button" className="btn-outline" onClick={onDuplicate}>
          {isEs ? 'Duplicar' : 'Duplicate'}
        </button>
        <button type="button" className="btn-outline wl-program-mobile-detail__danger" onClick={onDelete}>
          {isEs ? 'Eliminar' : 'Delete'}
        </button>
      </div>

      <footer className="wl-program-mobile-detail__footer">
        <button type="button" className="btn-primary wl-program-mobile-detail__cta" onClick={onEdit}>
          {isEs ? 'Editar programa' : 'Edit program'}
        </button>
      </footer>
    </section>
  );
}
