import type { CatalogGrupoFilter } from '../../data/wlCatalogGroups';
import { WlExerciseGrupoGrid } from './WlExerciseGrupoGrid';

export function WlExerciseGrupoChips({
  isEs,
  catalogGrupo,
  counts,
  onChange,
  compact = false,
  sidebar = false,
  preventFocusSteal = false,
}: {
  isEs: boolean;
  catalogGrupo: CatalogGrupoFilter;
  counts: Record<string, number | undefined>;
  onChange: (grupo: CatalogGrupoFilter) => void;
  compact?: boolean;
  sidebar?: boolean;
  preventFocusSteal?: boolean;
}) {
  return (
    <WlExerciseGrupoGrid
      isEs={isEs}
      catalogGrupo={catalogGrupo}
      counts={counts}
      onChange={onChange}
      compact={compact}
      sidebar={sidebar}
      preventFocusSteal={preventFocusSteal}
    />
  );
}
