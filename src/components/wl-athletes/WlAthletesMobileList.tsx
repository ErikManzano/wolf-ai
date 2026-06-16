import { ChevronRight } from 'lucide-react';
import type { WlAthleteRosterRow } from '../../utils/wlAthleteRoster';
import { AthleteAvatar } from './AthleteAvatar';
import { AthletePrSummary } from './AthletePrSummary';
import { LevelBadge } from './LevelBadge';

export function WlAthletesMobileList({
  rows,
  isEs,
  onSelect,
}: {
  rows: WlAthleteRosterRow[];
  isEs: boolean;
  onSelect: (profileId: string) => void;
}) {
  return (
    <ul className="wl-athletes-mobile-list">
      {rows.map((row) => (
        <li key={row.profileId}>
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
                    {isEs ? 'Sin rutina asignada' : 'No program assigned'}
                  </span>
                )}
              </p>
            </div>
            <ChevronRight size={20} className="wl-athletes-mobile-card__chevron" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
