import React, { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { WlFormSheet } from '../wl-shared/WlFormSheet';
import { WlFormNumberStepper } from '../wl-shared/WlFormNumberStepper';
import {
  buildProgramDraft,
  computeProgramEndDate,
  todayIsoDate,
  totalTrainingDays,
} from '../../utils/programSchedule';

export interface WlProgramCreateSheetProps {
  isEs: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    program: ReturnType<typeof buildProgramDraft>;
  }) => Promise<void>;
}

const WlProgramCreateSheet: React.FC<WlProgramCreateSheetProps> = ({ isEs, onClose, onCreate }) => {
  const [name, setName] = useState(isEs ? 'Nuevo mesociclo' : 'New mesocycle');
  const [startDate, setStartDate] = useState(todayIsoDate);
  const [totalWeeks, setTotalWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [saving, setSaving] = useState(false);

  const endDate = useMemo(
    () => computeProgramEndDate(startDate, totalWeeks),
    [startDate, totalWeeks],
  );

  const trainingDays = useMemo(
    () => totalTrainingDays(totalWeeks, daysPerWeek),
    [totalWeeks, daysPerWeek],
  );

  const canSave = name.trim().length > 0 && totalWeeks >= 1 && daysPerWeek >= 1;

  const handleSubmit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const program = buildProgramDraft({
        name: name.trim(),
        startDate,
        totalWeeks,
        daysPerWeek,
      });
      await onCreate({ name: name.trim(), program });
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
        {saving ? (isEs ? 'Creando…' : 'Creating…') : isEs ? 'Crear programa' : 'Create program'}
      </button>
    </div>
  );

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={isEs ? 'Nuevo programa' : 'New program'}
      title={isEs ? 'Programa de entrenamiento' : 'Training program'}
      subtitle={
        isEs
          ? 'Define nombre, calendario y estructura base del mesociclo.'
          : 'Set name, calendar, and base mesocycle structure.'
      }
      titleId="wl-program-create-title"
      onClose={onClose}
      footer={footer}
    >
      <div className="wl-form-sheet-grid">
        <label className="wl-form-sheet-field wl-form-sheet-field--full">
          <span className="wl-form-sheet-label">{isEs ? 'Nombre del programa' : 'Program name'}</span>
          <input
            className="wl-form-sheet-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isEs ? 'Ej. Bloque de fuerza marzo' : 'e.g. March strength block'}
            autoFocus
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Fecha de inicio' : 'Start date'}</span>
          <input
            type="date"
            className="wl-form-sheet-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Fecha de término' : 'End date'}</span>
          <input
            type="date"
            className="wl-form-sheet-input wl-form-sheet-input--readonly"
            value={endDate}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Semanas' : 'Weeks'}</span>
          <WlFormNumberStepper
            value={totalWeeks}
            min={1}
            max={52}
            onChange={setTotalWeeks}
            aria-label={isEs ? 'Semanas' : 'Weeks'}
            decrementAria={isEs ? 'Menos semanas' : 'Fewer weeks'}
            incrementAria={isEs ? 'Más semanas' : 'More weeks'}
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Días por semana' : 'Days per week'}</span>
          <WlFormNumberStepper
            value={daysPerWeek}
            min={1}
            max={7}
            onChange={setDaysPerWeek}
            aria-label={isEs ? 'Días por semana' : 'Days per week'}
            decrementAria={isEs ? 'Menos días' : 'Fewer days'}
            incrementAria={isEs ? 'Más días' : 'More days'}
          />
        </label>
      </div>

      <section className="wl-form-sheet-summary" aria-live="polite">
        <p className="wl-form-sheet-summary__eyebrow">{isEs ? 'Resumen del mesociclo' : 'Mesocycle summary'}</p>
        <p className="wl-form-sheet-summary__lead">
          {isEs
            ? `${trainingDays} días de entrenamiento distribuidos en ${totalWeeks} semana${totalWeeks === 1 ? '' : 's'} (${daysPerWeek} días por semana).`
            : `${trainingDays} training days across ${totalWeeks} week${totalWeeks === 1 ? '' : 's'} (${daysPerWeek} days per week).`}
        </p>
        <ul className="wl-form-sheet-summary__list">
          <li>
            {isEs
              ? 'Después podrás ajustar semanas, días y sesiones en el editor.'
              : 'You can refine weeks, days, and sessions in the editor after creation.'}
          </li>
        </ul>
      </section>
    </WlFormSheet>
  );
};

export default WlProgramCreateSheet;
