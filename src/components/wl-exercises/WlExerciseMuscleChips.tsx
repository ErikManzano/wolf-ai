import { WlExerciseChipBar, type ExerciseChipItem } from './WlExerciseChipBar';
import { MUSCLE_CHIP_ORDER, MUSCLE_LABELS, type MuscleGroupFilter } from './exerciseListUtils';
import type { ExerciseQuickFilter } from './types';

export function WlExerciseMuscleChips({
  isEs,
  muscleGroup,
  quickFilter,
  counts,
  favoriteCount,
  recentCount,
  onChange,
  onQuickFilterChange,
}: {
  isEs: boolean;
  muscleGroup: MuscleGroupFilter;
  quickFilter: ExerciseQuickFilter;
  counts: Record<string, number>;
  favoriteCount: number;
  recentCount: number;
  onChange: (group: MuscleGroupFilter) => void;
  onQuickFilterChange: (filter: ExerciseQuickFilter) => void;
}) {
  const activeId =
    quickFilter === 'favorites'
      ? 'favorites'
      : quickFilter === 'recent'
        ? 'recent'
        : muscleGroup === 'all'
          ? 'all'
          : muscleGroup;

  const items: ExerciseChipItem[] = [
    { id: 'favorites', label: isEs ? 'Favoritos' : 'Favorites', count: favoriteCount, icon: 'star' },
    { id: 'recent', label: isEs ? 'Recientes' : 'Recent', count: recentCount, icon: 'clock' },
    { id: 'all', label: isEs ? 'Todos' : 'All', count: counts.all ?? 0 },
    ...MUSCLE_CHIP_ORDER.map((code) => ({
      id: code,
      label: isEs ? MUSCLE_LABELS[code].es : MUSCLE_LABELS[code].en,
      count: counts[code],
    })),
  ];

  const handleChange = (id: string) => {
    if (id === 'favorites') {
      onQuickFilterChange('favorites');
      onChange('all');
      return;
    }
    if (id === 'recent') {
      onQuickFilterChange('recent');
      onChange('all');
      return;
    }
    onQuickFilterChange('none');
    onChange(id as MuscleGroupFilter);
  };

  return (
    <WlExerciseChipBar
      ariaLabel={isEs ? 'Grupos musculares' : 'Muscle groups'}
      items={items}
      activeId={activeId}
      moreLabel={isEs ? '+ Más' : '+ More'}
      onChange={handleChange}
    />
  );
}
