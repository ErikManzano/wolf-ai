import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Athlete, AthleteLevel } from '../../models/training';
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
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/app-breadcrumb.css';
import '../wl-shared/wl-list-toolbar.css';
import '../wl-athletes/wl-athletes.css';

interface WlAthletesSectionProps {
  isEs: boolean;
}

type AthletesSectionView = 'list' | 'detail';

const LEVELS: AthleteLevel[] = ['beginner', 'intermediate', 'advanced'];

const WlAthletesSection: React.FC<WlAthletesSectionProps> = ({ isEs }) => {
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
  } = useWolfAssign();

  const isMobile = useMediaQuery('(max-width: 768px)');

  const roster = useMemo(() => rosterForCoach(currentUser), [rosterForCoach, currentUser]);
  const rows = useMemo(
    () => buildWlAthleteRosterRows(roster, users, assignments, completions, currentUser?.id),
    [roster, users, assignments, completions, currentUser?.id],
  );

  const [sectionView, setSectionView] = useState<AthletesSectionView>('list');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AthleteSortId>('name_asc');
  const [draft, setDraft] = useState({
    name: '',
    level: 'intermediate' as AthleteLevel,
    bodyweight: 75,
    snatch: 60,
    cleanJerk: 80,
    backSquat: 100,
    frontSquat: 85,
  });

  const filteredRows = useMemo(
    () => sortAthleteRows(filterAthleteRows(rows, search, 'all'), sort),
    [rows, search, sort],
  );

  const selectedRow = selectedAthleteId ? rows.find((r) => r.profileId === selectedAthleteId) ?? null : null;
  const editing = roster.find((a) => a.id === editId);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const resetDraft = () => {
    setDraft({
      name: '',
      level: 'intermediate',
      bodyweight: 75,
      snatch: 60,
      cleanJerk: 80,
      backSquat: 100,
      frontSquat: 85,
    });
  };

  const openAthleteDetail = (profileId: string) => {
    setSelectedAthleteId(profileId);
    setSectionView('detail');
    setEditId(null);
  };

  const closeAthleteDetail = () => {
    setSectionView('list');
    setSelectedAthleteId(null);
    setEditId(null);
  };

  const openEdit = (profileId: string) => {
    setEditId(profileId);
    if (sectionView === 'list') {
      setSelectedAthleteId(profileId);
      setSectionView('detail');
    }
  };

  if (sectionView === 'detail' && selectedRow) {
    return (
      <div className="athletes-view wl-athletes-section wl-list-toolbar-scope">
        <AppBreadcrumb
          isEs={isEs}
          items={[
            { label: isEs ? 'Atletas' : 'Athletes', onClick: closeAthleteDetail },
            { label: selectedRow.name },
          ]}
        />

        {editId === selectedRow.profileId && editing && canEditWlRoster ? (
          <AthletePrEditForm
            athlete={editing}
            isEs={isEs}
            onCancel={() => setEditId(null)}
            onSave={(patch) => {
              void updateWlAthlete(editing.id, patch).then((saved) => {
                if (saved) {
                  setEditId(null);
                  void reloadWlAthletesFromApi();
                }
              });
            }}
          />
        ) : (
          <WlAthleteDetail
            row={selectedRow}
            isEs={isEs}
            canEdit={canEditWlRoster}
            layout={isMobile ? 'mobile' : 'desktop'}
            showNav={false}
            onEdit={() => openEdit(selectedRow.profileId)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="athletes-view wl-athletes-section wl-list-toolbar-scope">
      <header className="wl-athletes-header">
        <div className="wl-athletes-header__text">
          <h1 className="wl-athletes-header__title">{isEs ? 'Atletas' : 'Athletes'}</h1>
          <p className="wl-athletes-header__desc">
            {isEs
              ? canEditWlRoster
                ? 'Tu roster WL: PRs, nivel y rutina activa. Gestiona el rendimiento de cada atleta.'
                : 'Vista del roster WL con PRs, nivel y adherencia.'
              : canEditWlRoster
                ? 'Your WL roster: PRs, level, and active program. Manage each athlete’s performance.'
                : 'WL roster view with PRs, level, and adherence.'}
          </p>
        </div>
        {canEditWlRoster ? (
          <button
            type="button"
            className="btn-primary wl-athletes-header__cta"
            onClick={() => setShowAdd((v) => !v)}
          >
            <Plus size={18} aria-hidden />
            {isEs ? 'Añadir atleta' : 'Add athlete'}
          </button>
        ) : null}
      </header>

      {showAdd && canEditWlRoster ? (
        <div className="wl-mgmt-inline-form" style={{ marginBottom: '16px' }}>
          <h3 className="wl-mgmt-inline-form-title">{isEs ? 'Nuevo atleta en roster' : 'New roster athlete'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <label className="wolf-engine-field">
              <span className="wolf-engine-field-label">{isEs ? 'Nombre' : 'Name'}</span>
              <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </label>
            <label className="wolf-engine-field">
              <span className="wolf-engine-field-label">{isEs ? 'Nivel' : 'Level'}</span>
              <select value={draft.level} onChange={(e) => setDraft((d) => ({ ...d, level: e.target.value as AthleteLevel }))}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="wolf-engine-field">
              <span className="wolf-engine-field-label">PC (kg)</span>
              <input type="number" value={draft.bodyweight} onChange={(e) => setDraft((d) => ({ ...d, bodyweight: Number(e.target.value) }))} />
            </label>
          </div>
          <div className="wl-mgmt-inline-form-btns">
            <button
              type="button"
              className="btn-primary"
              disabled={!draft.name.trim()}
              onClick={() => {
                void createWlAthlete({
                  id: `ath-${Date.now()}`,
                  name: draft.name.trim(),
                  level: draft.level,
                  bodyweight: draft.bodyweight,
                  oneRM: {
                    snatch: draft.snatch,
                    cleanJerk: draft.cleanJerk,
                    backSquat: draft.backSquat,
                    frontSquat: draft.frontSquat,
                  },
                }).then((created) => {
                  if (created) {
                    resetDraft();
                    setShowAdd(false);
                  }
                });
              }}
            >
              {isEs ? 'Guardar' : 'Save'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowAdd(false)}>
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      ) : null}

      <WlAthletesToolbar
        isEs={isEs}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
      />

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

function AthletePrEditForm({
  athlete,
  isEs,
  onCancel,
  onSave,
}: {
  athlete: Athlete;
  isEs: boolean;
  onCancel: () => void;
  onSave: (patch: Partial<Athlete>) => void;
}) {
  const [name, setName] = useState(athlete.name);
  const [level, setLevel] = useState(athlete.level);
  const [bodyweight, setBodyweight] = useState(athlete.bodyweight);
  const [oneRM, setOneRM] = useState(athlete.oneRM);

  return (
    <div className="wl-mgmt-inline-form">
      <h4 className="wl-mgmt-inline-form-title">{athlete.name}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
        <label className="wolf-engine-field">
          <span className="wolf-engine-field-label">{isEs ? 'Nombre' : 'Name'}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="wolf-engine-field">
          <span className="wolf-engine-field-label">{isEs ? 'Nivel' : 'Level'}</span>
          <select value={level} onChange={(e) => setLevel(e.target.value as AthleteLevel)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="wolf-engine-field">
          <span className="wolf-engine-field-label">PC</span>
          <input type="number" value={bodyweight} onChange={(e) => setBodyweight(Number(e.target.value))} />
        </label>
        {(['snatch', 'cleanJerk', 'backSquat', 'frontSquat'] as const).map((key) => (
          <label key={key} className="wolf-engine-field">
            <span className="wolf-engine-field-label">{key}</span>
            <input
              type="number"
              value={oneRM[key]}
              onChange={(e) => setOneRM((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>
      <div className="wl-mgmt-inline-form-btns">
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            onSave({
              name: name.trim(),
              level,
              bodyweight,
              oneRM,
            })
          }
        >
          {isEs ? 'Guardar' : 'Save'}
        </button>
        <button type="button" className="btn-outline" onClick={onCancel}>
          {isEs ? 'Cancelar' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

export default WlAthletesSection;
