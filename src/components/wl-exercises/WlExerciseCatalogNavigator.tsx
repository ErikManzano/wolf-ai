import type { CoachExerciseFamily } from '../../models/exercise/coachFamily';
import {
  customFamilyFilterKey,
  isCustomFamilyFilter,
  parseCustomFamilyFilterKey,
} from '../../models/exercise/coachFamily';
import { familyLabel } from '../../services/exercise/coachFamilyStore';
import type { CatalogGrupoFilter } from '../../data/wlCatalogGroups';
import { WlExerciseGrupoChips } from './WlExerciseGrupoChips';
import {
  CATALOG_SECTION_OPTIONS,
  catalogSectionUsesMuscles,
  FAMILY_CHIP_ORDER,
  FAMILY_DISPLAY_LABEL,
  isExerciseFamilyFilter,
  MUSCLE_CHIP_ORDER,
  MUSCLE_LABELS,
  usesMuscleGroupChips,
  type CatalogSectionFilter,
  type ExerciseDisciplineFilter,
  type ExerciseFamilyFilter,
  type MuscleGroupFilter,
} from './exerciseListUtils';
import type { ExerciseQuickFilter } from './types';
import { WlExerciseCatalogSidebarList, type CatalogSidebarItem } from './WlExerciseCatalogSidebarList';
import { Library } from 'lucide-react';

