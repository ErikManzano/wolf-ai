import { ChevronRight } from 'lucide-react';
import type { WlAthleteRosterRow } from '../../utils/wlAthleteRoster';
import { AthleteAvatar } from './AthleteAvatar';
import { AthletePrSummary } from './AthletePrSummary';
import { AthleteActionsMenu } from './AthleteActionsMenu';
import { LevelBadge } from './LevelBadge';

export function WlAthletesMobileList({
  rows,
  isEs,
  canEdit,
  onSelect,
  onEdit,
  onAssign,
  onUnassign,
  onInvite,
  onDelete,
}: {
  rows: WlAthleteRosterRow[];
  isEs: boolean;
  canEdit: boolean;
  onSelect: (profileId: string) => void;
  onEdit: (profileId: string) => void;
  onAssign: (profileId: string) => void;
  onUnassign: (profileId: string) => void;
  onInvite: (profileId: string) => void;
  onDelete: (profileId: string) => void;
}) {
  return (
    <ul className="wl-athletes-mobile-list">
      {rows.map((row) => (
        <li key={row.profileId} className="wl-athletes-mobile-row">
          <button type="button" className="wl-athletes-mobile-card" onClick={() => onSelect(row.profileId)}>
            <AthleteAvatar name={row.name} size="md" />
            <div className="wl-athletes-mobile-card__body">
              <div className="wl-athletes-mobile-card__top">
                <strong>{row.name}</strong>
                <LevelBadge level={row.level} isEs={isEs} />
              </div>
              <AthletePrSummary
                snatch={row.snatch}
                cleanJerk={row.cleanJerk}
                backSquat={row.backSquat}
                layout="inline"
              />
              <p className="wl-athletes-mobile-card__program">
                {row.assignmentStatus === 'active' ? (
                  <>
                    <span>{row.programName}</span>
                    {row.completionPct != null ? (
                      <span className="wl-athletes-mobile-card__pct">{row.completionPct}%</span>
                    ) : null}
                  </>
                ) : (
                  <span className="wl-athletes-mobile-card__no-plan">
                    {isEs ? 'Sin programa asignado' : 'No program assigned'}
                  </span>
                )}
              </p>
            </div>
            <ChevronRight size={20} className="wl-athletes-mobile-card__chevron" aria-hidden />
          </button>
          {canEdit ? (
            <div className="wl-athletes-mobile-row__menu">
              <AthleteActionsMenu
                isEs={isEs}
                variant="card"
                hasProgram={row.assignmentStatus === 'active'}
                hasAccess={row.hasPlatformAccount}
                onEdit={() => onEdit(row.profileId)}
                onAssign={() => onAssign(row.profileId)}
                onUnassign={() => onUnassign(row.profileId)}
                onInvite={() => onInvite(row.profileId)}
                onDelete={() => onDelete(row.profileId)}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
