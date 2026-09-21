import { ChevronRight } from 'lucide-react';
import type { Athlete } from '../../models/training';
import type { AthleteLiftLog, PrLiftId } from '../../models/liftLogs';
import {
  liftsInGroup,
  PR_LIFT_GROUP_ORDER,
  PR_LIFT_GROUPS,
  type PrLiftGroupId,
} from './PrLiftCatalog';
import { formatKg } from './e1rm';
import { formatPrDate } from './prDate';
import { summarizeLift } from './prSummaries';

export function WlPrsHub({
  isEs,
  logs,
  oneRM,
  onOpenLift,
}: {
  isEs: boolean;
  logs: AthleteLiftLog[];
  oneRM?: Athlete['oneRM'];
  onOpenLift: (liftId: PrLiftId) => void;
}) {
  return (
    <div className="wl-prs-hub">
      {PR_LIFT_GROUP_ORDER.map((groupId: PrLiftGroupId) => {
        const group = PR_LIFT_GROUPS[groupId];
        return (
          <section key={groupId} className="wl-prs-group">
            <h3 className="wl-prs-group__title">{isEs ? group.labelEs : group.labelEn}</h3>
            <div className="wl-prs-grid">
              {liftsInGroup(groupId).map((lift) => {
                const summary = summarizeLift(lift.id, logs, oneRM);
                const label = isEs ? lift.labelEs : lift.labelEn;
                return (
                  <button
                    key={lift.id}
                    type="button"
                    className="wl-prs-lift-card"
                    onClick={() => onOpenLift(lift.id)}
                  >
                    <span className="wl-prs-lift-card__short">{isEs ? lift.shortEs : lift.shortEn}</span>
                    <span className="wl-prs-lift-card__name">{label}</span>
                    <strong className="wl-prs-lift-card__kg">
                      {summary.bestE1rm > 0 ? (
                        <>
                          {formatKg(summary.bestE1rm)}
                          <span>kg</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </strong>
                    <span className="wl-prs-lift-card__date">{formatPrDate(summary.lastLoggedAt, isEs)}</span>
                    <ChevronRight size={16} className="wl-prs-lift-card__chevron" aria-hidden />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