export function WlExerciseCatalogNavigator({
  isEs,
  section,
  discipline,
  sectionCounts,
  onSectionChange,
  muscleChipMode,
  muscleGroup,
  onMuscleGroupChange,
  family,
  onFamilyChange,
  catalogGrupo,
  onCatalogGrupoChange,
  catalogGrupoCounts,
  quickFilter,
  onQuickFilterChange,
  refineCounts,
  favoriteCount,
  recentCount,
  accessorySubFilter,
  onAccessorySubFilterChange,
  unfiledCount,
  folderCounts,
  customFamilies,
}: {
  isEs: boolean;
  section: CatalogSectionFilter;
  discipline: ExerciseDisciplineFilter;
  sectionCounts: Record<string, number>;
  onSectionChange: (section: CatalogSectionFilter) => void;
  muscleChipMode: boolean;
  muscleGroup: MuscleGroupFilter;
  onMuscleGroupChange: (group: MuscleGroupFilter) => void;
  family: ExerciseFamilyFilter;
  onFamilyChange: (family: ExerciseFamilyFilter) => void;
  catalogGrupo: CatalogGrupoFilter;
  onCatalogGrupoChange: (grupo: CatalogGrupoFilter) => void;
  catalogGrupoCounts: Record<string, number | undefined>;
  quickFilter: ExerciseQuickFilter;
  onQuickFilterChange: (filter: ExerciseQuickFilter) => void;
  refineCounts: Record<string, number>;
  favoriteCount: number;
  recentCount: number;
  accessorySubFilter: 'all' | 'unfiled';
  onAccessorySubFilterChange: (filter: 'all' | 'unfiled') => void;
  unfiledCount: number;
  folderCounts: Record<string, number>;
  customFamilies: CoachExerciseFamily[];
}) {
  const sectionChosen = section !== 'all';
  const refineByDiscipline = section === 'all' && usesMuscleGroupChips(discipline);
  const showRefinePanel = sectionChosen || refineByDiscipline;
  const showMuscleRefine = muscleChipMode && showRefinePanel;
  const showGrupoRefine = section === 'weightlifting';
  const showFamilyRefine = !muscleChipMode && sectionChosen && section !== 'weightlifting';

  const sectionItems: CatalogSidebarItem[] = CATALOG_SECTION_OPTIONS.filter(
    (option) => option.id === 'all' || (sectionCounts[option.id] ?? 0) > 0,
  ).map((option) => ({
    id: option.id,
    label: isEs ? option.labelEs : option.labelEn,
    count: sectionCounts[option.id] ?? 0,
  }));

  const quickItems: CatalogSidebarItem[] = [
    {
      id: 'favorites',
      label: isEs ? 'Favoritos' : 'Favorites',
      count: favoriteCount,
      icon: 'star',
    },
    {
      id: 'recent',
      label: isEs ? 'Recientes' : 'Recent',
      count: recentCount,
      icon: 'clock',
    },
  ];

  const activeQuickId =
    quickFilter === 'favorites' ? 'favorites' : quickFilter === 'recent' ? 'recent' : '';

  const muscleActiveId =
    quickFilter === 'favorites'
      ? 'favorites'
      : quickFilter === 'recent'
        ? 'recent'
        : muscleGroup === 'all'
          ? 'all'
          : muscleGroup;

  const muscleItems: CatalogSidebarItem[] = [
    { id: 'all', label: isEs ? 'Todos' : 'All', count: refineCounts.all ?? 0 },
    ...MUSCLE_CHIP_ORDER.map((code) => ({
      id: code,
      label: isEs ? MUSCLE_LABELS[code].es : MUSCLE_LABELS[code].en,
      count: refineCounts[code],
    })),
  ];

  const familyActiveId =
    family === 'all'
      ? 'all'
      : isCustomFamilyFilter(family)
        ? 'accessory'
        : family;

  const familyItems: CatalogSidebarItem[] = [
    { id: 'all', label: isEs ? 'Todos' : 'All', count: refineCounts.all ?? 0 },
    ...FAMILY_CHIP_ORDER.map((code) => ({
      id: code,
      label: FAMILY_DISPLAY_LABEL[code],
      count: refineCounts[code] ?? 0,
    })),
  ];

  const folderId = isCustomFamilyFilter(family) ? parseCustomFamilyFilterKey(family) : null;
  const folderActiveId =
    folderId != null
      ? customFamilyFilterKey(folderId)
      : accessorySubFilter === 'unfiled'
        ? 'unfiled'
        : 'all-folders';

  const folderItems: CatalogSidebarItem[] = [];
  if (showFamilyRefine && (family === 'accessory' || isCustomFamilyFilter(family) || accessorySubFilter === 'unfiled')) {
    folderItems.push({
      id: 'all-folders',
      label: isEs ? 'Todas las carpetas' : 'All folders',
      count: unfiledCount + Object.values(folderCounts).reduce((sum, count) => sum + count, 0),
      icon: 'folder',
      indent: true,
    });
    if (unfiledCount > 0) {
      folderItems.push({
        id: 'unfiled',
        label: isEs ? 'Sin carpeta' : 'No folder',
        count: unfiledCount,
        icon: 'folder',
        indent: true,
      });
    }
    for (const entry of customFamilies) {
      const id = customFamilyFilterKey(entry.id);
      const count = folderCounts[id] ?? 0;
      if (count <= 0) continue;
      folderItems.push({
        id,
        label: familyLabel(entry, isEs),
        count,
        icon: 'folder',
        swatchColor: entry.color?.trim() || '#d6d3d1',
        indent: true,
      });
    }
  }

  const refineTitle = (() => {
    if (showGrupoRefine) return isEs ? 'Grupos' : 'Groups';
    if (showMuscleRefine) return isEs ? 'Músculo' : 'Muscle';
    if (showFamilyRefine) return isEs ? 'Familia' : 'Family';
    return '';
  })();

  return (
    <nav className="wl-exercise-catalog-sidebar" aria-label={isEs ? 'Explorar catálogo' : 'Browse catalog'}>
      <div className="wl-exercise-catalog-sidebar__head">
        <Library size={16} strokeWidth={2.25} aria-hidden />
        <span>{isEs ? 'Biblioteca' : 'Library'}</span>
      </div>

      <WlExerciseCatalogSidebarList
        ariaLabel={isEs ? 'Accesos rápidos' : 'Quick access'}
        items={quickItems}
        activeId={activeQuickId}
        onChange={(id) => {
          if (id === 'favorites') {
            onQuickFilterChange('favorites');
            onMuscleGroupChange('all');
            return;
          }
          if (id === 'recent') {
            onQuickFilterChange('recent');
            onMuscleGroupChange('all');
          }
        }}
      />

      <p className="wl-exercise-catalog-sidebar__kicker">{isEs ? 'Secciones' : 'Sections'}</p>
      <WlExerciseCatalogSidebarList
        ariaLabel={isEs ? 'Secciones del catálogo' : 'Catalog sections'}
        items={sectionItems}
        activeId={section}
        onChange={(id) => onSectionChange(id as CatalogSectionFilter)}
      />

      {showRefinePanel ? (
        <div className="wl-exercise-catalog-sidebar__refine">
          <p className="wl-exercise-catalog-sidebar__kicker">{refineTitle}</p>

          {showMuscleRefine ? (
            <WlExerciseCatalogSidebarList
              nested
              ariaLabel={isEs ? 'Grupo muscular' : 'Muscle group'}
              items={muscleItems}
              activeId={muscleActiveId}
              onChange={(id) => {
                if (id === 'all') {
                  onQuickFilterChange('none');
                  onMuscleGroupChange('all');
                  return;
                }
                onQuickFilterChange('none');
                onMuscleGroupChange(id as MuscleGroupFilter);
              }}
            />
          ) : null}

          {showGrupoRefine ? (
            <WlExerciseGrupoChips
              isEs={isEs}
              catalogGrupo={catalogGrupo}
              counts={catalogGrupoCounts}
              onChange={onCatalogGrupoChange}
              sidebar
            />
          ) : null}

          {showFamilyRefine ? (
            <>
              <WlExerciseCatalogSidebarList
                nested
                ariaLabel={isEs ? 'Familias' : 'Families'}
                items={familyItems}
                activeId={familyActiveId}
                onChange={(id) => {
                  onQuickFilterChange('none');
                  if (id === 'all') {
                    onFamilyChange('all');
                    return;
                  }
                  if (isExerciseFamilyFilter(id)) onFamilyChange(id);
                }}
              />
              {folderItems.length > 0 ? (
                <>
                  <p className="wl-exercise-catalog-sidebar__kicker wl-exercise-catalog-sidebar__kicker--nested">
                    {isEs ? 'Carpetas' : 'Folders'}
                  </p>
                  <WlExerciseCatalogSidebarList
                    nested
                    ariaLabel={isEs ? 'Carpetas de accesorios' : 'Accessory folders'}
                    items={folderItems}
                    activeId={folderActiveId}
                    onChange={(id) => {
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
                    }}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}

/** Título corto para la sección activa (toolbar, empty states). */
export function catalogSectionRefineKind(section: CatalogSectionFilter): 'muscle' | 'family' | 'grupo' | null {
  if (section === 'all') return null;
  if (section === 'weightlifting') return 'grupo';
  return catalogSectionUsesMuscles(section) ? 'muscle' : 'family';
}
