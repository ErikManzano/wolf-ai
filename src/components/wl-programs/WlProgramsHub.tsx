import { Filter } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import ConfirmationModal from '../ConfirmationModal';
import { WlListActionBar } from '../wl-shared/WlListActionBar';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/app-breadcrumb.css';
import { ProgramActionsMenu } from './ProgramActionsMenu';
import { ProgramCard } from './ProgramCard';
import { ProgramMobileDetail } from './ProgramMobileDetail';
import { ProgramStatusBadge } from './ProgramStatusBadge';
import { ProgramEnrolledAvatars } from './ProgramEnrolledAvatars';
import WlProgramAssignSheet from './WlProgramAssignSheet';

export const WL_PROGRAMS_FOCUS_KEY = 'wolf_programs_focus_id';

interface WlProgramsHubProps {
  isEs: boolean;
}

type ProgramFilterId = 'all' | 'published' | 'draft' | 'without_athletes';
type ProgramConfirmAction = 'delete' | 'duplicate';

const PROGRAM_FILTER_OPTIONS: { id: ProgramFilterId; labelEs: string; labelEn: string }[] = [
  { id: 'all', labelEs: 'Todos', labelEn: 'All' },
  { id: 'published', labelEs: 'Publicados', labelEn: 'Published' },
  { id: 'draft', labelEs: 'Borradores', labelEn: 'Drafts' },
  { id: 'without_athletes', labelEs: 'Sin atletas', labelEn: 'No athletes' },
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
    openProgramEditor,
    duplicateCoachProgram,
    deleteCoachProgram,
  } = useWolfAssign();
  const { pushAlert } = useWolfAlert();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProgramFilterId>('all');
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null);
  const [assignProgram, setAssignProgram] = useState<CoachProgramRow | null>(null);
  const [assignAthleteId, setAssignAthleteId] = useState<string | undefined>();
  const [confirmAction, setConfirmAction] = useState<{
    program: CoachProgramRow;
    action: ProgramConfirmAction;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coachPrograms.filter((p) => {
      if (q) {
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          p.enrolledAthletes.some((e) => e.athleteName.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      if (filter === 'published') return p.status === 'published';
      if (filter === 'draft') return p.status === 'draft';
      if (filter === 'without_athletes') return p.enrolledAthletes.length === 0;
      return true;
    });
  }, [coachPrograms, search, filter]);

  const handleCreate = async () => {
    const name = window.prompt(isEs ? 'Nombre del programa:' : 'Program name:', isEs ? 'Nuevo mesociclo' : 'New mesocycle');
    if (!name?.trim()) return;
    const created = await createCoachProgram(name.trim());
    if (created) openProgramEditor(created.id);
  };

  const openAssign = (program: CoachProgramRow, athleteProfileId?: string) => {
    setAssignProgram(program);
    setAssignAthleteId(athleteProfileId);
  };

  const mobileDetailProgram = mobileDetailId
    ? filtered.find((program) => program.id === mobileDetailId) ?? null
    : null;

  const runProgramAction = (
    program: CoachProgramRow,
    action: 'edit' | 'assign' | 'duplicate' | 'delete',
  ) => {
    if (action === 'edit') {
      openProgramEditor(program.id);
      return;
    }
    if (action === 'assign') {
      openAssign(program);
      return;
    }
    setConfirmAction({ program, action });
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
        }
      } else {
        const copy = await duplicateCoachProgram(program.id);
        if (copy) {
          pushAlert({
            tone: 'success',
            title: isEs ? 'Programa duplicado' : 'Program duplicated',
            message: isEs
              ? `Copia creada: «${copy.name}».`
              : `Copy created: "${copy.name}".`,
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
  ]);

  const openProgramRow = (row: CoachProgramRow) => {
    if (isMobile) setMobileDetailId(row.id);
    else openProgramEditor(row.id);
  };

  const programsTable = (
    <div className="wl-programs-table-wrap">
      <table className="wl-programs-table">
        <thead>
          <tr>
            <th>{isEs ? 'Programa' : 'Program'}</th>
            <th className="wl-programs-col-status">{isEs ? 'Estado' : 'Status'}</th>
            <th>{isEs ? 'Atletas' : 'Athletes'}</th>
            <th>{isEs ? 'Adherencia' : 'Adherence'}</th>
            <th>{isEs ? 'Actualizado' : 'Updated'}</th>
            <th className="wl-programs-col-actions">{isEs ? 'Acciones' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.id}
              className="wl-programs-table-row"
              onClick={() => openProgramRow(row)}
            >
              <td>
                <strong className="wl-programs-table-row__name">{row.name}</strong>
              </td>
              <td className="wl-programs-col-status">
                <ProgramStatusBadge status={row.status} isEs={isEs} />
              </td>
              <td
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <div role="presentation">
                  <ProgramEnrolledAvatars
                    enrolledAthletes={row.enrolledAthletes}
                    isEs={isEs}
                    onClick={row.enrolledAthletes.length > 0 ? () => openAssign(row) : undefined}
                  />
                </div>
              </td>
              <td>
                <div className="wl-programs-adherence-cell">
                  <span>{row.avgAdherencePct != null ? `${row.avgAdherencePct}%` : '—'}</span>
                  <div className="wl-programs-adherence-bar" aria-hidden>
                    <i style={{ width: `${row.avgAdherencePct ?? 0}%` }} />
                  </div>
                </div>
              </td>
              <td>{new Date(row.updatedAt).toLocaleDateString(isEs ? 'es' : 'en')}</td>
              <td
                className="wl-programs-col-actions"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <ProgramActionsMenu
                  isEs={isEs}
                  onEdit={() => runProgramAction(row, 'edit')}
                  onAssign={() => runProgramAction(row, 'assign')}
                  onDuplicate={() => runProgramAction(row, 'duplicate')}
                  onDelete={() => runProgramAction(row, 'delete')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const confirmCopy = confirmAction
    ? programConfirmCopy(confirmAction.program, confirmAction.action, isEs)
    : null;

  const assignSheet = assignProgram ? (
    <WlProgramAssignSheet
      isEs={isEs}
      program={assignProgram}
      preselectedAthleteId={assignAthleteId}
      onClose={() => {
        setAssignProgram(null);
        setAssignAthleteId(undefined);
      }}
    />
  ) : null;

  const confirmModal = (
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
  );

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
            onAssign={() => runProgramAction(mobileDetailProgram, 'assign')}
            onDuplicate={() => runProgramAction(mobileDetailProgram, 'duplicate')}
            onDelete={() => runProgramAction(mobileDetailProgram, 'delete')}
          />
          {assignSheet}
        </section>
        {confirmModal}
      </>
    );
  }

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
          searchPlaceholder={isEs ? 'Buscar programa…' : 'Search program…'}
          searchAriaLabel={isEs ? 'Buscar programa' : 'Search program'}
          filterIcon={Filter}
          filterValue={filter}
          onFilterChange={(value) => setFilter(value as ProgramFilterId)}
          filterAriaLabel={isEs ? 'Filtrar programas' : 'Filter programs'}
          filterOptions={PROGRAM_FILTER_OPTIONS.map((option) => ({
            id: option.id,
            label: isEs ? option.labelEs : option.labelEn,
          }))}
          filterActive={filter !== 'all'}
          primaryLabel={isEs ? 'Nuevo programa' : 'New program'}
          primaryAriaLabel={isEs ? 'Nuevo programa' : 'New program'}
          onPrimaryClick={() => void handleCreate()}
        />

        {programsLoading ? <p className="wl-programs-empty">{isEs ? 'Cargando programas…' : 'Loading programs…'}</p> : null}
        {!programsLoading && filtered.length === 0 ? (
          <p className="wl-programs-empty">
            {isEs ? 'Sin programas. Crea el primero.' : 'No programs yet. Create your first one.'}
          </p>
        ) : null}

        {!programsLoading && filtered.length > 0 && isMobile ? (
          <div className="wl-programs-mobile-list">
            {filtered.map((row) => (
              <ProgramCard
                key={row.id}
                row={row}
                isEs={isEs}
                onOpen={() => setMobileDetailId(row.id)}
                onEdit={() => runProgramAction(row, 'edit')}
                onAssign={() => runProgramAction(row, 'assign')}
                onDuplicate={() => runProgramAction(row, 'duplicate')}
                onDelete={() => runProgramAction(row, 'delete')}
              />
            ))}
          </div>
        ) : null}

        {!programsLoading && filtered.length > 0 && !isMobile ? programsTable : null}

        {assignSheet}
      </div>
      {confirmModal}
    </>
  );
};

export default WlProgramsHub;
