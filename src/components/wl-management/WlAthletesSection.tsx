import React, { useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { buildWlAthleteRosterRows } from '../../utils/wlAthleteRoster';
import {
  type AthleteSortId,
  filterAthleteRows,
  sortAthleteRows,
} from '../wl-athletes/athleteListUtils';
import { WlAthleteDetail } from '../wl-athletes/WlAthleteDetail';
import { WlAthletesMobileList } from '../wl-athletes/WlAthletesMobileList';
import { WlAthletesTable } from '../wl-athletes/WlAthletesTable';
import { WlAthletesToolbar } from '../wl-athletes/WlAthletesToolbar';
import WlAthleteCreateSheet from '../wl-athletes/WlAthleteCreateSheet';
import WlAthleteEditPrSheet from '../wl-athletes/WlAthleteEditPrSheet';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/app-breadcrumb.css';
import '../wl-shared/wl-list-toolbar.css';
import '../wl-athletes/wl-athletes.css';

interface WlAthletesSectionProps {
  isEs: boolean;
  onOpenCalendar?: () => void;
}

type AthletesSectionView = 'list' | 'detail';

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
    reloadWlAthletesFromApi,
    openProgramEditor,
  } = useWolfAssign();

  const isMobile = useMediaQuery('(max-width: 768px)');

  const roster = useMemo(() => rosterForCoach(currentUser), [rosterForCoach, currentUser]);
  const rows = useMemo(
    () => buildWlAthleteRosterRows(roster, users, assignments, completions, currentUser?.id),
    [roster, users, assignments, completions, currentUser?.id],
  );

  const [sectionView, setSectionView] = useState<AthletesSectionView>('list');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [prEditId, setPrEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AthleteSortId>('name_asc');

  const filteredRows = useMemo(
    () => sortAthleteRows(filterAthleteRows(rows, search, 'all'), sort),
    [rows, search, sort],
  );

  const selectedRow = selectedAthleteId ? rows.find((r) => r.profileId === selectedAthleteId) ?? null : null;
  const prEditAthlete = prEditId ? roster.find((a) => a.id === prEditId) ?? null : null;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const openAthleteDetail = (profileId: string) => {
    setSelectedAthleteId(profileId);
    setSectionView('detail');
  };

  const closeAthleteDetail = () => {
    setSectionView('list');
    setSelectedAthleteId(null);
  };

  const openEdit = (profileId: string) => {
    setPrEditId(profileId);
  };

  const closePrEdit = () => setPrEditId(null);

  const handleSavePrEdit = async (patch: Parameters<typeof updateWlAthlete>[1]) => {
    if (!prEditAthlete) return;
    const saved = await updateWlAthlete(prEditAthlete.id, patch);
    if (saved) {
      closePrEdit();
      void reloadWlAthletesFromApi();
    }
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

  const mobileTopBar = useMemo(
    () =>
      isMobile && sectionView === 'detail' && selectedRow
        ? {
            title: selectedRow.name,
            back: {
              label: isEs ? 'Volver a Atletas' : 'Back to Athletes',
              onBack: closeAthleteDetail,
            },
          }
        : null,
    [isMobile, sectionView, selectedRow, isEs],
  );
  useMobileTopBar(mobileTopBar);

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
          onEdit={() => openEdit(selectedRow.profileId)}
          onOpenProgram={(coachProgramId) => openProgramEditor(coachProgramId)}
        />

        {prEditSheet}
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
          onCreate={async (input) => {
            const created = await createWlAthlete(input);
            if (created) void reloadWlAthletesFromApi();
          }}
        />
      ) : null}

      {prEditSheet}

      <WlAthletesToolbar
        isEs={isEs}
        search={search}
        onSearchChange={setSearch}
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
              onEdit={openEdit}
              onOpenProgram={(coachProgramId) => openProgramEditor(coachProgramId)}
            />
          </div>
          <div className="wl-athletes-mobile-only">
            <WlAthletesMobileList rows={filteredRows} isEs={isEs} onSelect={openAthleteDetail} />
          </div>
        </>
      )}

      {isSuperAdmin ? (
        <p style={{ marginTop: '16px', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
          {isEs
            ? 'Para crear usuario y contraseña de login, usa Panel maestro → Usuarios.'
            : 'To create login username/password, use Master panel → Users.'}
        </p>
      ) : null}
    </div>
  );
};

export default WlAthletesSection;
