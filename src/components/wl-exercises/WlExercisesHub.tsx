/** Hub de ejercicios: biblioteca, detalle y modal no conviven. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ExerciseDefinitionInput,
  ExerciseDefinitionVersion,
  MergedDefinitionView,
  OverridePatch,
} from '../../models/exercise';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ConfirmationModal from '../ConfirmationModal';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import { WlExerciseCard } from './WlExerciseCard';
import { WlExerciseDetail } from './WlExerciseDetail';
import { WlExerciseFamilyChips } from './WlExerciseFamilyChips';
import { WlExerciseMuscleChips } from './WlExerciseMuscleChips';
import { WlExerciseFormModal, type ExerciseFormMode } from './WlExerciseFormModal';
import { WlExercisesToolbar } from './WlExercisesToolbar';
import {
  DISCIPLINE_OPTIONS,
  countExerciseUsage,
  familyCounts,
  filterExerciseDefinitions,
  muscleGroupCounts,
  sortExerciseDefinitions,
  usesMuscleGroupChips,
  type ExerciseDisciplineFilter,
  type ExerciseFamilyFilter,
  type ExerciseOriginFilter,
  type ExerciseSortId,
  type MuscleGroupFilter,
} from './exerciseListUtils';
import '../wl-shared/app-breadcrumb.css';
import '../wl-shared/wl-list-toolbar.css';
import './wl-exercises.css';

type HubView = 'library' | 'detail';
type ConfirmAction = 'archive' | 'delete';

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
    exerciseRelationships,
    coachPrograms,
    refreshExerciseCatalog,
    createExerciseDefinition,
    updateExerciseDefinition,
    forkExerciseDefinition,
    deleteExerciseDefinition,
    upsertCoachOverride,
    fetchDefinitionDetail,
  } = useWolfAssign();

  const [view, setView] = useState<HubView>('library');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState<ExerciseFamilyFilter>('all');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroupFilter>('all');
  const [discipline, setDiscipline] = useState<ExerciseDisciplineFilter>('all');
  const [origin, setOrigin] = useState<ExerciseOriginFilter>('all');
  const [sort, setSort] = useState<ExerciseSortId>('name_asc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formMode, setFormMode] = useState<ExerciseFormMode | null>(null);
  const [formSeed, setFormSeed] = useState<MergedDefinitionView | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ action: ConfirmAction; def: MergedDefinitionView } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [versions, setVersions] = useState<ExerciseDefinitionVersion[]>([]);

  const browse = useMemo(
    () => registryBrowse({ includeDeprecated: true }),
    [registryBrowse],
  );

  const muscleChipMode = usesMuscleGroupChips(discipline);

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

  const visible = useMemo(
    () =>
      sortExerciseDefinitions(
        filterExerciseDefinitions(browse.definitions, {
          search,
          family: muscleChipMode ? 'all' : family,
          muscleGroup: muscleChipMode ? muscleGroup : undefined,
          origin,
          discipline,
        }),
        sort,
      ),
    [browse.definitions, search, family, muscleGroup, origin, discipline, sort, muscleChipMode],
  );

  const counts = useMemo(
    () => (muscleChipMode ? muscleGroupCounts(scoped) : familyCounts(scoped)),
    [scoped, muscleChipMode],
  );
  const selected = selectedId ? browse.definitions.find((def) => def.id === selectedId) ?? null : null;
  const usageCount = selected ? countExerciseUsage(coachPrograms, selected) : 0;
  const disciplineMeta = DISCIPLINE_OPTIONS.find((option) => option.id === discipline);
  const catalogEmpty = Boolean(disciplineMeta && !disciplineMeta.hasCatalog);

  useEffect(() => {
    setFamily('all');
    setMuscleGroup('all');
  }, [discipline]);

  const openDetail = useCallback((def: MergedDefinitionView) => {
    setSelectedId(def.id);
    setView('detail');
    const url = new URL(window.location.href);
    url.searchParams.set('definitionId', def.legacyExerciseId ?? def.id);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const closeDetail = useCallback(() => {
    setView('library');
    setSelectedId(null);
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

  useEffect(() => {
    if (!selected?.id) {
      setVersions([]);
      return;
    }
    void fetchDefinitionDetail(selected.id).then((detail) => {
      if (detail) setVersions(detail.versions);
    });
  }, [selected?.id, fetchDefinitionDetail]);

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

  const handleSaveForm = async (input: ExerciseDefinitionInput) => {
    if (!formMode) return;
    setFormBusy(true);
    let err: string | null = null;
    if (formMode === 'edit' && formSeed?.coachId) {
      err = await updateExerciseDefinition(formSeed.id, input);
    } else if (formMode === 'fork' && formSeed) {
      err = await forkExerciseDefinition(formSeed.id, input);
    } else {
      err = await createExerciseDefinition(input);
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
    await refreshExerciseCatalog();
  };

  const handleSaveOverride = async (baseId: string, patch: OverridePatch) => {
    const err = await upsertCoachOverride(baseId, patch);
    if (err) {
      pushAlert({ tone: 'error', message: err });
      return err;
    }
    pushAlert({
      tone: 'success',
      message: isEs ? 'Override guardado' : 'Override saved',
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
      />
    ) : null;

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
          relationships={exerciseRelationships}
          versions={versions}
          usageCount={usageCount}
          onBack={closeDetail}
          onPrimary={() => openForm(selected.coachId ? 'edit' : 'fork', selected)}
          onSaveOverride={handleSaveOverride}
        />
        {formModal}
        {confirmModal}
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
                ? 'Gestiona la biblioteca, personaliza oficiales y filtra por disciplina.'
                : 'Manage the library, personalize officials, and filter by discipline.'}
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
          onSortChange={setSort}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          onCreate={openCreate}
        />

        {muscleChipMode ? (
          <WlExerciseMuscleChips
            isEs={isEs}
            muscleGroup={muscleGroup}
            counts={counts}
            onChange={setMuscleGroup}
          />
        ) : (
          <WlExerciseFamilyChips
            isEs={isEs}
            taxonomy={exerciseTaxonomy}
            family={family}
            counts={counts}
            onChange={setFamily}
          />
        )}

        {catalogEmpty ? (
          <div className="wl-exercises-empty">
            <p className="wl-exercises-empty__title">
              {isEs
                ? `Aún no hay ejercicios de ${disciplineMeta?.labelEs ?? 'esta disciplina'}.`
                : `No exercises yet for ${disciplineMeta?.labelEn ?? 'this discipline'}.`}
            </p>
            <p>{isEs ? 'Crea uno en Halterofilia o Accesorios, o espera el catálogo.' : 'Create one in Weightlifting or Accessories, or wait for the catalog.'}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="wl-exercises-empty">
            <p className="wl-exercises-empty__title">
              {isEs ? 'Sin ejercicios en este filtro.' : 'No exercises in this filter.'}
            </p>
            <p>{isEs ? 'Crea uno nuevo.' : 'Create a new one.'}</p>
            <button type="button" className="btn-primary wl-list-toolbar__cta" onClick={openCreate}>
              {isEs ? 'Nuevo ejercicio' : 'New exercise'}
            </button>
          </div>
        ) : (
          <div className="wl-exercises-grid">
            {visible.map((def) => (
              <WlExerciseCard
                key={def.id}
                def={def}
                isEs={isEs}
                taxonomy={exerciseTaxonomy}
                onOpen={() => openDetail(def)}
                onEdit={() => openForm('edit', def)}
                onPersonalize={() => openForm('fork', def)}
                onDuplicate={() => openForm('duplicate', def)}
                onArchive={() => setConfirm({ action: 'archive', def })}
                onDelete={() => {
                  const used = countExerciseUsage(coachPrograms, def);
                  if (used > 0) {
                    setConfirm({ action: 'archive', def });
                    return;
                  }
                  setConfirm({ action: 'delete', def });
                }}
              />
            ))}
          </div>
        )}
      </div>
      {formModal}
      {confirmModal}
    </>
  );
};

export default WlExercisesHub;
