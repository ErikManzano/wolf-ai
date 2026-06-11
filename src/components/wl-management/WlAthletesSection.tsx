import React, { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import type { Athlete, AthleteLevel } from '../../models/training';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { buildWlAthleteRosterRows } from '../../utils/wlAthleteRoster';

interface WlAthletesSectionProps {
  isEs: boolean;
}

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

  const roster = useMemo(() => rosterForCoach(currentUser), [rosterForCoach, currentUser]);
  const rows = useMemo(
    () => buildWlAthleteRosterRows(roster, users, assignments, completions, currentUser?.id),
    [roster, users, assignments, completions, currentUser?.id],
  );

  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    level: 'intermediate' as AthleteLevel,
    bodyweight: 75,
    snatch: 60,
    cleanJerk: 80,
    backSquat: 100,
    frontSquat: 85,
  });

  const editing = roster.find((a) => a.id === editId);

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

  const isSuperAdmin = currentUser?.role === 'super_admin';

  return (
    <div className="athletes-view wl-athletes-section">
      <header className="panel-header">
        <div className="header-left">
          <h1 className="view-title">
            <Users size={22} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} aria-hidden />
            {isEs ? 'Atletas' : 'Athletes'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', maxWidth: '640px', lineHeight: 1.5 }}>
            {isEs
              ? canEditWlRoster
                ? 'Tu roster WL: PRs, nivel y rutina activa. Las cuentas de login (usuario/contraseña) las crea el administrador hasta activar correo.'
                : 'Vista del roster WL.'
              : canEditWlRoster
                ? 'Your WL roster: PRs, level, and active program. Login accounts are created by the administrator until email auth is enabled.'
                : 'WL roster view.'}
          </p>
        </div>
        {canEditWlRoster ? (
          <button type="button" className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={16} aria-hidden />
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

      <div className="athletes-kpis">
        <div className="athletes-kpi-card">
          <span>{isEs ? 'En roster' : 'On roster'}</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="athletes-kpi-card">
          <span>{isEs ? 'Con rutina WL' : 'With WL program'}</span>
          <strong>{rows.filter((r) => r.assignmentStatus === 'active').length}</strong>
        </div>
        <div className="athletes-kpi-card">
          <span>{isEs ? 'Con cuenta app' : 'With app account'}</span>
          <strong>{rows.filter((r) => r.hasPlatformAccount).length}</strong>
        </div>
      </div>

      <div className="wl-mgmt-table-wrap" style={{ marginTop: '16px' }}>
        {athletesLoading ? (
          <p className="wl-mgmt-empty">{isEs ? 'Cargando atletas…' : 'Loading athletes…'}</p>
        ) : (
          <table className="wl-mgmt-crud-table">
            <thead>
              <tr>
                <th>{isEs ? 'Atleta' : 'Athlete'}</th>
                <th>PRs</th>
                <th>{isEs ? 'Cuenta' : 'Account'}</th>
                <th>{isEs ? 'Rutina' : 'Program'}</th>
                <th>{isEs ? 'Adherencia' : 'Adherence'}</th>
                {canEditWlRoster ? <th>{isEs ? 'Acciones' : 'Actions'}</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.profileId}>
                  <td>
                    <strong>{row.name}</strong>
                    <span className="wl-mgmt-row-sub">{row.level}</span>
                  </td>
                  <td>
                    SN {row.snatch} · CJ {row.cleanJerk} · SQ {row.backSquat}
                  </td>
                  <td>
                    {row.hasPlatformAccount ? (
                      <span className="wl-mgmt-status-badge wl-mgmt-status-badge--active">{row.loginLabel}</span>
                    ) : (
                      <span className="wl-mgmt-status-badge wl-mgmt-status-badge--idle">
                        {isEs ? 'Sin acceso' : 'No account'}
                      </span>
                    )}
                  </td>
                  <td>
                    {row.assignmentStatus === 'active' ? (
                      <>
                        <span className="wl-mgmt-table-plan">{row.programName}</span>
                        {row.assignedAt ? (
                          <span className="wl-mgmt-row-sub">
                            {isEs ? 'Desde' : 'Since'} {row.assignedAt.slice(0, 10)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="wl-mgmt-status-badge wl-mgmt-status-badge--idle">
                        {isEs ? 'Sin asignar' : 'Unassigned'}
                      </span>
                    )}
                  </td>
                  <td>
                    {row.completionPct != null ? (
                      <div className="wl-mgmt-table-progress">
                        <div className="wl-mgmt-progress-bar" aria-hidden>
                          <div className="wl-mgmt-progress-fill" style={{ width: `${row.completionPct}%` }} />
                        </div>
                        <span>{row.completionPct}%</span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  {canEditWlRoster ? (
                    <td>
                      <button type="button" className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setEditId(row.profileId)}>
                        {isEs ? 'Editar PRs' : 'Edit PRs'}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canEditWlRoster ? 6 : 5} className="wl-mgmt-empty">
                    {isEs ? 'Sin atletas en tu roster.' : 'No athletes in your roster.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {editing && canEditWlRoster ? (
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
      ) : null}

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
    <div className="wl-mgmt-inline-form" style={{ marginTop: '16px' }}>
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
