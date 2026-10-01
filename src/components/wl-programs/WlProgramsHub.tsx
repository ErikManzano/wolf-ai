import { Filter, LayoutTemplate } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import type { GeneratedProgram } from '../../models/training';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { parseHashDeepLink, writeHashDeepLink, writeProgramsHubHash } from '../../navigation/deepLinks';
import ConfirmationModal from '../ConfirmationModal';
import { WlCenteredModal } from '../wl-shared/WlCenteredModal';
import { WlListActionBar } from '../wl-shared/WlListActionBar';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/app-breadcrumb.css';
import { ProgramMobileDetail } from './ProgramMobileDetail';
import WlProgramAssignSheet from './WlProgramAssignSheet';
import WlProgramCreateSheet, { type WlProgramCreateSubmit } from './WlProgramCreateSheet';
import WlProgramScheduleSheet from './WlProgramScheduleSheet';
import { WlProgramUnifiedTable } from './WlProgramUnifiedTable';
import { ProgramUnifiedMobileCard } from './ProgramUnifiedMobileCard';
import {
  buildUnifiedProgramRows,
  filterUnifiedRows,
  type ProgramStatusFilterId,
  type UnifiedKindFilter,
  type UnifiedProgramRow,
} from './unifiedProgramList';

export const WL_PROGRAMS_FOCUS_KEY = 'wolf_programs_focus_id';

interface WlProgramsHubProps {
  isEs: boolean;
}

type ProgramConfirmAction = 'delete' | 'duplicate';

const PROGRAM_FILTER_OPTIONS: { id: ProgramStatusFilterId; labelEs: string; labelEn: string }[] = [
  { id: 'all', labelEs: 'Todos', labelEn: 'All' },
  { id: 'published', labelEs: 'Publicados', labelEn: 'Published' },
  { id: 'draft', labelEs: 'Borradores', labelEn: 'Drafts' },
  { id: 'without_athletes', labelEs: 'Sin atletas', labelEn: 'No athletes' },
];

const KIND_CHIP_OPTIONS: { id: UnifiedKindFilter; labelEs: string; labelEn: string }[] = [
  { id: 'all', labelEs: 'Todos', labelEn: 'All' },
  { id: 'templates', labelEs: 'Solo plantillas', labelEn: 'Templates only' },
  { id: 'individuals', labelEs: 'Solo individuales', labelEn: 'Individuals only' },
];

function programConfirmCopy(
  program: CoachProgramRow,
  action: ProgramConfirmAction,
  isEs: boolean,
): { title: string; message: string; confirmLabel: string; danger: boolean } {
  if (action === 'delete') {
    const enrolled = program.enrolledAthletes.length;
    const enrollmentNote =
      enrolled > 0
        ? isEs
          ? ` Tiene ${enrolled} atleta${enrolled === 1 ? '' : 's'} inscrito${enrolled === 1 ? '' : 's'}.`
          : ` It has ${enrolled} enrolled athlete${enrolled === 1 ? '' : 's'}.`
        : '';
    return {
      title: isEs ? 'Eliminar programa' : 'Delete program',
      message: isEs
        ? `¿Eliminar «${program.name}»?${enrollmentNote} Esta acción no se puede deshacer.`
        : `Delete "${program.name}"?${enrollmentNote} This cannot be undone.`,
      confirmLabel: isEs ? 'Eliminar' : 'Delete',
      danger: true,
    };
  }

  return {
    title: isEs ? 'Duplicar programa' : 'Duplicate program',
    message: isEs
      ? `¿Duplicar «${program.name}»? Se creará una copia en borrador.`
      : `Duplicate "${program.name}"? A draft copy will be created.`,
    confirmLabel: isEs ? 'Duplicar' : 'Duplicate',
    danger: false,
  };
}

