import { isCustomFamilyFilter } from '../../models/exercise/coachFamily';
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
  onFamilyChange,
  onQuickFilterChange,
}: {
  isEs: boolean;
  family: ExerciseFamilyFilter;
  quickFilter?: ExerciseQuickFilter;
  counts: Record<string, number>;
  customFamilies?: unknown[];
  favoriteCount?: number;
  recentCount?: number;
  onFamilyChange: (family: ExerciseFamilyFilter) => void;
  onQuickFilterChange: (filter: ExerciseQuickFilter) => void;
}) {
  const activeId =
    family === 'all'
      ? 'all'
      : isCustomFamilyFilter(family)
        ? 'accessory'
        : family;

  const items: ExerciseChipItem[] = [
    { id: 'all', label: isEs ? 'Todos' : 'All', count: counts.all ?? 0 },
    ...FAMILY_CHIP_ORDER.map((code) => ({
      id: code,
      label: FAMILY_DISPLAY_LABEL[code],
      count: counts[code] ?? 0,
    })),
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
