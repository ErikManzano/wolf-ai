import { ArrowLeft, ChevronRight, X } from 'lucide-react';
import type { WlAthleteRosterRow } from '../../utils/wlAthleteRoster';
import type { PrLiftId } from '../../models/liftLogs';
import { AthleteActionsMenu } from './AthleteActionsMenu';
import { LevelBadge } from './LevelBadge';
import { StatusBadge } from './StatusBadge';

function formatDate(iso: string | null, isEs: boolean): string {
  if (!iso) return isEs ? 'Sin registro' : 'No activity';
  try {
    return new Date(iso).toLocaleDateString(isEs ? 'es' : 'en', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

export function WlAthleteDetail({
  row,
  isEs,
  canEdit,
  layout,
  showNav = true,
  onBack,
  onEdit,
  onAssign,
  onUnassign,
  onInvite,
  onDelete,
  onOpenProgram,
  onOpenPrs,
}: {
  row: WlAthleteRosterRow;
  isEs: boolean;
  canEdit: boolean;
  layout: 'mobile' | 'desktop';
  showNav?: boolean;
  onBack?: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onUnassign: () => void;
  onInvite: () => void;
  onDelete: () => void;
  onOpenProgram?: (coachProgramId: string) => void;
  onOpenPrs?: (liftId?: PrLiftId | null) => void;
}) {
  const prCards: { key: PrLiftId; label: string; value: number }[] = [
    { key: 'snatch', label: isEs ? 'Snatch' : 'Snatch', value: row.snatch },
    { key: 'clean_jerk', label: isEs ? 'Clean & Jerk' : 'Clean & Jerk', value: row.cleanJerk },
    { key: 'back_squat', label: isEs ? 'Squat' : 'Squat', value: row.backSquat },
  ];

  const actions = canEdit ? (
    <AthleteActionsMenu
      isEs={isEs}
      hasProgram={row.assignmentStatus === 'active'}
      hasAccess={row.hasPlatformAccount}
      onEdit={onEdit}
      onAssign={onAssign}
      onUnassign={onUnassign}
      onInvite={onInvite}
      onDelete={onDelete}
    />
  ) : null;

  return (
    <div className={`wl-athlete-detail wl-athlete-detail--${layout}`}>
      <header className="wl-athlete-detail__head">
        {showNav && layout === 'mobile' ? (
          <div className="wl-athlete-detail__head-top">
            <button type="button" className="wl-athlete-detail__icon-btn" onClick={onBack} aria-label={isEs ? 'Volver' : 'Back'}>
              <ArrowLeft size={20} />
            </button>
            {canEdit ? (
              <AthleteActionsMenu
                isEs={isEs}
                variant="card"
                hasProgram={row.assignmentStatus === 'active'}
                hasAccess={row.hasPlatformAccount}
                onEdit={onEdit}
                onAssign={onAssign}
                onUnassign={onUnassign}
                onInvite={onInvite}
                onDelete={onDelete}
              />
            ) : null}
          </div>
        ) : showNav && layout === 'desktop' ? (
          <div className="wl-athlete-detail__head-top wl-athlete-detail__head-top--desktop">
            {onBack ? (
              <button type="button" className="wl-athlete-detail__icon-btn" onClick={onBack} aria-label={isEs ? 'Cerrar' : 'Close'}>
                <X size={18} />
              </button>
            ) : (
              <span aria-hidden />
            )}
            {actions}
          </div>
        ) : canEdit && layout === 'desktop' ? (
          <div className="wl-athlete-detail__head-top wl-athlete-detail__head-top--desktop wl-athlete-detail__head-top--actions-only">
            {actions}
          </div>
        ) : canEdit && layout === 'mobile' ? (
          <div className="wl-athlete-detail__head-top wl-athlete-detail__head-top--actions-only">
            {actions}
          </div>
        ) : null}
        <div className="wl-athlete-detail__title-wrap">
          <h2 className="wl-athlete-detail__title">{row.name}</h2>
          <LevelBadge level={row.level} isEs={isEs} />
        </div>
      </header>

      <section className="wl-athlete-detail__section">
        <div className="wl-athlete-detail__section-head">
          <h3 className="wl-athlete-detail__section-title">{isEs ? 'PRs' : 'PRs'}</h3>
          <div className="wl-athlete-detail__section-actions">
            {onOpenPrs ? (
              <button type="button" className="wl-athlete-detail__refresh" onClick={() => onOpenPrs(null)}>
                {isEs ? 'Ver todos' : 'See all'}
              </button>
            ) : null}
            {canEdit ? (
              <button type="button" className="wl-athlete-detail__refresh" onClick={onEdit}>
                {isEs ? 'Perfil' : 'Profile'}
              </button>
            ) : null}
          </div>
        </div>
        <div className="wl-athletes-pr-cards">
          {prCards.map((pr) =>
            onOpenPrs ? (
              <button
                key={pr.key}
                type="button"
                className="wl-athletes-pr-card wl-athletes-pr-card--nav"
                onClick={() => onOpenPrs(pr.key)}
              >
                <span className="wl-athletes-pr-card__label">{pr.label}</span>
                <strong className="wl-athletes-pr-card__value">
                  {pr.value}
                  <span className="wl-athletes-pr-card__unit">kg</span>
                </strong>
              </button>
            ) : (
              <div key={pr.key} className="wl-athletes-pr-card">
                <span className="wl-athletes-pr-card__label">{pr.label}</span>
                <strong className="wl-athletes-pr-card__value">
                  {pr.value}
                  <span className="wl-athletes-pr-card__unit">kg</span>
                </strong>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="wl-athlete-detail__section">
        <h3 className="wl-athlete-detail__section-title">
          {row.activePrograms.length > 1
            ? isEs
              ? 'Programas activos'
              : 'Active programs'
            : isEs
              ? 'Programa actual'
              : 'Current program'}
        </h3>
        {row.assignmentStatus === 'active' ? (
          <div className="wl-athletes-active-programs">
            {row.activePrograms.map((plan) => {
              const canOpen = Boolean(plan.coachProgramId && onOpenProgram);
              const content = (
                <>
                  <p className="wl-athletes-detail-panel__title">{plan.programName}</p>
                  <p className="wl-athletes-detail-panel__meta">
                    {plan.completionPct}% · {isEs ? 'Desde' : 'Since'} {plan.assignedAt}
                  </p>
                </>
              );
              if (canOpen) {
                return (
                  <button
                    key={plan.assignmentId}
                    type="button"
                    className="wl-athletes-detail-panel wl-athletes-detail-panel--nav wl-athletes-active-programs__item"
                    onClick={() => onOpenProgram!(plan.coachProgramId!)}
                  >
                    {content}
                    <ChevronRight size={16} className="wl-athletes-detail-panel__chevron" aria-hidden />
                  </button>
                );
              }
              return (
                <div key={plan.assignmentId} className="wl-athletes-detail-panel wl-athletes-active-programs__item">
                  {content}
                </div>
              );
            })}
          </div>
        ) : (
          <StatusBadge variant="none">{isEs ? 'Sin programa WL' : 'No WL program'}</StatusBadge>
        )}
      </section>

      <section className="wl-athlete-detail__section">
        <h3 className="wl-athlete-detail__section-title">{isEs ? 'Seguimiento' : 'Tracking'}</h3>
        <div className="wl-athlete-detail__grid">
          <div className="wl-athletes-detail-panel">
            <p className="wl-athletes-detail-panel__label">{isEs ? 'Adherencia' : 'Adherence'}</p>
            {row.completionPct != null ? (
              <>
                <div className="wl-athletes-adherence wl-athletes-adherence--mid">
                  <div className="wl-athletes-adherence__bar" aria-hidden>
                    <div className="wl-athletes-adherence__fill" style={{ width: `${row.completionPct}%` }} />
                  </div>
                  <span className="wl-athletes-adherence__pct">{row.completionPct}%</span>
                </div>
                <p className="wl-athletes-detail-panel__meta">
                  {row.sessionsDone} / {row.sessionSlots} {isEs ? 'sesiones' : 'sessions'}
                </p>
              </>
            ) : (
              <p className="wl-athletes-detail-panel__meta">—</p>
            )}
          </div>

          <div className="wl-athletes-detail-panel">
            <p className="wl-athletes-detail-panel__label">{isEs ? 'Última actividad' : 'Last activity'}</p>
            <p className="wl-athletes-detail-panel__meta">{formatDate(row.lastActivityAt, isEs)}</p>
          </div>

          <div className="wl-athletes-detail-panel">
            <p className="wl-athletes-detail-panel__label">{isEs ? 'Cuenta app' : 'App account'}</p>
            {row.hasPlatformAccount ? (
              <StatusBadge variant="active">{row.loginLabel ?? (isEs ? 'Con acceso' : 'Has access')}</StatusBadge>
            ) : (
              <StatusBadge variant="idle">{isEs ? 'Sin acceso' : 'No access'}</StatusBadge>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
