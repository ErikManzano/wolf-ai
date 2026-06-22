import React, { useState } from 'react';
import { Save } from 'lucide-react';
import type { Athlete, AthleteLevel } from '../../models/training';
import { WlFormSheet } from '../wl-shared/WlFormSheet';

const LEVELS: AthleteLevel[] = ['beginner', 'intermediate', 'advanced'];

export interface WlAthleteEditPrSheetProps {
  isEs: boolean;
  athlete: Athlete;
  onClose: () => void;
  onSave: (patch: Partial<Athlete>) => Promise<void>;
}

const WlAthleteEditPrSheet: React.FC<WlAthleteEditPrSheetProps> = ({ isEs, athlete, onClose, onSave }) => {
  const [name, setName] = useState(athlete.name);
  const [level, setLevel] = useState<AthleteLevel>(athlete.level);
  const [bodyweight, setBodyweight] = useState(athlete.bodyweight);
  const [snatch, setSnatch] = useState(athlete.oneRM.snatch);
  const [cleanJerk, setCleanJerk] = useState(athlete.oneRM.cleanJerk);
  const [backSquat, setBackSquat] = useState(athlete.oneRM.backSquat);
  const [frontSquat, setFrontSquat] = useState(athlete.oneRM.frontSquat);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        level,
        bodyweight,
        oneRM: { snatch, cleanJerk, backSquat, frontSquat },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="wl-form-sheet-footer__actions">
      <button type="button" className="wl-form-sheet-btn wl-form-sheet-btn--ghost" onClick={onClose}>
        {isEs ? 'Cancelar' : 'Cancel'}
      </button>
      <button
        type="button"
        className="wl-form-sheet-btn wl-form-sheet-btn--primary"
        disabled={!canSave || saving}
        onClick={() => void handleSubmit()}
      >
        <Save size={16} aria-hidden />
        {saving ? (isEs ? 'Guardando…' : 'Saving…') : isEs ? 'Guardar cambios' : 'Save changes'}
      </button>
    </div>
  );

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={isEs ? 'Marcas y perfil' : 'Marks & profile'}
      title={isEs ? 'Editar PRs' : 'Edit PRs'}
      subtitle={
        isEs
          ? `Actualiza datos de referencia de ${athlete.name}.`
          : `Update reference data for ${athlete.name}.`
      }
      titleId="wl-athlete-edit-pr-title"
      onClose={onClose}
      footer={footer}
    >
      <div className="wl-form-sheet-grid">
        <label className="wl-form-sheet-field wl-form-sheet-field--full">
          <span className="wl-form-sheet-label">{isEs ? 'Nombre' : 'Name'}</span>
          <input
            className="wl-form-sheet-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Nivel' : 'Level'}</span>
          <select
            className="wl-form-sheet-select"
            value={level}
            onChange={(e) => setLevel(e.target.value as AthleteLevel)}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Peso corporal (kg)' : 'Bodyweight (kg)'}</span>
          <input
            type="number"
            className="wl-form-sheet-input"
            min={30}
            max={200}
            value={bodyweight}
            onChange={(e) => setBodyweight(Number(e.target.value))}
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">Snatch (kg)</span>
          <input
            type="number"
            className="wl-form-sheet-input"
            min={0}
            value={snatch}
            onChange={(e) => setSnatch(Number(e.target.value))}
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">C&J (kg)</span>
          <input
            type="number"
            className="wl-form-sheet-input"
            min={0}
            value={cleanJerk}
            onChange={(e) => setCleanJerk(Number(e.target.value))}
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Sentadilla trasera' : 'Back squat'} (kg)</span>
          <input
            type="number"
            className="wl-form-sheet-input"
            min={0}
            value={backSquat}
            onChange={(e) => setBackSquat(Number(e.target.value))}
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Sentadilla frontal' : 'Front squat'} (kg)</span>
          <input
            type="number"
            className="wl-form-sheet-input"
            min={0}
            value={frontSquat}
            onChange={(e) => setFrontSquat(Number(e.target.value))}
          />
        </label>
      </div>

      <section className="wl-form-sheet-summary wl-form-sheet-summary--note">
        <p className="wl-form-sheet-summary__lead">
          {isEs
            ? 'Los PRs se usan para calcular porcentajes y tonelaje en los programas asignados.'
            : 'PRs are used to calculate percentages and tonnage in assigned programs.'}
        </p>
      </section>
    </WlFormSheet>
  );
};

export default WlAthleteEditPrSheet;
