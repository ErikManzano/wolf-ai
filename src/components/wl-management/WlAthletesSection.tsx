import React, { useCallback, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { buildWlAthleteRosterRows } from '../../utils/wlAthleteRoster';
import {
  type AthleteFilterId,
  type AthleteSortId,
  filterAthleteRows,
  sortAthleteRows,
} from '../wl-athletes/athleteListUtils';
import { WlAthleteDetail } from '../wl-athletes/WlAthleteDetail';
import { WlAthletesMobileList } from '../wl-athletes/WlAthletesMobileList';
import { WlAthletesTable } from '../wl-athletes/WlAthletesTable';
import { WlAthletesToolbar } from '../wl-athletes/WlAthletesToolbar';
import WlAthleteAssignProgramSheet from '../wl-athletes/WlAthleteAssignProgramSheet';
import WlAthleteCreateSheet from '../wl-athletes/WlAthleteCreateSheet';
import WlAthleteEditPrSheet from '../wl-athletes/WlAthleteEditPrSheet';
import WlAthleteInviteSheet from '../wl-athletes/WlAthleteInviteSheet';
import { WlPrsFlow } from '../wl-prs/WlPrsFlow';
import type { PrLiftId } from '../../models/liftLogs';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import ConfirmationModal from '../ConfirmationModal';
import { canAddAthlete, resolveCoachPlan } from '../../config/billing';
import '../wl-shared/app-breadcrumb.css';
import '../wl-shared/wl-list-toolbar.css';
import '../wl-athletes/wl-athletes.css';

interface WlAthletesSectionProps {
  isEs: boolean;
  onOpenCalendar?: () => void;
}

type AthletesSectionView = 'list' | 'detail';
type AthleteConfirmAction = 'delete' | 'unassign';

const WlAthletesSection: React.FC<WlAthletesSectionProps> = ({ isEs, onOpenCalendar }) => {
  const {
    currentUser,
    users,
    rosterForCoach,
    assignments,
    completions,
    athletesLoading,
    canEditWlRoster,
    createWlAthlete,
    updateWlAthlete,
    deleteWlAthlete,
    inviteWlAthlete,
    reloadWlAthletesFromApi,
    reloadUsersFromApi,
    openProgramEditor,
    coachPrograms,
    assignCoachProgramToAthletes,
    removeAssignment,
  } = useWolfAssign();
  const { pushAlert } = useWolfAlert();

  const isMobile = useMediaQuery('(max-width: 768px)');

  const roster = useMemo(() => rosterForCoach(currentUser), [rosterForCoach, currentUser]);
  const plan = resolveCoachPlan(currentUser?.id, currentUser?.billingPlan);
  const atAthleteLimit = !canAddAthlete(plan, roster.length);
  const limitReachedMessage = atAthleteLimit
    ? isEs
      ? 'Plan Free: máximo 3 atletas. Ve a Cuenta → Upgrade Pro para continuar.'
      : 'Free plan: max 3 athletes. Go to Account → Upgrade Pro to continue.'
    : null;
  const rows = useMemo(
    () => buildWlAthleteRosterRows(roster, users, assignments, completions, currentUser?.id),
    [roster, users, assignments, completions, currentUser?.id],
  );

  const [sectionView, setSectionView] = useState<AthletesSectionView>('list');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [prEditId, setPrEditId] = useState<string | null>(null);
  const [assignAthleteId, setAssignAthleteId] = useState<string | null>(null);
  const [inviteAthleteId, setInviteAthleteId] = useState<string | null>(null);
  const [prsLiftId, setPrsLiftId] = useState<PrLiftId | 'hub' | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AthleteFilterId>('all');
  const [sort, setSort] = useState<AthleteSortId>('name_asc');
  const [confirmAction, setConfirmAction] = useState<{
    profileId: string;
    action: AthleteConfirmAction;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const filteredRows = useMemo(
    () => sortAthleteRows(filterAthleteRows(rows, search, filter), sort),
    [rows, search, filter, sort],
  );

  const selectedRow = selectedAthleteId ? rows.find((r) => r.profileId === selectedAthleteId) ?? null : null;
  const prEditAthlete = prEditId ? roster.find((a) => a.id === prEditId) ?? null : null;
  const assignRow = assignAthleteId ? rows.find((r) => r.profileId === assignAthleteId) ?? null : null;
  const inviteRow = inviteAthleteId ? rows.find((r) => r.profileId === inviteAthleteId) ?? null : null;
  const confirmRow = confirmAction
    ? rows.find((r) => r.profileId === confirmAction.profileId) ?? null
    : null;

  const openAthleteDetail = (profileId: string) => {
    setSelectedAthleteId(profileId);
    setSectionView('detail');
  };

  const closeAthleteDetail = () => {
    setSectionView('list');
    setSelectedAthleteId(null);
    setPrsLiftId(null);
  };

  const openEdit = (profileId: string) => setPrEditId(profileId);
  const closePrEdit = () => setPrEditId(null);

  const handleSavePrEdit = async (patch: Parameters<typeof updateWlAthlete>[1]) => {
    if (!prEditAthlete) return;
    const saved = await updateWlAthlete(prEditAthlete.id, patch);
    if (saved) {
      closePrEdit();
      void reloadWlAthletesFromApi();
    }
  };

  const unassignAll = useCallback(
    async (profileId: string) => {
      const row = rows.find((r) => r.profileId === profileId);
      if (!row) return;
      for (const planItem of row.activePrograms) {
        await removeAssignment(planItem.assignmentId);
      }
    },
    [removeAssignment, rows],
  );

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction || confirmBusy) return;
    const { profileId, action } = confirmAction;
    const row = rows.find((r) => r.profileId === profileId);
    setConfirmAction(null);
    setConfirmBusy(true);
    try {
      if (action === 'unassign') {
        await unassignAll(profileId);
        pushAlert({
          tone: 'success',
          title: isEs ? 'Programa quitado' : 'Program removed',
          message: row ? row.name : '',
        });
        return;
      }
      await unassignAll(profileId);
      const ok = await deleteWlAthlete(profileId);
      if (ok) {
        pushAlert({
          tone: 'success',
          title: isEs ? 'Atleta eliminado' : 'Athlete removed',
          message: row
            ? isEs
              ? `«${row.name}» se quitó del roster.`
              : `"${row.name}" was removed from the roster.`
            : '',
        });
        if (selectedAthleteId === profileId) {
          setSectionView('list');
          setSelectedAthleteId(null);
        }
      }
    } finally {
      setConfirmBusy(false);
    }
  }, [
    confirmAction,
    confirmBusy,
    deleteWlAthlete,
    isEs,
    pushAlert,
    rows,
    selectedAthleteId,
    unassignAll,
  ]);

  const athleteHandlers = {
    onEdit: openEdit,
    onAssign: (profileId: string) => setAssignAthleteId(profileId),
    onUnassign: (profileId: string) => setConfirmAction({ profileId, action: 'unassign' }),
    onInvite: (profileId: string) => setInviteAthleteId(profileId),
    onDelete: (profileId: string) => setConfirmAction({ profileId, action: 'delete' }),
  };

  const prEditSheet =
    prEditAthlete && canEditWlRoster ? (
      <WlAthleteEditPrSheet
        key={prEditAthlete.id}
        isEs={isEs}
        athlete={prEditAthlete}
        onClose={closePrEdit}
        onSave={handleSavePrEdit}
      />
    ) : null;

  const assignSheet =
    assignRow && canEditWlRoster ? (
      <WlAthleteAssignProgramSheet
        isEs={isEs}
        athleteName={assignRow.name}
        assignedProgramIds={assignRow.activePrograms.map(
          (planItem) => planItem.coachProgramId ?? planItem.assignmentId,
        )}
        programs={coachPrograms}
        onClose={() => setAssignAthleteId(null)}
        onAssign={async (programId) => {
          const created = await assignCoachProgramToAthletes(programId, [assignRow.profileId]);
          if (created.length > 0) {
            pushAlert({
              tone: 'success',
              title: isEs ? 'Programa asignado' : 'Program assigned',
              message: assignRow.name,
            });
          }
        }}
      />
    ) : null;

  const inviteSheet =
    inviteRow && canEditWlRoster ? (
      <WlAthleteInviteSheet
        isEs={isEs}
        athleteName={inviteRow.name}
        onClose={() => setInviteAthleteId(null)}
        onInvite={async (input) => {
          const result = await inviteWlAthlete(inviteRow.profileId, input);
          if (result) await reloadUsersFromApi();
          return result;
        }}
      />
    ) : null;

  const confirmCopy = confirmAction && confirmRow
    ? confirmAction.action === 'delete'
      ? {
          title: isEs ? 'Eliminar atleta' : 'Delete athlete',
          message: isEs
            ? `¿Eliminar a «${confirmRow.name}» del roster? Se quitarán sus programas asignados.`
            : `Remove "${confirmRow.name}" from the roster? Assigned programs will be unenrolled.`,
          confirmLabel: isEs ? 'Eliminar' : 'Delete',
          danger: true,
        }
      : {
          title: isEs ? 'Quitar programa' : 'Remove program',
          message: isEs
            ? `¿Quitar ${confirmRow.activePrograms.length === 1 ? 'el programa' : 'los programas'} de «${confirmRow.name}»?`
            : `Remove ${confirmRow.activePrograms.length === 1 ? 'the program' : 'programs'} from "${confirmRow.name}"?`,
          confirmLabel: isEs ? 'Quitar' : 'Remove',
          danger: false,
        }
    : null;

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

  const sheets = (
    <>
      {prEditSheet}
      {assignSheet}
      {inviteSheet}
      {confirmModal}
    </>
  );

  const mobileTopBar = useMemo(
    () =>
      isMobile && sectionView === 'detail' && selectedRow && prsLiftId == null
        ? {
            title: selectedRow.name,
            back: {
              label: isEs ? 'Volver a Atletas' : 'Back to Athletes',
              onBack: closeAthleteDetail,
            },
          }
        : null,
    [isMobile, sectionView, selectedRow?.profileId, selectedRow?.name, isEs, prsLiftId],
  );
  useMobileTopBar(mobileTopBar);

  if (sectionView === 'detail' && selectedRow && prsLiftId != null) {
    const athlete = roster.find((a) => a.id === selectedRow.profileId);
    return (
      <div className="athletes-view wl-athletes-section wl-list-toolbar-scope">
        <WlPrsFlow
          athleteId={selectedRow.profileId}
          athleteName={selectedRow.name}
          isEs={isEs}
          canLog={canEditWlRoster}
          oneRM={athlete?.oneRM}
          createdByUserId={currentUser?.id}
          initialLiftId={prsLiftId === 'hub' ? null : prsLiftId}
          onClose={() => setPrsLiftId(null)}
          onLogsChanged={() => void reloadWlAthletesFromApi()}
        />
        {sheets}
      </div>
    );
  }

  if (sectionView === 'detail' && selectedRow) {
    return (
      <div className="athletes-view wl-athletes-section wl-list-toolbar-scope">
        <AppBreadcrumb
          isEs={isEs}
          className="app-breadcrumb--icon-back"
          onBack={closeAthleteDetail}
          backLabel={isEs ? 'Atletas' : 'Athletes'}
          items={[
            { label: isEs ? 'Atletas' : 'Athletes' },
            { label: selectedRow.name },
          ]}
        />

        <WlAthleteDetail
          row={selectedRow}
          isEs={isEs}
          canEdit={canEditWlRoster}
          layout={isMobile ? 'mobile' : 'desktop'}
          showNav={false}
          onEdit={() => athleteHandlers.onEdit(selectedRow.profileId)}
          onAssign={() => athleteHandlers.onAssign(selectedRow.profileId)}
          onUnassign={() => athleteHandlers.onUnassign(selectedRow.profileId)}
          onInvite={() => athleteHandlers.onInvite(selectedRow.profileId)}
          onDelete={() => athleteHandlers.onDelete(selectedRow.profileId)}
          onOpenProgram={(coachProgramId) => openProgramEditor(coachProgramId)}
          onOpenPrs={(liftId) => setPrsLiftId(liftId ?? 'hub')}
        />

        {sheets}
      </div>
    );
  }

  return (
    <div className="athletes-view wl-athletes-section wl-list-toolbar-scope">
      <header className="wl-athletes-header">
        <div className="wl-athletes-header__text">
          <AppBreadcrumb isEs={isEs} items={[{ label: isEs ? 'Atletas' : 'Athletes' }]} />
          <p className="wl-athletes-header__desc">
            {isEs
              ? canEditWlRoster
                ? 'Tu roster WL: PRs, nivel, rutina activa y rendimiento por atleta.'
                : 'Roster WL con PRs, nivel y adherencia de tus atletas.'
              : canEditWlRoster
                ? 'Your WL roster: PRs, level, active program and per-athlete performance.'
                : 'WL roster with PRs, level and adherence for your athletes.'}
          </p>
        </div>
      </header>

      {showAdd && canEditWlRoster ? (
        <WlAthleteCreateSheet
          isEs={isEs}
          onClose={() => setShowAdd(false)}
          limitReachedMessage={limitReachedMessage}
          onCreate={async (input) => {
            const created = await createWlAthlete(input);
            if (created) {
              void reloadWlAthletesFromApi();
              void reloadUsersFromApi();
            }
          }}
        />
      ) : null}

      {sheets}

      <WlAthletesToolbar
        isEs={isEs}
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
        canAdd={canEditWlRoster}
        onAdd={() => setShowAdd(true)}
      />

      {onOpenCalendar ? (
        <div className="wl-athletes-quick-nav">
          <button type="button" className="wl-athletes-quick-nav__btn" onClick={onOpenCalendar}>
            <CalendarRange size={18} aria-hidden />
            <span className="wl-athletes-quick-nav__text">
              <span className="wl-athletes-quick-nav__label">
                {isEs ? 'Calendario de entrenamientos' : 'Training calendar'}
              </span>
              <span className="wl-athletes-quick-nav__hint">
                {isEs ? 'Ver planificación y sesiones' : 'View planning & sessions'}
              </span>
            </span>
          </button>
        </div>
      ) : null}

      {athletesLoading ? (
        <p className="wl-athletes-empty">{isEs ? 'Cargando atletas…' : 'Loading athletes…'}</p>
      ) : filteredRows.length === 0 ? (
        <p className="wl-athletes-empty">
          {rows.length === 0
            ? isEs
              ? 'Sin atletas en tu roster.'
              : 'No athletes in your roster.'
            : isEs
              ? 'Ningún atleta coincide con la búsqueda o filtros.'
              : 'No athletes match your search or filters.'}
        </p>
      ) : (
        <>
          <div className="wl-athletes-desktop-only">
            <WlAthletesTable
              rows={filteredRows}
              isEs={isEs}
              canEdit={canEditWlRoster}
              onSelect={openAthleteDetail}
              onEdit={athleteHandlers.onEdit}
              onAssign={athleteHandlers.onAssign}
              onUnassign={athleteHandlers.onUnassign}
              onInvite={athleteHandlers.onInvite}
              onDelete={athleteHandlers.onDelete}
              onOpenProgram={(coachProgramId) => openProgramEditor(coachProgramId)}
            />
          </div>
          <div className="wl-athletes-mobile-only">
            <WlAthletesMobileList
              rows={filteredRows}
              isEs={isEs}
              canEdit={canEditWlRoster}
              onSelect={openAthleteDetail}
              onEdit={athleteHandlers.onEdit}
              onAssign={athleteHandlers.onAssign}
              onUnassign={athleteHandlers.onUnassign}
              onInvite={athleteHandlers.onInvite}
              onDelete={athleteHandlers.onDelete}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default WlAthletesSection;
