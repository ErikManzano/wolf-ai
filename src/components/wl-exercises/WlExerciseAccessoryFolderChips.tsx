import { customFamilyFilterKey, isCustomFamilyFilter, parseCustomFamilyFilterKey, type CoachExerciseFamily } from '../../models/exercise/coachFamily';
import { familyLabel } from '../../services/exercise/coachFamilyStore';
import { WlExerciseChipBar, type ExerciseChipItem } from './WlExerciseChipBar';
import type { ExerciseFamilyFilter } from './exerciseListUtils';

export function WlExerciseAccessoryFolderChips({
  isEs,
  family,
  accessorySubFilter,
  unfiledCount,
  folderCounts,
  customFamilies,
  onFamilyChange,
  onAccessorySubFilterChange,
}: {
  isEs: boolean;
  family: ExerciseFamilyFilter;
  accessorySubFilter: 'all' | 'unfiled';
  unfiledCount: number;
  folderCounts: Record<string, number>;
  customFamilies: CoachExerciseFamily[];
  onFamilyChange: (family: ExerciseFamilyFilter) => void;
  onAccessorySubFilterChange: (filter: 'all' | 'unfiled') => void;
}) {
  const show = family === 'accessory' || isCustomFamilyFilter(family) || accessorySubFilter === 'unfiled';

  if (!show) return null;

  const folderId = isCustomFamilyFilter(family) ? parseCustomFamilyFilterKey(family) : null;
  const activeId =
    folderId != null
      ? customFamilyFilterKey(folderId)
      : accessorySubFilter === 'unfiled'
        ? 'unfiled'
        : 'all-folders';

  const items: ExerciseChipItem[] = [
    {
      id: 'all-folders',
      label: isEs ? 'Todas las carpetas' : 'All folders',
      count: unfiledCount + Object.values(folderCounts).reduce((sum, count) => sum + count, 0),
    },
  ];

  if (unfiledCount > 0) {
    items.push({
      id: 'unfiled',
      label: isEs ? 'Sin carpeta' : 'No folder',
      count: unfiledCount,
    });
  }

  for (const entry of customFamilies) {
    const id = customFamilyFilterKey(entry.id);
    const count = folderCounts[id] ?? 0;
    if (count <= 0) continue;
    items.push({
      id,
      label: familyLabel(entry, isEs),
      count,
      swatchColor: entry.color?.trim() || '#d6d3d1',
      variant: 'folder',
    });
  }

  if (items.length <= 1) return null;

  const handleChange = (id: string) => {
    if (id === 'all-folders') {
      onFamilyChange('accessory');
      onAccessorySubFilterChange('all');
      return;
    }
    if (id === 'unfiled') {
      onFamilyChange('accessory');
      onAccessorySubFilterChange('unfiled');
      return;
    }
    onFamilyChange(id as ExerciseFamilyFilter);
    onAccessorySubFilterChange('all');
  };

  return (
    <WlExerciseChipBar
      ariaLabel={isEs ? 'Carpetas de accesorios' : 'Accessory folders'}
      items={items}
      activeId={activeId}
      moreLabel={isEs ? '+ Más' : '+ More'}
      onChange={handleChange}
    />
  );
}
