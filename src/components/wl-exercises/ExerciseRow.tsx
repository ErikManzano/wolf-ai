import type { MergedDefinitionView } from '../../models/exercise';
import { ExerciseActionsMenu } from './ExerciseActionsMenu';
import { OBJECTIVE_DOT_COLOR } from './exerciseListUtils';
import type { ExerciseListItem } from './types';

export function ExerciseRow({
  item,
  def,
  isEs,
  selected,
  onOpen,
  onEdit,
  onPersonalize,
  onDuplicate,
  onArchive,
  onDelete,
  onToggleSelect,
  onShiftSelect,
}: {
  item: ExerciseListItem;
  def: MergedDefinitionView;
  isEs: boolean;
  selected: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onPersonalize: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
  onShiftSelect: () => void;
}) {
  const isOfficial = !def.coachId;
  const typeDot = OBJECTIVE_DOT_COLOR[item.type] ?? '#71717a';

  return (
    <article
      className={`wl-exercise-table-row${selected ? ' is-selected' : ''}${item.isArchived ? ' is-archived' : ''}`}
      role="row"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div
        className="wl-exercise-table-row__cell wl-exercise-table-row__cell--check"
        role="gridcell"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <input
          type="checkbox"
          className="wl-exercise-table-check"
          checked={selected}
          aria-label={isEs ? `Seleccionar ${item.name}` : `Select ${item.name}`}
          onChange={(event) => {
            event.stopPropagation();
            if (event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey) {
              onShiftSelect();
              return;
            }
            onToggleSelect();
          }}
        />
      </div>

      <div className="wl-exercise-table-row__cell wl-exercise-table-row__cell--name" role="gridcell">
        <span className="wl-exercise-table-row__name" title={item.name}>
          {item.name}
        </span>
        <span className="wl-exercise-table-row__mobile-meta">
          {item.familyLabel} · {item.typeLabel}
        </span>
      </div>

      <div className="wl-exercise-table-row__cell wl-exercise-table-row__cell--family" role="gridcell">
        <span className="wl-exercise-table-row__muted">{item.familyLabel}</span>
      </div>

      <div className="wl-exercise-table-row__cell wl-exercise-table-row__cell--type" role="gridcell">
        <span className="wl-exercise-table-row__type">
          <span className="wl-exercise-table-row__type-dot" style={{ background: typeDot }} aria-hidden />
          {item.typeLabel}
        </span>
      </div>

      <div className="wl-exercise-table-row__cell wl-exercise-table-row__cell--state" role="gridcell">
        <span
          className={`wl-exercise-table-badge${item.isOfficial ? ' wl-exercise-table-badge--official' : ' wl-exercise-table-badge--custom'}`}
        >
          {item.isOfficial ? (isEs ? 'Oficial' : 'Official') : 'Custom'}
        </span>
      </div>

      <div
        className="wl-exercise-table-row__cell wl-exercise-table-row__cell--actions"
        role="gridcell"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <ExerciseActionsMenu
          isEs={isEs}
          isOfficial={isOfficial}
          onEdit={onEdit}
          onPersonalize={onPersonalize}
          onDuplicate={onDuplicate}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}
