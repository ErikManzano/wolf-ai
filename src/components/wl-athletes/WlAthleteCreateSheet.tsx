import React, { useState } from 'react';
import { Save } from 'lucide-react';
import type { AthleteLevel } from '../../models/training';
import { WlFormSheet } from '../wl-shared/WlFormSheet';

const LEVELS: AthleteLevel[] = ['beginner', 'intermediate', 'advanced'];

export interface WlAthleteCreateInput {
  id: string;
  name: string;
  level: AthleteLevel;
  bodyweight: number;
  oneRM: {
    snatch: number;
    cleanJerk: number;
    backSquat: number;
    frontSquat: number;
  };
}

export interface WlAthleteCreateSheetProps {
  isEs: boolean;
  onClose: () => void;
  onCreate: (input: WlAthleteCreateInput) => Promise<void>;
}

const WlAthleteCreateSheet: React.FC<WlAthleteCreateSheetProps> = ({ isEs, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<AthleteLevel>('intermediate');
  const [bodyweight, setBodyweight] = useState(75);
  const [snatch, setSnatch] = useState(60);
  const [cleanJerk, setCleanJerk] = useState(80);
  const [backSquat, setBackSquat] = useState(100);
  const [frontSquat, setFrontSquat] = useState(85);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onCreate({
        id: `ath-${Date.now()}`,
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
        {saving ? (isEs ? 'Guardando…' : 'Saving…') : isEs ? 'Añadir atleta' : 'Add athlete'}
      </button>
    </div>
  );

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={isEs ? 'Nuevo atleta' : 'New athlete'}
      title={isEs ? 'Añadir al roster' : 'Add to roster'}
      subtitle={
        isEs
          ? 'Datos básicos y marcas de referencia (1RM).'
          : 'Basic profile and reference maxes (1RM).'
      }
      titleId="wl-athlete-create-title"
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
            placeholder={isEs ? 'Nombre del atleta' : 'Athlete name'}
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
            ? 'El atleta se añadirá a tu roster WL y quedará disponible para asignar programas.'
            : 'The athlete will be added to your WL roster and available for program assignments.'}
        </p>
      </section>
    </WlFormSheet>
  );
};

export default WlAthleteCreateSheet;
