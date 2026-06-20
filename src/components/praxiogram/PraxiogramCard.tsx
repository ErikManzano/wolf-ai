import { LayoutGrid } from 'lucide-react';
import type { PraxiogramListItem } from '../../models/praxiogram';
import { PraxiogramActionsMenu } from './PraxiogramActionsMenu';
import { PraxiogramStatusBadge } from './PraxiogramStatusBadge';

export function PraxiogramCard({
  row,
  isEs,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  row: PraxiogramListItem;
  isEs: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const completionPct =
    row.situationCount > 0 ? Math.round((row.completeCount / row.situationCount) * 100) : 0;

  return (
    <article
      className="wl-program-card prx-hub-card"
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
          <h3>{row.title}</h3>
          <PraxiogramStatusBadge status={row.status} isEs={isEs} />
        </div>
      </header>

      <p className="prx-hub-card__context">{row.sportContext}</p>

      <div className="wl-program-card__meta">
        <span>
          <LayoutGrid size={14} aria-hidden />
          {row.situationCount} {isEs ? 'situaciones' : 'situations'}
        </span>
        <span>
          {isEs ? 'Completas' : 'Complete'}: {row.completeCount}
        </span>
      </div>

      <div className="wl-programs-adherence-cell">
        <span>{completionPct}%</span>
        <div className="wl-programs-adherence-bar" aria-hidden>
          <i style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      <div
        className="prx-hub-card__actions"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        role="presentation"
      >
        <PraxiogramActionsMenu
          isEs={isEs}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}

export default PraxiogramCard;
