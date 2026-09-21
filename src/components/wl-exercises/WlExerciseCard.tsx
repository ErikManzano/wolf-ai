import type { MergedDefinitionView } from '../../models/exercise';
import { ExerciseActionsMenu } from './ExerciseActionsMenu';
import { FamilyAvatar } from './FamilyAvatar';
import type { ExerciseListItem } from './types';

export function WlExerciseCard({
  item,
  def,
  isEs,
  onOpen,
  onEdit,
  onPersonalize,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  item: ExerciseListItem;
  def: MergedDefinitionView;
  isEs: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onPersonalize: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const usageLabel =
    item.usageCount > 0
      ? isEs
        ? `${item.usageCount} ${item.usageCount === 1 ? 'programa' : 'programas'}`
        : `${item.usageCount} ${item.usageCount === 1 ? 'program' : 'programs'}`
      : null;

  return (
    <article
      className="wl-exercise-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <FamilyAvatar family={item.family} size={36} />
      <div className="wl-exercise-card__body">
        <div className="wl-exercise-card__line1">
          <h3 className="wl-exercise-card__name" title={item.name}>
            {item.name}
          </h3>
          <span
            className={`wl-exercise-card__badge${item.isOfficial ? ' wl-exercise-card__badge--official' : ' wl-exercise-card__badge--custom'}`}
          >
            {item.isOfficial ? (isEs ? 'Oficial' : 'Official') : 'Custom'}
          </span>
        </div>
        <p className="wl-exercise-card__meta">
          {item.familyLabel} · {item.typeLabel}
          {usageLabel ? ` · ${usageLabel}` : null}
        </p>
      </div>
      <div
        className="wl-exercise-card__actions"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        role="presentation"
      >
        <ExerciseActionsMenu
          isEs={isEs}
          isOfficial={!def.coachId}
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
