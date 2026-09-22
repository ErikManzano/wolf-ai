/** Hub de ejercicios: biblioteca, detalle y modal no conviven. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ExerciseDefinitionInput,
  MergedDefinitionView,
  OverridePatch,
} from '../../models/exercise';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ConfirmationModal from '../ConfirmationModal';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import { useCoachExerciseFamilies } from '../../hooks/useCoachExerciseFamilies';
import { customFamilyIdFromTags, customFamilyTag, stripCustomFamilyTags } from '../../models/exercise/coachFamily';
import { familyLabel } from '../../services/exercise/coachFamilyStore';
import { ExerciseBulkBar } from './ExerciseBulkBar';
import { ExerciseLibraryManageModal, type LibraryModalFocus } from './ExerciseLibraryManageModal';
import { ExerciseListPager } from './ExerciseListPager';
import { ExerciseListTable } from './ExerciseListTable';
import { ExerciseSkeletonGrid } from './ExerciseSkeletonGrid';
import { WlExerciseCard } from './WlExerciseCard';
import { WlExerciseDetail } from './WlExerciseDetail';
import { WlExerciseAccessoryFolderChips } from './WlExerciseAccessoryFolderChips';
import { WlExerciseFamilyChips } from './WlExerciseFamilyChips';
import { WlExerciseMuscleChips } from './WlExerciseMuscleChips';
import { WlExerciseFormModal, type ExerciseFormMode } from './WlExerciseFormModal';
import { WlExercisesToolbar } from './WlExercisesToolbar';
import {
  DISCIPLINE_OPTIONS,
  accessoryFolderCounts,
  buildExerciseListNodes,
  countExerciseUsage,
  EXERCISES_PAGE_SIZE,
  EXERCISES_PAGE_SIZE_MOBILE,
  familyCounts,
  initialExercisePageSize,
  filterExerciseDefinitions,
  hasExerciseDefinitionChanged,
  loadScaleForDefinition,
  muscleGroupCounts,
  sortExerciseDefinitionsByState,
  sortIdToSortState,
  sortStateToSortId,
  taxonomyLabel,
  toggleColumnSort,
  toExerciseListItem,
  usageCountsByDefinition,
  usesMuscleGroupChips,
  type ExerciseDisciplineFilter,
  type ExerciseFamilyFilter,
  type ExerciseOriginFilter,
  type ExerciseSortId,
  type MuscleGroupFilter,
} from './exerciseListUtils';
import {
  readExerciseFavorites,
  readExerciseGroupByFamily,
  readExerciseRecents,
  readExerciseViewMode,
  recordExerciseRecent,
  writeExerciseFavorites,
  writeExerciseViewMode,
} from './exerciseLibraryPrefs';
import type {
  ExerciseListSortState,
  ExerciseQuickFilter,
  ExerciseSortColumn,
  ExerciseViewMode,
} from './types';
import '../wl-shared/app-breadcrumb.css';
import '../wl-shared/wl-list-toolbar.css';
import './wl-exercises.css';

type HubView = 'library' | 'detail';
type ConfirmAction = 'archive' | 'delete';
type BulkConfirmAction = 'archive' | 'delete' | 'favorite';

interface WlExercisesHubProps {
  language: 'ES' | 'EN';
}

const WlExercisesHub: React.FC<WlExercisesHubProps> = ({ language }) => {
  const isEs = language === 'ES';
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { pushAlert } = useWolfAlert();
  const {
    registryBrowse,
    exerciseTaxonomy,
    coachPrograms,
    refreshExerciseCatalog,
    createExerciseDefinition,
    updateExerciseDefinition,
    forkExerciseDefinition,
    deleteExerciseDefinition,
    upsertCoachOverride,
    motorExercises,
    motorExerciseDefinitions,
    coachExerciseOverrides,
    importExerciseLibrary,
    currentUserId,
  } = useWolfAssign();
  const { families: customFamilies, saveFamily, removeFamily } = useCoachExerciseFamilies(currentUserId);

  const [view, setView] = useState<HubView>('library');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState<ExerciseFamilyFilter>('all');
  const [accessorySubFilter, setAccessorySubFilter] = useState<'all' | 'unfiled'>('all');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroupFilter>('all');
  const [discipline, setDiscipline] = useState<ExerciseDisciplineFilter>('all');
  const [origin, setOrigin] = useState<ExerciseOriginFilter>('all');
  const [columnSort, setColumnSort] = useState<ExerciseListSortState>(() => sortIdToSortState('name_asc'));
  const minUsage = 0;
  const [quickFilter, setQuickFilter] = useState<ExerciseQuickFilter>('none');
  const [viewMode, setViewMode] = useState<ExerciseViewMode>(() => readExerciseViewMode());
  const [groupByFamily] = useState(() => readExerciseGroupByFamily());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [visibleLimit, setVisibleLimit] = useState(initialExercisePageSize);
  const pageSize = isMobile ? EXERCISES_PAGE_SIZE_MOBILE : EXERCISES_PAGE_SIZE;
  const lastSelectedIdRef = useRef<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readExerciseFavorites());
  const [recentIds, setRecentIds] = useState<string[]>(() => readExerciseRecents());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formMode, setFormMode] = useState<ExerciseFormMode | null>(null);
  const [formSeed, setFormSeed] = useState<MergedDefinitionView | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ action: ConfirmAction; def: MergedDefinitionView } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryFocus, setLibraryFocus] = useState<LibraryModalFocus>('families');
  const [libraryStartFamilyForm, setLibraryStartFamilyForm] = useState(false);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [detailInitialTab, setDetailInitialTab] = useState<'intel' | 'personalize'>('intel');

  const openLibrary = useCallback(
    (focus: LibraryModalFocus = 'families', opts?: { startFamilyForm?: boolean }) => {
      setLibraryFocus(focus);
      setLibraryStartFamilyForm(opts?.startFamilyForm ?? false);
      setLibraryOpen(true);
    },
    [],
  );
  const familyLabelForDef = useCallback(
    (def: MergedDefinitionView) => {
      const customId = customFamilyIdFromTags(def.tags);
      if (customId) {
        const match = customFamilies.find((family) => family.id === customId);
        if (match) return familyLabel(match, isEs);
      }
      const code = def.family ?? 'accessory';
      return taxonomyLabel(exerciseTaxonomy.families, code, isEs) || code;
    },
    [customFamilies, exerciseTaxonomy.families, isEs],
  );

  const browse = useMemo(
    () => registryBrowse({ includeDeprecated: true }),
    [registryBrowse],
  );

  const muscleChipMode = usesMuscleGroupChips(discipline);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const recentSet = useMemo(() => new Set(recentIds), [recentIds]);

  const usageById = useMemo(
    () => usageCountsByDefinition(coachPrograms, browse.definitions),
    [coachPrograms, browse.definitions],
  );

  const scoped = useMemo(
    () =>
      filterExerciseDefinitions(browse.definitions, {
        search,
        family: 'all',
        muscleGroup: muscleChipMode ? 'all' : undefined,
        origin,
        discipline,
      }),
    [browse.definitions, search, origin, discipline, muscleChipMode],
  );

  const visibleDefs = useMemo(() => {
    const filtered = filterExerciseDefinitions(browse.definitions, {
      search,
      family: muscleChipMode ? 'all' : family,
      muscleGroup: muscleChipMode ? muscleGroup : undefined,
      origin,
      discipline,
      minUsage,
      usageById,
      quickFilter,
      favoriteIds: favoriteSet,
      recentIds: recentSet,
      accessorySubFilter: muscleChipMode ? undefined : accessorySubFilter,
    });
    const effectiveSort: ExerciseListSortState =
      quickFilter === 'recent' ? { column: 'recent', direction: 'desc' } : columnSort;
    return sortExerciseDefinitionsByState(filtered, effectiveSort, {
      usageById,
      recentOrder: recentIds,
    });
  }, [
    browse.definitions,
    search,
    family,
    muscleGroup,
    origin,
    discipline,
    columnSort,
    minUsage,
    usageById,
    quickFilter,
    favoriteSet,
    recentSet,
    recentIds,
    muscleChipMode,
    accessorySubFilter,
  ]);

  const accessoryFolderStats = useMemo(() => accessoryFolderCounts(scoped), [scoped]);

  const displayedDefs = useMemo(
    () => visibleDefs.slice(0, visibleLimit),
    [visibleDefs, visibleLimit],
  );

  const sort = useMemo(() => sortStateToSortId(columnSort), [columnSort]);

  const counts = useMemo(
    () => (muscleChipMode ? muscleGroupCounts(scoped) : familyCounts(scoped)),
    [scoped, muscleChipMode],
  );
  const favoriteCount = useMemo(
    () => scoped.filter((def) => favoriteSet.has(def.id)).length,
    [scoped, favoriteSet],
  );
  const recentCount = useMemo(
    () => scoped.filter((def) => recentSet.has(def.id)).length,
    [scoped, recentSet],
  );
  const listItems = useMemo(
    () =>
      displayedDefs.map((def) =>
        toExerciseListItem(def, {
          isEs,
          typeLabel: taxonomyLabel(exerciseTaxonomy.objectives, def.objective, isEs),
          usageCount: usageById.get(def.id) ?? 0,
          isFavorite: favoriteSet.has(def.id),
          loadScale: loadScaleForDefinition(motorExercises, def),
          familyLabel: familyLabelForDef(def),
        }),
      ),
    [displayedDefs, isEs, exerciseTaxonomy.objectives, usageById, favoriteSet, motorExercises, familyLabelForDef],
  );

  const effectiveGroupByFamily = groupByFamily && !muscleChipMode && family === 'all';
  const listNodes = useMemo(
    () => buildExerciseListNodes(listItems, effectiveGroupByFamily, family),
    [listItems, effectiveGroupByFamily, family],
  );
  const visibleRowIds = useMemo(
    () => listNodes.filter((node) => node.kind === 'row').map((node) => node.item.id),
    [listNodes],
  );
  const defById = useMemo(() => new Map(displayedDefs.map((def) => [def.id, def])), [displayedDefs]);
  const selected = selectedId ? browse.definitions.find((def) => def.id === selectedId) ?? null : null;
  const usageCount = selected ? countExerciseUsage(coachPrograms, selected) : 0;
  const disciplineMeta = DISCIPLINE_OPTIONS.find((option) => option.id === discipline);
  const catalogEmpty = Boolean(disciplineMeta && !disciplineMeta.hasCatalog);

  useEffect(() => {
    setFamily('all');
    setMuscleGroup('all');
    setQuickFilter('none');
    setAccessorySubFilter('all');
  }, [discipline]);

  const handleFamilyChange = (nextFamily: ExerciseFamilyFilter) => {
    setFamily(nextFamily);
    if (nextFamily !== 'accessory' && !String(nextFamily).startsWith('folder:')) {
      setAccessorySubFilter('all');
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
    setVisibleLimit(pageSize);
  }, [search, family, muscleGroup, origin, discipline, minUsage, quickFilter, viewMode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
        lastSelectedIdRef.current = null;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds.size]);

  const handleViewModeChange = (mode: ExerciseViewMode) => {
    setViewMode(mode);
    writeExerciseViewMode(mode);
  };

  const handleSortChange = (nextSort: ExerciseSortId) => {
    setColumnSort(sortIdToSortState(nextSort));
  };

  const handleSortColumn = (column: ExerciseSortColumn) => {
    setColumnSort((current) => toggleColumnSort(current, column));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    lastSelectedIdRef.current = id;
  };

  const handleShiftSelect = (id: string) => {
    const anchor = lastSelectedIdRef.current;
    if (!anchor) {
      handleToggleSelect(id);
      return;
    }
    const start = visibleRowIds.indexOf(anchor);
    const end = visibleRowIds.indexOf(id);
    if (start === -1 || end === -1) {
      handleToggleSelect(id);
      return;
    }
    const [from, to] = start < end ? [start, end] : [end, start];
    const range = visibleRowIds.slice(from, to + 1);
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const rowId of range) next.add(rowId);
      return next;
    });
    lastSelectedIdRef.current = id;
  };

  const handleToggleAll = () => {
    const allSelected =
      visibleRowIds.length > 0 && visibleRowIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
      lastSelectedIdRef.current = null;
      return;
    }
    setSelectedIds(new Set(visibleRowIds));
    lastSelectedIdRef.current = visibleRowIds[visibleRowIds.length - 1] ?? null;
  };

  const openDetail = useCallback((def: MergedDefinitionView, opts?: { initialTab?: 'intel' | 'personalize' }) => {
    setSelectedId(def.id);
    setView('detail');
    setDetailInitialTab(opts?.initialTab ?? 'intel');
    setRecentIds((current) => recordExerciseRecent(def.id, current));
    const url = new URL(window.location.href);
    url.searchParams.set('definitionId', def.legacyExerciseId ?? def.id);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const closeDetail = useCallback(() => {
    setView('library');
    setSelectedId(null);
    setDetailInitialTab('intel');
    const url = new URL(window.location.href);
    url.searchParams.delete('definitionId');
    window.history.replaceState({}, '', url.toString());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const defId = params.get('definitionId');
    if (!defId || browse.definitions.length === 0) return;
    const match =
      browse.definitions.find((def) => def.id === defId) ??
      browse.definitions.find((def) => def.legacyExerciseId === defId);
    if (match) {
      setSelectedId(match.id);
      setView('detail');
    }
  }, [browse.definitions]);

  const mobileTopBar = useMemo(
    () =>
      isMobile && view === 'detail' && selected
        ? {
            title: selected.effectiveDisplayName,
            back: {
              label: isEs ? 'Volver a Ejercicios' : 'Back to Exercises',
              onBack: closeDetail,
            },
          }
        : null,
    [isMobile, view, selected, isEs, closeDetail],
  );
  useMobileTopBar(mobileTopBar);

  const openCreate = () => {
    setFormSeed(null);
    setFormMode('create');
  };

  const openForm = (mode: ExerciseFormMode, def: MergedDefinitionView) => {
    setFormSeed(def);
    setFormMode(mode);
  };

  const closeForm = () => {
    setFormMode(null);
    setFormSeed(null);
  };

  const handleSaveForm = async (
    input: ExerciseDefinitionInput,
    opts: { folderId: string | null },
  ) => {
    if (!formMode) return;
    setFormBusy(true);
    let err: string | null = null;
    const folderId = opts.folderId;
    const defInput: ExerciseDefinitionInput = {
      ...input,
      tags: stripCustomFamilyTags(input.tags),
    };
    const withFolderTags = (payload: ExerciseDefinitionInput): ExerciseDefinitionInput =>
      folderId
        ? { ...payload, tags: [...stripCustomFamilyTags(payload.tags), customFamilyTag(folderId)] }
        : payload;

    if (formMode === 'edit' && formSeed?.coachId) {
      if (hasExerciseDefinitionChanged(formSeed, defInput)) {
        err = await updateExerciseDefinition(formSeed.id, defInput);
      }
      if (!err) err = await upsertCoachOverride(formSeed.id, { customFamilyId: folderId });
    } else if (formMode === 'fork' && formSeed) {
      if (!formSeed.coachId) {
        if (hasExerciseDefinitionChanged(formSeed, defInput)) {
          err = await forkExerciseDefinition(formSeed.id, withFolderTags(defInput));
        } else {
          err = await upsertCoachOverride(formSeed.id, { customFamilyId: folderId });
        }
      } else if (hasExerciseDefinitionChanged(formSeed, defInput)) {
        err = await forkExerciseDefinition(formSeed.id, withFolderTags(defInput));
      } else {
        err = await upsertCoachOverride(formSeed.id, { customFamilyId: folderId });
      }
    } else {
      err = await createExerciseDefinition(withFolderTags(defInput));
    }
    setFormBusy(false);
    if (err) {
      pushAlert({ tone: 'error', message: err });
      return;
    }
    pushAlert({
      tone: 'success',
      message: isEs ? 'Ejercicio guardado' : 'Exercise saved',
    });
    closeForm();
  };

  const handleSaveOverride = async (baseId: string, patch: OverridePatch) => {
    const err = await upsertCoachOverride(baseId, patch);
    if (err) {
      pushAlert({ tone: 'error', message: err });
      return err;
    }
    pushAlert({
      tone: 'success',
      message: isEs ? 'Personalización guardada' : 'Personalization saved',
    });
    await refreshExerciseCatalog();
    if (patch.hidden) closeDetail();
    return null;
  };

  const handleConfirm = async () => {
    if (!confirm || confirmBusy) return;
    const { action, def } = confirm;
    const used = countExerciseUsage(coachPrograms, def);
    setConfirm(null);
    setConfirmBusy(true);
    try {
      if (action === 'archive') {
        if (!def.coachId) {
          const err = await upsertCoachOverride(def.id, {
            ...(def.coachOverride?.override ?? {}),
            hidden: true,
          });
          if (err) {
            pushAlert({ tone: 'error', message: err });
            return;
          }
          pushAlert({ tone: 'success', message: isEs ? 'Ejercicio archivado' : 'Exercise archived' });
          if (selectedId === def.id) closeDetail();
          await refreshExerciseCatalog();
          return;
        }
        if (used > 0) {
          pushAlert({
            tone: 'warning',
            message: isEs
              ? `En uso en ${used} programas. No se puede archivar todavía.`
              : `Used in ${used} programs. Cannot archive yet.`,
          });
          return;
        }
        const err = await deleteExerciseDefinition(def.id);
        if (err) {
          pushAlert({ tone: 'error', message: err });
          return;
        }
        pushAlert({ tone: 'success', message: isEs ? 'Ejercicio archivado' : 'Exercise archived' });
        if (selectedId === def.id) closeDetail();
        await refreshExerciseCatalog();
        return;
      }

      if (!def.coachId) {
        pushAlert({
          tone: 'info',
          message: isEs ? 'Los oficiales no se eliminan. Archívalos de tu biblioteca.' : 'Officials cannot be deleted. Archive them from your library.',
        });
        return;
      }
      if (used > 0) {
        pushAlert({
          tone: 'warning',
          message: isEs
            ? `En uso en ${used} programas. Se archivó en lugar de eliminar.`
            : `Used in ${used} programs. Archived instead of deleting.`,
        });
        return;
      }
      const err = await deleteExerciseDefinition(def.id);
      if (err) {
        pushAlert({ tone: 'error', message: err });
        return;
      }
      pushAlert({ tone: 'success', message: isEs ? 'Ejercicio eliminado' : 'Exercise deleted' });
      if (selectedId === def.id) closeDetail();
      await refreshExerciseCatalog();
    } finally {
      setConfirmBusy(false);
    }
  };

  const selectedDefs = useMemo(
    () => browse.definitions.filter((def) => selectedIds.has(def.id)),
    [browse.definitions, selectedIds],
  );

  const runBulkFavorite = () => {
    let added = 0;
    setFavoriteIds((current) => {
      const next = [...current];
      for (const def of selectedDefs) {
        if (!next.includes(def.id)) {
          next.unshift(def.id);
          added += 1;
        }
      }
      writeExerciseFavorites(next);
      return next;
    });
    pushAlert({
      tone: 'success',
      message: isEs
        ? `${added} añadidos a favoritos`
        : `${added} added to favorites`,
    });
    setSelectedIds(new Set());
  };

  const runBulkArchive = async () => {
    setConfirmBusy(true);
    let archived = 0;
    let skipped = 0;
    try {
      for (const def of selectedDefs) {
        const used = countExerciseUsage(coachPrograms, def);
        if (!def.coachId) {
          const err = await upsertCoachOverride(def.id, {
            ...(def.coachOverride?.override ?? {}),
            hidden: true,
          });
          if (err) skipped += 1;
          else archived += 1;
          continue;
        }
        if (used > 0) {
          skipped += 1;
          continue;
        }
        const err = await deleteExerciseDefinition(def.id);
        if (err) skipped += 1;
        else archived += 1;
      }
      await refreshExerciseCatalog();
      pushAlert({
        tone: archived > 0 ? 'success' : 'warning',
        message: isEs
          ? `${archived} archivados${skipped ? `, ${skipped} omitidos` : ''}`
          : `${archived} archived${skipped ? `, ${skipped} skipped` : ''}`,
      });
      setSelectedIds(new Set());
    } finally {
      setConfirmBusy(false);
      setBulkConfirm(null);
    }
  };

  const runBulkDelete = async () => {
    setConfirmBusy(true);
    let deleted = 0;
    let skipped = 0;
    try {
      for (const def of selectedDefs) {
        if (!def.coachId) {
          skipped += 1;
          continue;
        }
        const used = countExerciseUsage(coachPrograms, def);
        if (used > 0) {
          skipped += 1;
          continue;
        }
        const err = await deleteExerciseDefinition(def.id);
        if (err) skipped += 1;
        else deleted += 1;
      }
      await refreshExerciseCatalog();
      pushAlert({
        tone: deleted > 0 ? 'success' : 'warning',
        message: isEs
          ? `${deleted} eliminados${skipped ? `, ${skipped} omitidos` : ''}`
          : `${deleted} deleted${skipped ? `, ${skipped} skipped` : ''}`,
      });
      setSelectedIds(new Set());
    } finally {
      setConfirmBusy(false);
      setBulkConfirm(null);
    }
  };

  const handleBulkConfirm = () => {
    if (!bulkConfirm || confirmBusy) return;
    if (bulkConfirm === 'favorite') {
      setBulkConfirm(null);
      void runBulkFavorite();
      return;
    }
    if (bulkConfirm === 'archive') {
      void runBulkArchive();
      return;
    }
    void runBulkDelete();
  };

  const bindItem = (def: MergedDefinitionView) => ({
    def,
    isEs,
    onOpen: () => openDetail(def),
    onEdit: () => openForm('edit', def),
    onPersonalize: () => openDetail(def, { initialTab: 'personalize' }),
    onDuplicate: () => openForm('duplicate', def),
    onArchive: () => setConfirm({ action: 'archive' as const, def }),
    onDelete: () => {
      const used = usageById.get(def.id) ?? 0;
      setConfirm({ action: used > 0 ? 'archive' : 'delete', def });
    },
  });

  const formModal =
    formMode != null ? (
      <WlExerciseFormModal
        isEs={isEs}
        mode={formMode}
        taxonomy={exerciseTaxonomy}
        initial={formSeed}
        busy={formBusy}
        onClose={closeForm}
        onSave={handleSaveForm}
        onManageFamilies={() =>
          openLibrary('families', { startFamilyForm: customFamilies.length === 0 })
        }
      />
    ) : null;

  const libraryModal = libraryOpen ? (
    <ExerciseLibraryManageModal
      isEs={isEs}
      coachId={currentUserId}
      definitions={motorExerciseDefinitions}
      overrides={coachExerciseOverrides}
      customFamilies={customFamilies}
      busy={libraryBusy}
      initialFocus={libraryFocus}
      initialStartFamilyForm={libraryStartFamilyForm}
      onClose={() => {
        setLibraryOpen(false);
        setLibraryStartFamilyForm(false);
      }}
      onSaveFamily={async (input) => {
        setLibraryBusy(true);
        try {
          saveFamily(input);
          pushAlert({ tone: 'success', message: isEs ? 'Familia guardada' : 'Family saved' });
        } finally {
          setLibraryBusy(false);
        }
      }}
      onDeleteFamily={async (id) => {
        setLibraryBusy(true);
        try {
          removeFamily(id);
          pushAlert({ tone: 'success', message: isEs ? 'Familia eliminada' : 'Family deleted' });
        } finally {
          setLibraryBusy(false);
        }
      }}
      onImport={async (result) => {
        setLibraryBusy(true);
        try {
          importExerciseLibrary(result);
          pushAlert({
            tone: 'success',
            message: isEs
              ? `Importado: ${result.applied.definitionsAdded + result.applied.definitionsUpdated} ejercicios.`
              : `Imported: ${result.applied.definitionsAdded + result.applied.definitionsUpdated} exercises.`,
          });
        } finally {
          setLibraryBusy(false);
        }
      }}
    />
  ) : null;

  const bulkConfirmModal = (
    <ConfirmationModal
      open={bulkConfirm != null && bulkConfirm !== 'favorite'}
      title={
        bulkConfirm === 'delete'
          ? isEs
            ? 'Eliminar ejercicios'
            : 'Delete exercises'
          : isEs
            ? 'Archivar ejercicios'
            : 'Archive exercises'
      }
      message={
        bulkConfirm
          ? bulkConfirm === 'delete'
            ? isEs
              ? `¿Eliminar ${selectedIds.size} ejercicios seleccionados?`
              : `Delete ${selectedIds.size} selected exercises?`
            : isEs
              ? `¿Archivar ${selectedIds.size} ejercicios de tu biblioteca?`
              : `Archive ${selectedIds.size} exercises from your library?`
          : ''
      }
      confirmLabel={
        bulkConfirm === 'delete' ? (isEs ? 'Eliminar' : 'Delete') : isEs ? 'Archivar' : 'Archive'
      }
      cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
      danger={bulkConfirm === 'delete'}
      onCancel={() => {
        if (!confirmBusy) setBulkConfirm(null);
      }}
      onConfirm={() => handleBulkConfirm()}
    />
  );

  const confirmModal = (
    <ConfirmationModal
      open={confirm != null}
      title={
        confirm?.action === 'delete'
          ? isEs
            ? 'Eliminar ejercicio'
            : 'Delete exercise'
          : isEs
            ? 'Archivar ejercicio'
            : 'Archive exercise'
      }
      message={
        confirm
          ? confirm.action === 'delete'
            ? isEs
              ? `¿Eliminar «${confirm.def.effectiveDisplayName}»? Esta acción no se puede deshacer.`
              : `Delete "${confirm.def.effectiveDisplayName}"? This cannot be undone.`
            : isEs
              ? `¿Archivar «${confirm.def.effectiveDisplayName}» de tu biblioteca?`
              : `Archive "${confirm.def.effectiveDisplayName}" from your library?`
          : ''
      }
      confirmLabel={
        confirm?.action === 'delete' ? (isEs ? 'Eliminar' : 'Delete') : isEs ? 'Archivar' : 'Archive'
      }
      cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
      danger={confirm?.action === 'delete'}
      onCancel={() => {
        if (!confirmBusy) setConfirm(null);
      }}
      onConfirm={() => void handleConfirm()}
    />
  );

  if (view === 'detail' && selected) {
    return (
      <>
        <WlExerciseDetail
          def={selected}
          isEs={isEs}
          taxonomy={exerciseTaxonomy}
          usageCount={usageCount}
          initialTab={detailInitialTab}
          onBack={closeDetail}
          onEdit={selected.coachId ? () => openForm('edit', selected) : undefined}
          onDuplicate={() => openForm('duplicate', selected)}
          onArchive={() => setConfirm({ action: 'archive', def: selected })}
          onDelete={() => {
            const used = usageById.get(selected.id) ?? 0;
            setConfirm({ action: used > 0 ? 'archive' : 'delete', def: selected });
          }}
          onSaveOverride={handleSaveOverride}
        />
        {formModal}
        {libraryModal}
        {confirmModal}
        {bulkConfirmModal}
      </>
    );
  }

  return (
    <>
      <div className="wl-exercises-hub wl-list-toolbar-scope">
        <header className="wl-exercises-head">
          <div>
            <AppBreadcrumb isEs={isEs} items={[{ label: isEs ? 'Ejercicios' : 'Exercises' }]} />
            <p className="wl-exercises-head__desc">
              {isEs
                ? 'Gestiona tu biblioteca de movimientos y personaliza el catálogo.'
                : 'Manage your movement library and customize the catalog.'}
            </p>
          </div>
        </header>

        <WlExercisesToolbar
          isEs={isEs}
          search={search}
          onSearchChange={setSearch}
          discipline={discipline}
          onDisciplineChange={setDiscipline}
          origin={origin}
          onOriginChange={setOrigin}
          sort={sort}
          onSortChange={handleSortChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          onCreate={openCreate}
        />

        {muscleChipMode ? (
          <WlExerciseMuscleChips
            isEs={isEs}
            muscleGroup={muscleGroup}
            quickFilter={quickFilter}
            counts={counts}
            favoriteCount={favoriteCount}
            recentCount={recentCount}
            onChange={setMuscleGroup}
            onQuickFilterChange={setQuickFilter}
          />
        ) : (
          <>
            <WlExerciseFamilyChips
              isEs={isEs}
              family={family}
              quickFilter={quickFilter}
              counts={counts}
              onFamilyChange={handleFamilyChange}
              onQuickFilterChange={setQuickFilter}
            />
            <WlExerciseAccessoryFolderChips
              isEs={isEs}
              family={family}
              accessorySubFilter={accessorySubFilter}
              unfiledCount={accessoryFolderStats.unfiled}
              folderCounts={accessoryFolderStats.folders}
              customFamilies={customFamilies}
              onFamilyChange={handleFamilyChange}
              onAccessorySubFilterChange={setAccessorySubFilter}
            />
          </>
        )}

        {browse.definitions.length === 0 && !catalogEmpty ? (
          <ExerciseSkeletonGrid isEs={isEs} viewMode={viewMode} />
        ) : catalogEmpty ? (
          <div className="wl-exercises-empty">
            <p className="wl-exercises-empty__title">
              {isEs
                ? `Aún no hay ejercicios de ${disciplineMeta?.labelEs ?? 'esta disciplina'}.`
                : `No exercises yet for ${disciplineMeta?.labelEn ?? 'this discipline'}.`}
            </p>
            <p>{isEs ? 'Crea uno en Halterofilia o Accesorios, o espera el catálogo.' : 'Create one in Weightlifting or Accessories, or wait for the catalog.'}</p>
          </div>
        ) : visibleDefs.length === 0 ? (
          <div className="wl-exercises-empty">
            <p className="wl-exercises-empty__title">
              {quickFilter === 'favorites'
                ? isEs
                  ? 'Sin ejercicios favoritos.'
                  : 'No favorite exercises.'
                : quickFilter === 'recent'
                  ? isEs
                    ? 'Sin ejercicios recientes.'
                    : 'No recent exercises.'
                  : family !== 'all' && !search && origin === 'all' && minUsage === 0
                    ? isEs
                      ? 'Sin ejercicios en esta familia.'
                      : 'No exercises in this family.'
                    : isEs
                      ? 'No se encontraron ejercicios. Prueba otro filtro o crea uno nuevo.'
                      : 'No exercises found. Try another filter or create a new one.'}
            </p>
            {quickFilter === 'none' ? (
              <button type="button" className="btn-primary wl-list-toolbar__cta" onClick={openCreate}>
                {isEs ? 'Nuevo ejercicio' : 'New exercise'}
              </button>
            ) : null}
          </div>
        ) : viewMode === 'list' ? (
          <>
            <ExerciseListTable
              isEs={isEs}
              isMobile={isMobile}
              nodes={listNodes}
              sort={quickFilter === 'recent' ? { column: 'recent', direction: 'desc' } : columnSort}
              defById={defById}
              selectedIds={selectedIds}
              visibleRowIds={visibleRowIds}
              onSortColumn={handleSortColumn}
              onToggleAll={handleToggleAll}
              onToggleSelect={handleToggleSelect}
              onShiftSelect={handleShiftSelect}
              bindItem={bindItem}
              bulkBusy={confirmBusy}
              onBulkFavorite={() => {
                if (selectedIds.size === 0) return;
                void runBulkFavorite();
              }}
              onBulkArchive={() => {
                if (selectedIds.size === 0) return;
                setBulkConfirm('archive');
              }}
              onBulkDelete={() => {
                if (selectedIds.size === 0) return;
                setBulkConfirm('delete');
              }}
              onBulkClear={() => {
                setSelectedIds(new Set());
                lastSelectedIdRef.current = null;
              }}
            />
            <ExerciseListPager
              isEs={isEs}
              isMobile={isMobile}
              shown={displayedDefs.length}
              total={visibleDefs.length}
              pageSize={pageSize}
              dockHidden={selectedIds.size > 0}
              onShowMore={() => setVisibleLimit((current) => current + pageSize)}
            />
          </>
        ) : (
          <>
            {selectedIds.size > 0 ? (
              <div className="wl-exercise-table-bulk-slot wl-exercise-table-bulk-slot--grid">
                <ExerciseBulkBar
                  isEs={isEs}
                  count={selectedIds.size}
                  busy={confirmBusy}
                  onFavorite={() => {
                    if (selectedIds.size === 0) return;
                    void runBulkFavorite();
                  }}
                  onArchive={() => {
                    if (selectedIds.size === 0) return;
                    setBulkConfirm('archive');
                  }}
                  onDelete={() => {
                    if (selectedIds.size === 0) return;
                    setBulkConfirm('delete');
                  }}
                  onClear={() => {
                    setSelectedIds(new Set());
                    lastSelectedIdRef.current = null;
                  }}
                />
              </div>
            ) : null}
            <div className="wl-exercises-grid">
              {listItems.map((item) => {
                const def = defById.get(item.id);
                if (!def) return null;
                return <WlExerciseCard key={item.id} item={item} {...bindItem(def)} />;
              })}
            </div>
            <ExerciseListPager
              isEs={isEs}
              isMobile={isMobile}
              shown={displayedDefs.length}
              total={visibleDefs.length}
              pageSize={pageSize}
              dockHidden={selectedIds.size > 0}
              onShowMore={() => setVisibleLimit((current) => current + pageSize)}
            />
          </>
        )}
      </div>
      {formModal}
      {libraryModal}
      {confirmModal}
      {bulkConfirmModal}
    </>
  );
};

export default WlExercisesHub;
