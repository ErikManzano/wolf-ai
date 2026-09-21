import { customFamilyFilterKey, type CoachExerciseFamily } from '../../models/exercise/coachFamily';
import { familyLabel } from '../../services/exercise/coachFamilyStore';
import { WlExerciseChipBar, type ExerciseChipItem } from './WlExerciseChipBar';
import {
  FAMILY_CHIP_ORDER,
  FAMILY_DISPLAY_LABEL,
  isExerciseFamilyFilter,
  type ExerciseFamilyFilter,
} from './exerciseListUtils';
import type { ExerciseQuickFilter } from './types';

export function WlExerciseFamilyChips({
  isEs,
  family,
  counts,
  customFamilies,
  onFamilyChange,
  onQuickFilterChange,
}: {
  isEs: boolean;
  family: ExerciseFamilyFilter;
  quickFilter?: ExerciseQuickFilter;
  counts: Record<string, number>;
  customFamilies: CoachExerciseFamily[];
  favoriteCount?: number;
  recentCount?: number;
  onFamilyChange: (family: ExerciseFamilyFilter) => void;
  onQuickFilterChange: (filter: ExerciseQuickFilter) => void;
}) {
  const activeId = family === 'all' ? 'all' : family;

  const items: ExerciseChipItem[] = [
    { id: 'all', label: isEs ? 'Todos' : 'All', count: counts.all ?? 0 },
    ...FAMILY_CHIP_ORDER.map((code) => ({
      id: code,
      label: FAMILY_DISPLAY_LABEL[code],
      count: counts[code] ?? 0,
    })),
    ...customFamilies.map((entry) => {
      const id = customFamilyFilterKey(entry.id);
      return {
        id,
        label: familyLabel(entry, isEs),
        count: counts[id] ?? 0,
        swatchColor: entry.color?.trim() || '#d6d3d1',
        variant: 'folder' as const,
      };
    }),
  ];

  const handleChange = (id: string) => {
    onQuickFilterChange('none');
    if (isExerciseFamilyFilter(id)) {
      onFamilyChange(id);
    }
  };

  return (
    <WlExerciseChipBar
      ariaLabel={isEs ? 'Familias' : 'Families'}
      items={items}
      activeId={activeId}
      moreLabel={isEs ? '+ Más' : '+ More'}
      onChange={handleChange}
    />
  );
}
