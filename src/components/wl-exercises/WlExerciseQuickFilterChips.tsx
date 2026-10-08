import { WlExerciseChipBar, type ExerciseChipItem } from './WlExerciseChipBar';
import type { ExerciseQuickFilter } from './types';

/** Accesos rápidos (favoritos / recientes) sin duplicar filtros de sección o familia. */
export function WlExerciseQuickFilterChips({
  isEs,
  quickFilter,
  favoriteCount,
  recentCount,
  onQuickFilterChange,
  compact = false,
}: {
  isEs: boolean;
  quickFilter: ExerciseQuickFilter;
  favoriteCount: number;
  recentCount: number;
  onQuickFilterChange: (filter: ExerciseQuickFilter) => void;
  compact?: boolean;
}) {
  const activeId =
    quickFilter === 'favorites' ? 'favorites' : quickFilter === 'recent' ? 'recent' : 'none';

  const items: ExerciseChipItem[] = [
    { id: 'favorites', label: isEs ? 'Favoritos' : 'Favorites', count: favoriteCount, icon: 'star' },
    { id: 'recent', label: isEs ? 'Recientes' : 'Recent', count: recentCount, icon: 'clock' },
  ];

  const handleChange = (id: string) => {
    if (id === 'favorites') {
      onQuickFilterChange(quickFilter === 'favorites' ? 'none' : 'favorites');
      return;
    }
    if (id === 'recent') {
      onQuickFilterChange(quickFilter === 'recent' ? 'none' : 'recent');
      return;
    }
    onQuickFilterChange('none');
  };

  return (
    <WlExerciseChipBar
      ariaLabel={isEs ? 'Accesos rápidos' : 'Quick access'}
      items={items}
      activeId={activeId === 'none' ? '' : activeId}
      moreLabel={isEs ? '+ Más' : '+ More'}
      rowClassName={compact ? 'wl-exercises-chips-row--compact-quick' : undefined}
      onChange={handleChange}
    />
  );
}