const WlProgramsHub: React.FC<WlProgramsHubProps> = ({ isEs }) => {
  const {
    coachPrograms,
    programsLoading,
    createCoachProgram,
    updateCoachProgram,
    openProgramEditor,
    duplicateCoachProgram,
    deleteCoachProgram,
    removeAssignment,
    motorExercises,
    assignments,
    completions,
    wlAthletes,
    openAssignmentEditor,
    assignProgramToAthlete,
    assignCoachProgramToAthletes,
    duplicateAssignment,
  } = useWolfAssign();
  const { pushAlert } = useWolfAlert();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<UnifiedKindFilter>('individuals');
  const [statusFilter, setStatusFilter] = useState<ProgramStatusFilterId>('all');
  const [athleteFilterId, setAthleteFilterId] = useState('');
  const [coachProgramFilterId, setCoachProgramFilterId] = useState('');
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null);
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [assignAthleteId, setAssignAthleteId] = useState<string | undefined>();
  const [scheduleProgramId, setScheduleProgramId] = useState<string | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    program: CoachProgramRow;
    action: ProgramConfirmAction;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);
  const [updateTemplateRow, setUpdateTemplateRow] = useState<
    Extract<UnifiedProgramRow, { kind: 'individual' }> | null
  >(null);
  const [dupAssignmentRow, setDupAssignmentRow] = useState<
    Extract<UnifiedProgramRow, { kind: 'individual' }> | null
  >(null);
  const [dupTargetAthleteId, setDupTargetAthleteId] = useState('');

  useEffect(() => {
    const link = parseHashDeepLink();
    if (!link || link.view !== 'programs') return;
    if (link.programsKindFilter) setKindFilter(link.programsKindFilter);
    if (link.athleteProfileId) setAthleteFilterId(link.athleteProfileId);
    if (link.coachProgramFilterId) setCoachProgramFilterId(link.coachProgramFilterId);
  }, []);

  const syncHubHash = useCallback(
    (next: {
      kindFilter?: UnifiedKindFilter;
      athleteProfileId?: string;
      coachProgramFilterId?: string;
    }) => {
      writeProgramsHubHash({
        kindFilter: next.kindFilter ?? kindFilter,
        athleteProfileId:
          next.athleteProfileId !== undefined
            ? next.athleteProfileId
            : athleteFilterId || undefined,
        coachProgramFilterId:
          next.coachProgramFilterId !== undefined
            ? next.coachProgramFilterId
            : coachProgramFilterId || undefined,
      });
    },
    [kindFilter, athleteFilterId, coachProgramFilterId],
  );

  const athleteNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of wlAthletes) map[a.id] = a.name?.trim() || a.id;
    return map;
  }, [wlAthletes]);

  const allRows = useMemo(
    () =>
      buildUnifiedProgramRows({
        coachPrograms,
        assignments,
        completions,
        athleteNameById,
        isEs,
      }),
    [coachPrograms, assignments, completions, athleteNameById, isEs],
  );

  const filteredRows = useMemo(
    () =>
      filterUnifiedRows(allRows, {
        search,
        kindFilter,
        athleteProfileId: athleteFilterId || undefined,
        coachProgramId: coachProgramFilterId || undefined,
        statusFilter,
      }),
    [allRows, search, kindFilter, athleteFilterId, coachProgramFilterId, statusFilter],
  );

  const handleCreateSubmit = async (payload: WlProgramCreateSubmit) => {
    if (payload.mode === 'reusable') {
      const created = await createCoachProgram(payload.name, payload.program);
      if (created) openProgramEditor(created.id);
      return;
    }
    if (payload.mode === 'athlete_from_template') {
      const ids = await assignCoachProgramToAthletes(payload.coachProgramId, [payload.athleteProfileId]);
      if (ids[0]) openAssignmentEditor(ids[0]);
      return;
    }
    const assignmentId = await assignProgramToAthlete(payload.program, payload.athleteProfileId);
    if (assignmentId) openAssignmentEditor(assignmentId);
  };

  const openAssign = (program: CoachProgramRow, athleteProfileId?: string) => {
    setAssignProgramId(program.id);
    setAssignAthleteId(athleteProfileId);
  };

  const openSchedule = (program: CoachProgramRow) => {
    setScheduleProgramId(program.id);
  };

  const assignProgram = assignProgramId
    ? coachPrograms.find((program) => program.id === assignProgramId) ?? null
    : null;

  const scheduleProgram = scheduleProgramId
    ? coachPrograms.find((program) => program.id === scheduleProgramId) ?? null
    : null;

  const handleSaveSchedule = async (program: GeneratedProgram) => {
    if (!scheduleProgram) return;
    const saved = await updateCoachProgram(scheduleProgram.id, { program });
    if (saved) {
      pushAlert({
        tone: 'success',
        title: isEs ? 'Calendario actualizado' : 'Schedule updated',
        message: isEs
          ? `Fechas y estructura de «${scheduleProgram.name}» guardadas.`
          : `Dates and structure for "${scheduleProgram.name}" saved.`,
      });
    }
  };

  const handleRemoveEnrollment = async (assignmentId: string, athleteName: string, programName: string) => {
    const ok = window.confirm(
      isEs
        ? `¿Quitar a ${athleteName} de «${programName}»? El atleta dejará de ver este plan.`
        : `Remove ${athleteName} from “${programName}”? They will no longer see this plan.`,
    );
    if (!ok) return;
    await removeAssignment(assignmentId);
  };

  const mobileDetailProgram = mobileDetailId
    ? coachPrograms.find((program) => program.id === mobileDetailId) ?? null
    : null;

  const mobileTopBar = useMemo(
    () =>
      isMobile && mobileDetailProgram
        ? {
            title: mobileDetailProgram.name,
            back: {
              label: isEs ? 'Volver a Programas' : 'Back to Programs',
              onBack: () => setMobileDetailId(null),
            },
          }
        : null,
    [isMobile, mobileDetailProgram, isEs],
  );
  useMobileTopBar(mobileTopBar);

  const runProgramAction = (
    program: CoachProgramRow,
    action: 'edit' | 'assign' | 'duplicate' | 'delete' | 'archive',
  ) => {
    if (action === 'edit') {
      openProgramEditor(program.id);
      return;
    }
    if (action === 'assign') {
      openAssign(program);
      return;
    }
    if (action === 'archive') {
      void updateCoachProgram(program.id, { status: 'archived' }).then((saved) => {
        if (saved) {
          pushAlert({
            tone: 'success',
            title: isEs ? 'Programa archivado' : 'Program archived',
            message: isEs ? `«${program.name}» archivado.` : `"${program.name}" archived.`,
          });
        }
      });
      return;
    }
    setConfirmAction({ program, action: action === 'delete' ? 'delete' : 'duplicate' });
  };

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction || confirmBusy) return;
    const { program, action } = confirmAction;
    setConfirmAction(null);
    setConfirmBusy(true);
    try {
      if (action === 'delete') {
        const ok = await deleteCoachProgram(program.id);
        if (ok) {
          pushAlert({
            tone: 'success',
            title: isEs ? 'Programa eliminado' : 'Program deleted',
            message: isEs
              ? `«${program.name}» se eliminó correctamente.`
              : `"${program.name}" was removed successfully.`,
          });
          if (mobileDetailId === program.id) setMobileDetailId(null);
          if (scheduleProgramId === program.id) setScheduleProgramId(null);
        }
      } else {
        const copy = await duplicateCoachProgram(program.id);
        if (copy) {
          pushAlert({
            tone: 'success',
            title: isEs ? 'Programa duplicado' : 'Program duplicated',
            message: isEs ? `Copia creada: «${copy.name}».` : `Copy created: "${copy.name}".`,
          });
        }
      }
    } finally {
      setConfirmBusy(false);
    }
  }, [
    confirmAction,
    confirmBusy,
    deleteCoachProgram,
    duplicateCoachProgram,
    isEs,
    mobileDetailId,
    pushAlert,
    scheduleProgramId,
  ]);

  const openTemplateRow = (row: Extract<UnifiedProgramRow, { kind: 'template' }>) => {
    if (isMobile) setMobileDetailId(row.template.id);
    else openProgramEditor(row.template.id);
  };

  const handleSaveAsTemplate = async (row: Extract<UnifiedProgramRow, { kind: 'individual' }>) => {
    const baseName = row.displayName.trim() || row.athleteName;
    const name = isEs ? `${baseName} (base)` : `${baseName} (base)`;
    const created = await createCoachProgram(name, row.assignment.program);
    if (created) {
      pushAlert({
        tone: 'success',
        title: isEs ? 'Plantilla creada' : 'Template created',
        message: isEs ? `«${created.name}» lista para asignar.` : `"${created.name}" is ready to assign.`,
      });
    }
  };

  const confirmUpdateTemplate = async () => {
    if (!updateTemplateRow?.templateCoachProgramId) return;
    const tplId = updateTemplateRow.templateCoachProgramId;
    const saved = await updateCoachProgram(tplId, { program: updateTemplateRow.assignment.program });
    setUpdateTemplateRow(null);
    if (saved) {
      pushAlert({
        tone: 'success',
        title: isEs ? 'Plantilla actualizada' : 'Template updated',
        message: isEs
          ? 'La plantilla refleja este programa. Las instancias ya asignadas no cambian solas.'
          : 'The template now matches this program. Existing assignments are unchanged.',
      });
    }
  };

  const confirmDuplicateAssignment = async () => {
    if (!dupAssignmentRow || !dupTargetAthleteId) return;
    try {
      const id = await duplicateAssignment(dupAssignmentRow.assignment.id, dupTargetAthleteId);
      setDupAssignmentRow(null);
      setDupTargetAthleteId('');
      if (id) openAssignmentEditor(id);
    } catch {
      /* alert from provider */
    }
  };

  const confirmDeleteAssignment = async () => {
    if (!deleteAssignmentId) return;
    const ok = await removeAssignment(deleteAssignmentId);
    setDeleteAssignmentId(null);
    if (ok) {
      pushAlert({
        tone: 'success',
        title: isEs ? 'Plan eliminado' : 'Plan removed',
        message: isEs ? 'El atleta ya no verá este programa.' : 'The athlete will no longer see this program.',
      });
    }
  };

  const getTemplateActions = (row: Extract<UnifiedProgramRow, { kind: 'template' }>) => ({
    onAssign: () => openAssign(row.template),
    onEdit: () => runProgramAction(row.template, 'edit'),
    onSchedule: () => openSchedule(row.template),
    onDuplicate: () => runProgramAction(row.template, 'duplicate'),
    onArchive: () => runProgramAction(row.template, 'archive'),
    onDelete: () => runProgramAction(row.template, 'delete'),
  });

  const getIndividualActions = (row: Extract<UnifiedProgramRow, { kind: 'individual' }>) => ({
    onEdit: () => openAssignmentEditor(row.assignment.id),
    onSaveAsTemplate: () => void handleSaveAsTemplate(row),
    onUpdateTemplate: row.templateCoachProgramId
      ? () => setUpdateTemplateRow(row)
      : undefined,
    showUpdateTemplate: Boolean(row.templateCoachProgramId),
    onAssignOther: () => {
      setDupAssignmentRow(row);
      setDupTargetAthleteId('');
    },
    onDuplicate: () => {
      setDupAssignmentRow(row);
      setDupTargetAthleteId('');
    },
    onDelete: () => setDeleteAssignmentId(row.assignment.id),
  });

  const openAthleteProfile = (profileId: string) => {
    writeHashDeepLink({ view: 'athletes', athleteProfileId: profileId });
    window.dispatchEvent(new CustomEvent('wolf:navigate-view', { detail: { view: 'athletes' } }));
  };

  const emptyMessage = useMemo(() => {
    if (allRows.length === 0) {
      return isEs ? 'Aún no tienes programas. Crea uno para empezar.' : 'No programs yet. Create one to get started.';
    }
    if (kindFilter === 'templates') {
      return isEs ? 'No hay plantillas con este filtro.' : 'No templates match this filter.';
    }
    if (kindFilter === 'individuals') {
      return isEs ? 'No hay programas individuales con este filtro.' : 'No individual programs match this filter.';
    }
    return isEs ? 'Sin resultados. Prueba otro término o filtro.' : 'No results. Try another search or filter.';
  }, [allRows.length, kindFilter, isEs]);

  const confirmCopy = confirmAction
    ? programConfirmCopy(confirmAction.program, confirmAction.action, isEs)
    : null;

  const createSheet = showCreateSheet ? (
    <WlProgramCreateSheet
      isEs={isEs}
      exercises={motorExercises}
      athletes={wlAthletes}
      templates={coachPrograms.filter((p) => p.status !== 'archived')}
      onClose={() => setShowCreateSheet(false)}
      onSubmit={handleCreateSubmit}
    />
  ) : null;

  const assignSheet = assignProgram ? (
    <WlProgramAssignSheet
      isEs={isEs}
      program={assignProgram}
      preselectedAthleteId={assignAthleteId}
      onClose={() => {
        setAssignProgramId(null);
        setAssignAthleteId(undefined);
      }}
      onOpenAssignment={openAssignmentEditor}
    />
  ) : null;

  const scheduleSheet = scheduleProgram ? (
    <WlProgramScheduleSheet
      isEs={isEs}
      programName={scheduleProgram.name}
      program={scheduleProgram.program}
      exercises={motorExercises}
      onClose={() => setScheduleProgramId(null)}
      onSave={handleSaveSchedule}
    />
  ) : null;

  const confirmModal = (
    <>
      <ConfirmationModal
        open={confirmAction != null}
        title={confirmCopy?.title ?? ''}
        message={confirmCopy?.message ?? ''}
        confirmLabel={confirmCopy?.confirmLabel ?? ''}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger={confirmCopy?.danger}
        onCancel={() => {
          if (!confirmBusy) setConfirmAction(null);
        }}
        onConfirm={() => void handleConfirmAction()}
      />
      <ConfirmationModal
        open={updateTemplateRow != null}
        title={isEs ? 'Actualizar plantilla original' : 'Update source template'}
        message={
          isEs
            ? '¿Copiar este programa a la plantilla original? Los atletas ya asignados no se actualizan automáticamente.'
            : 'Copy this program to the source template? Athletes already assigned will not update automatically.'
        }
        confirmLabel={isEs ? 'Actualizar plantilla' : 'Update template'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => setUpdateTemplateRow(null)}
        onConfirm={() => void confirmUpdateTemplate()}
      />
      <ConfirmationModal
        open={deleteAssignmentId != null}
        title={isEs ? 'Eliminar plan individual' : 'Remove individual plan'}
        message={
          isEs
            ? '¿Eliminar este plan del atleta? No se puede deshacer.'
            : 'Remove this plan from the athlete? This cannot be undone.'
        }
        confirmLabel={isEs ? 'Eliminar' : 'Delete'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => setDeleteAssignmentId(null)}
        onConfirm={() => void confirmDeleteAssignment()}
      />
    </>
  );

  const dupModal = dupAssignmentRow ? (
    <WlCenteredModal
      isEs={isEs}
      kicker={isEs ? 'Programa individual' : 'Individual program'}
      title={isEs ? 'Asignar copia a otro atleta' : 'Assign copy to another athlete'}
      onClose={() => {
        setDupAssignmentRow(null);
        setDupTargetAthleteId('');
      }}
      footer={
        <div className="wl-form-sheet-footer__actions">
          <button
            type="button"
            className="wl-form-sheet-btn wl-form-sheet-btn--ghost"
            onClick={() => {
              setDupAssignmentRow(null);
              setDupTargetAthleteId('');
            }}
          >
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            type="button"
            className="wl-form-sheet-btn wl-form-sheet-btn--primary"
            disabled={!dupTargetAthleteId}
            onClick={() => void confirmDuplicateAssignment()}
          >
            {isEs ? 'Asignar copia' : 'Assign copy'}
          </button>
        </div>
      }
    >
      <label className="wl-form-sheet-field">
        <span className="wl-form-sheet-label">{isEs ? 'Atleta' : 'Athlete'}</span>
        <select
          className="wl-form-sheet-input"
          value={dupTargetAthleteId}
          onChange={(e) => setDupTargetAthleteId(e.target.value)}
        >
          <option value="">{isEs ? 'Seleccionar atleta…' : 'Select athlete…'}</option>
          {wlAthletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
    </WlCenteredModal>
  ) : null;

  if (isMobile && mobileDetailProgram) {
    return (
      <>
        <section className="wl-programs-hub wl-list-toolbar-scope">
          <AppBreadcrumb
            isEs={isEs}
            className="app-breadcrumb--icon-back"
            onBack={() => setMobileDetailId(null)}
            backLabel={isEs ? 'Programas' : 'Programs'}
            items={[
              { label: isEs ? 'Programas' : 'Programs' },
              { label: mobileDetailProgram.name },
            ]}
          />
          <ProgramMobileDetail
            row={mobileDetailProgram}
            isEs={isEs}
            showBack={false}
            onBack={() => setMobileDetailId(null)}
            onEdit={() => runProgramAction(mobileDetailProgram, 'edit')}
            onSchedule={() => openSchedule(mobileDetailProgram)}
            onAssign={() => runProgramAction(mobileDetailProgram, 'assign')}
            onDuplicate={() => runProgramAction(mobileDetailProgram, 'duplicate')}
            onDelete={() => runProgramAction(mobileDetailProgram, 'delete')}
            onRemoveEnrollment={(assignmentId, athleteName) =>
              void handleRemoveEnrollment(assignmentId, athleteName, mobileDetailProgram.name)
            }
          />
          {assignSheet}
          {scheduleSheet}
          {createSheet}
        </section>
        {confirmModal}
      </>
    );
  }

  const kindChips = (
    <div className="wl-programs-hub-chips" role="group" aria-label={isEs ? 'Tipo de programa' : 'Program type'}>
      {KIND_CHIP_OPTIONS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={`wl-programs-hub-chips__btn${chip.id === 'templates' ? ' wl-programs-hub-chips__btn--templates' : ''}${kindFilter === chip.id ? ' is-active' : ''}`}
          onClick={() => {
            setKindFilter(chip.id);
            syncHubHash({ kindFilter: chip.id });
          }}
        >
          {chip.id === 'templates' ? <LayoutTemplate size={14} strokeWidth={2.25} aria-hidden /> : null}
          {isEs ? chip.labelEs : chip.labelEn}
        </button>
      ))}
      <label className="wl-programs-hub-chips__athlete">
        <span className="wl-programs-hub-chips__athlete-label">{isEs ? 'Atleta' : 'Athlete'}</span>
        <select
          value={athleteFilterId}
          onChange={(e) => {
            setAthleteFilterId(e.target.value);
            syncHubHash({ athleteProfileId: e.target.value || undefined });
          }}
        >
          <option value="">{isEs ? 'Todos' : 'All'}</option>
          {wlAthletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      {coachProgramFilterId ? (
        <button
          type="button"
          className="wl-programs-hub-chips__clear"
          onClick={() => {
            setCoachProgramFilterId('');
            syncHubHash({ coachProgramFilterId: undefined });
          }}
        >
          {isEs ? 'Quitar filtro plantilla' : 'Clear template filter'}
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="wl-programs-hub wl-list-toolbar-scope">
        <header className="wl-programs-head">
          <div className="wl-programs-head__text">
            <AppBreadcrumb isEs={isEs} items={[{ label: isEs ? 'Programas' : 'Programs' }]} />
            <p className="wl-programs-head__desc">
              {isEs
                ? 'Gestiona mesociclos, asigna atletas y revisa adherencia en segundos.'
                : 'Manage mesocycles, assign athletes, and review adherence in seconds.'}
            </p>
          </div>
        </header>

        <WlListActionBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={isEs ? 'Buscar programa o atleta…' : 'Search program or athlete…'}
          searchAriaLabel={isEs ? 'Buscar' : 'Search'}
          filterIcon={Filter}
          filterValue={statusFilter}
          onFilterChange={(value) => setStatusFilter(value as ProgramStatusFilterId)}
          filterAriaLabel={isEs ? 'Filtrar plantillas' : 'Filter templates'}
          filterOptions={PROGRAM_FILTER_OPTIONS.map((option) => ({
            id: option.id,
            label: isEs ? option.labelEs : option.labelEn,
          }))}
          filterActive={statusFilter !== 'all'}
          primaryLabel={isEs ? 'Nuevo programa' : 'New program'}
          primaryAriaLabel={isEs ? 'Nuevo programa' : 'New program'}
          onPrimaryClick={() => setShowCreateSheet(true)}
        />

        {kindChips}

        {programsLoading ? (
          <p className="wl-programs-empty">{isEs ? 'Cargando programas…' : 'Loading programs…'}</p>
        ) : null}

        {!programsLoading && filteredRows.length === 0 ? (
          <div className="wl-programs-empty-wrap">
            <p className="wl-programs-empty">{emptyMessage}</p>
            {allRows.length > 0 ? (
              <button
                type="button"
                className="wl-programs-empty-link"
                onClick={() => {
                  setKindFilter('all');
                  setAthleteFilterId('');
                  setCoachProgramFilterId('');
                  setSearch('');
                  setStatusFilter('all');
                  syncHubHash({
                    kindFilter: 'all',
                    athleteProfileId: undefined,
                    coachProgramFilterId: undefined,
                  });
                }}
              >
                {isEs ? 'Ver todos' : 'Show all'}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => setShowCreateSheet(true)}>
                {isEs ? 'Nuevo programa' : 'New program'}
              </button>
            )}
          </div>
        ) : null}

        {!programsLoading && filteredRows.length > 0 && isMobile ? (
          <div className="wl-programs-mobile-list">
            {filteredRows.map((row) => (
              <ProgramUnifiedMobileCard
                key={row.id}
                row={row}
                isEs={isEs}
                onOpen={() =>
                  row.kind === 'template'
                    ? openTemplateRow(row)
                    : openAssignmentEditor(row.assignment.id)
                }
                templateActions={row.kind === 'template' ? getTemplateActions(row) : undefined}
                individualActions={row.kind === 'individual' ? getIndividualActions(row) : undefined}
              />
            ))}
          </div>
        ) : null}

        {!programsLoading && filteredRows.length > 0 && !isMobile ? (
          <WlProgramUnifiedTable
            rows={filteredRows}
            isEs={isEs}
            onTemplateRowClick={openTemplateRow}
            onIndividualRowClick={(row) => openAssignmentEditor(row.assignment.id)}
            onFilterByTemplate={(id) => {
              setCoachProgramFilterId(id);
              setKindFilter('individuals');
              syncHubHash({ coachProgramFilterId: id, kindFilter: 'individuals' });
            }}
            onOpenAthlete={openAthleteProfile}
            getTemplateActions={getTemplateActions}
            getIndividualActions={getIndividualActions}
          />
        ) : null}

        {assignSheet}
        {scheduleSheet}
        {createSheet}
        {dupModal}
      </div>
      {confirmModal}
    </>
  );
};

export default WlProgramsHub;
