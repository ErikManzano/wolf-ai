import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, UserCog, X } from 'lucide-react';
import type { Athlete, AthleteLevel } from '../../models/training';
import { useWolfAssign } from '../../context/WolfAssignContext';
import ConfirmationModal from '../ConfirmationModal';

interface WlAthletesHubProps {
  isEs: boolean;
  open: boolean;
  onClose: () => void;
}

const LEVELS: AthleteLevel[] = ['beginner', 'intermediate', 'advanced'];

const emptyOneRm = (): Athlete['oneRM'] => ({
  snatch: 60,
  cleanJerk: 80,
  backSquat: 100,
  frontSquat: 85,
});

const WlAthletesHub: React.FC<WlAthletesHubProps> = ({ isEs, open, onClose }) => {
  const { currentUser, rosterForCoach, createWlAthlete, updateWlAthlete, deleteWlAthlete } = useWolfAssign();
  const roster = useMemo(() => rosterForCoach(currentUser), [rosterForCoach, currentUser]);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Omit<Athlete, 'id'> & { id?: string }>(() => ({
    name: '',
    level: 'intermediate',
    bodyweight: 75,
    oneRM: emptyOneRm(),
    fatigueScore: 40,
    readinessScore: 70,
  }));

  if (!open) return null;

  const editing = editId ? roster.find((a) => a.id === editId) : null;

  const startCreate = () => {
    setCreating(true);
    setEditId(null);
    setDraft({
      name: '',
      level: 'intermediate',
      bodyweight: 75,
      oneRM: emptyOneRm(),
      fatigueScore: 40,
      readinessScore: 70,
    });
  };

  const startEdit = (athlete: Athlete) => {
    setCreating(false);
    setEditId(athlete.id);
    setDraft({ ...athlete });
  };

  const saveDraft = async () => {
    if (!draft.name.trim()) return;
    if (creating) {
      const id = `ath-${Date.now()}`;
      const saved = await createWlAthlete({ ...draft, id } as Athlete);
      if (saved) setCreating(false);
      return;
    }
    if (editId) {
      const saved = await updateWlAthlete(editId, draft);
      if (saved) setEditId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteWlAthlete(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="wl-mgmt-crud-panel wl-athletes-hub" role="dialog" aria-modal="true">
      <header className="wl-mgmt-crud-toolbar">
        <div className="wl-mgmt-crud-toolbar-row">
          <h2 className="wl-mgmt-detail-title">
            <UserCog size={18} aria-hidden /> {isEs ? 'Gestionar atletas' : 'Manage athletes'}
          </h2>
          <button type="button" className="btn-outline wl-mgmt-crud-btn" onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'}>
            <X size={16} />
          </button>
        </div>
        <p className="wl-mgmt-library-hint">
          {isEs
            ? 'Perfiles WL con PRs para el motor. Solo ves atletas de tu roster.'
            : 'WL profiles with PRs for the engine. You only see athletes in your roster.'}
        </p>
        <button type="button" className="btn-primary wl-mgmt-crud-btn" onClick={startCreate}>
          <Plus size={14} aria-hidden /> {isEs ? 'Nuevo atleta' : 'New athlete'}
        </button>
      </header>

      <ul className="wl-mgmt-list">
        {roster.map((a) => (
          <li key={a.id} className="wl-mgmt-row">
            <div className="wl-mgmt-row-main">
              <strong>{a.name}</strong>
              <span className="wl-mgmt-row-sub">
                {a.level} · SN {a.oneRM.snatch} · CJ {a.oneRM.cleanJerk} · SQ {a.oneRM.backSquat}
              </span>
            </div>
            <div className="wl-mgmt-row-actions">
              <button type="button" className="btn-secondary wl-mgmt-crud-btn" onClick={() => startEdit(a)}>
                <Pencil size={14} aria-hidden /> {isEs ? 'Editar' : 'Edit'}
              </button>
              <button type="button" className="btn-outline wl-mgmt-crud-btn wl-mgmt-danger-btn" onClick={() => setDeleteId(a.id)}>
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
          </li>
        ))}
        {roster.length === 0 ? (
          <li className="wl-mgmt-empty">{isEs ? 'Sin atletas en tu roster.' : 'No athletes in your roster.'}</li>
        ) : null}
      </ul>

      {(creating || editing) && (
        <div className="wl-athletes-hub-form">
          <h3>{creating ? (isEs ? 'Crear atleta' : 'Create athlete') : (isEs ? 'Editar PRs' : 'Edit PRs')}</h3>
          <label className="wolf-engine-field">
            <span className="wolf-engine-field-label">{isEs ? 'Nombre' : 'Name'}</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </label>
          <label className="wolf-engine-field">
            <span className="wolf-engine-field-label">{isEs ? 'Nivel' : 'Level'}</span>
            <select
              value={draft.level}
              onChange={(e) => setDraft((d) => ({ ...d, level: e.target.value as AthleteLevel }))}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="wl-athletes-hub-pr-grid">
            {(['snatch', 'cleanJerk', 'backSquat', 'frontSquat'] as const).map((key) => (
              <label key={key} className="wolf-engine-field">
                <span className="wolf-engine-field-label">{key}</span>
                <input
                  type="number"
                  value={draft.oneRM[key]}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      oneRM: { ...d.oneRM, [key]: Number(e.target.value) || 0 },
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="wl-mgmt-row-actions">
            <button type="button" className="btn-primary wl-mgmt-crud-btn" onClick={() => void saveDraft()}>
              {isEs ? 'Guardar' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-outline wl-mgmt-crud-btn"
              onClick={() => {
                setCreating(false);
                setEditId(null);
              }}
            >
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={Boolean(deleteId)}
        title={isEs ? 'Eliminar atleta' : 'Delete athlete'}
        message={
          isEs
            ? 'No se puede deshacer. Fallará si tiene una rutina activa asignada.'
            : 'This cannot be undone. Fails if the athlete has an active assignment.'
        }
        confirmLabel={isEs ? 'Eliminar' : 'Delete'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
};

export default WlAthletesHub;
