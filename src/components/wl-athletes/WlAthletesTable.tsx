import { Gauge, MoreHorizontal } from 'lucide-react';
import type { WlAthleteRosterRow } from '../../utils/wlAthleteRoster';
import { AthleteAvatar } from './AthleteAvatar';
import { AthletePrSummary } from './AthletePrSummary';
import { LevelBadge } from './LevelBadge';
import { StatusBadge } from './StatusBadge';

function adherenceTone(pct: number | null): string {
  if (pct == null) return 'muted';
  if (pct >= 60) return 'good';
  if (pct >= 25) return 'mid';
  return 'low';
}

export function WlAthletesTable({
  rows,
  isEs,
  canEdit,
  onSelect,
  onEdit,
  onOpenProgram,
}: {
  rows: WlAthleteRosterRow[];
  isEs: boolean;
  canEdit: boolean;
  onSelect: (profileId: string) => void;
  onEdit: (profileId: string) => void;
  onOpenProgram?: (coachProgramId: string) => void;
}) {
  return (
    <div className="wl-athletes-table-wrap">
      <table className="wl-athletes-table">
        <thead>
          <tr>
            <th>{isEs ? 'Atleta' : 'Athlete'}</th>
            <th className="wl-athletes-col-level">{isEs ? 'Nivel' : 'Level'}</th>
            <th>PRs</th>
            <th className="wl-athletes-col-account">{isEs ? 'Cuenta' : 'Account'}</th>
            <th className="wl-athletes-col-program">{isEs ? 'Rutina' : 'Program'}</th>
            <th className="wl-athletes-col-adherence">{isEs ? 'Adherencia' : 'Adherence'}</th>
            {canEdit ? <th className="wl-athletes-col-actions">{isEs ? 'Acciones' : 'Actions'}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.profileId} onClick={() => onSelect(row.profileId)}>
              <td>
                <div className="wl-athletes-table-athlete">
                  <AthleteAvatar name={row.name} />
                  <div className="wl-athletes-table-athlete__text">
                    <strong>{row.name}</strong>
                  </div>
                </div>
              </td>
              <td className="wl-athletes-col-level">
                <LevelBadge level={row.level} isEs={isEs} />
              </td>
              <td>
                <AthletePrSummary snatch={row.snatch} cleanJerk={row.cleanJerk} backSquat={row.backSquat} layout="stack" />
              </td>
              <td className="wl-athletes-col-account">
                {row.hasPlatformAccount ? (
                  <StatusBadge variant="active">{isEs ? 'Con acceso' : 'Has access'}</StatusBadge>
                ) : (
                  <StatusBadge variant="idle">{isEs ? 'Sin acceso' : 'No access'}</StatusBadge>
                )}
              </td>
              <td className="wl-athletes-col-program">
                {row.assignmentStatus === 'active' ? (
                  <div className="wl-athletes-program-cell wl-athletes-program-cell--multi">
                    {row.activePrograms.map((plan) =>
                      plan.coachProgramId && onOpenProgram ? (
                        <button
                          key={plan.assignmentId}
                          type="button"
                          className="wl-athletes-program-chip"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenProgram(plan.coachProgramId!);
                          }}
                        >
                          <span className="wl-athletes-program-name">{plan.programName}</span>
                          <span className="wl-athletes-program-meta">{plan.completionPct}%</span>
                        </button>
                      ) : (
                        <span key={plan.assignmentId} className="wl-athletes-program-chip wl-athletes-program-chip--static">
                          <span className="wl-athletes-program-name">{plan.programName}</span>
                          <span className="wl-athletes-program-meta">{plan.completionPct}%</span>
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <StatusBadge variant="none">{isEs ? 'Sin rutina' : 'No program'}</StatusBadge>
                )}
              </td>
              <td className="wl-athletes-col-adherence">
                {row.completionPct != null ? (
                  <div className={`wl-athletes-adherence wl-athletes-adherence--${adherenceTone(row.completionPct)}`}>
                    <div className="wl-athletes-adherence__bar" aria-hidden>
                      <div className="wl-athletes-adherence__fill" style={{ width: `${row.completionPct}%` }} />
                    </div>
                    <span className="wl-athletes-adherence__pct">{row.completionPct}%</span>
                  </div>
                ) : (
                  '—'
                )}
              </td>
              {canEdit ? (
                <td>
                  <div className="wl-athletes-actions">
                    <button
                      type="button"
                      className="btn-outline wl-athletes-btn-edit"
                      aria-label={isEs ? 'Editar PRs' : 'Edit PRs'}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(row.profileId);
                      }}
                    >
                      <Gauge size={16} strokeWidth={2.25} aria-hidden />
                      <span className="wl-athletes-btn-edit__label">{isEs ? 'Editar PRs' : 'Edit PRs'}</span>
                    </button>
                    <button
                      type="button"
                      className="wl-athletes-btn-more"
                      aria-label={isEs ? 'Más acciones' : 'More actions'}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
