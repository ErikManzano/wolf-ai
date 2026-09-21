import type { MergedDefinitionView } from '../../models/exercise';
import { FAMILY_TOKEN } from '../exercise-intelligence/familyTokens';
import { ExerciseActionsMenu } from './ExerciseActionsMenu';
import { definitionFamily, taxonomyLabel } from './exerciseListUtils';
import type { ExerciseTaxonomyBundle } from '../../models/exercise';

export function WlExerciseCard({
  def,
  isEs,
  taxonomy,
  onOpen,
  onEdit,
  onPersonalize,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  def: MergedDefinitionView;
  isEs: boolean;
  taxonomy: ExerciseTaxonomyBundle;
  onOpen: () => void;
  onEdit: () => void;
  onPersonalize: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const family = definitionFamily(def);
  const token = family ? FAMILY_TOKEN[family] : null;
  const familyLabel = taxonomyLabel(taxonomy.families, family, isEs);
  const typeLabel = taxonomyLabel(taxonomy.objectives, def.objective, isEs);

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
      <div
        className="wl-exercise-card__thumb"
        style={{ background: token?.gradient ?? '#3f3f46', color: token ? '#0b0b0d' : '#fafafa' }}
        aria-hidden
      >
        {token?.abbr ?? 'EX'}
      </div>
      <div className="wl-exercise-card__body">
        <h3 className="wl-exercise-card__name">{def.effectiveDisplayName}</h3>
        <p className="wl-exercise-card__meta">
          {familyLabel} · {typeLabel}
        </p>
      </div>
      <div
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
