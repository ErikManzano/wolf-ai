import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { WlFormSheet } from '../wl-shared/WlFormSheet';
import { WlFormNumberStepper } from '../wl-shared/WlFormNumberStepper';
import type { Exercise } from '../../models/training';
import { applyProgramSchedule } from '../../services/programStructureMutations';
import {
  TEMPLATE_ATHLETE,
  buildStarterProgramDraft,
  computeProgramEndDate,
  computeWeeksFromDateRange,
  formatShortDateFriendly,
  todayIsoDate,
  totalTrainingDays,
} from '../../utils/programSchedule';

const DEFAULT_DAYS_PER_WEEK = 5;

export interface WlProgramCreateSheetProps {
  isEs: boolean;
  exercises?: Exercise[];
  onClose: () => void;
  onCreate: (input: {
    name: string;
    program: ReturnType<typeof buildStarterProgramDraft>;
  }) => Promise<void>;
}

const WlProgramCreateSheet: React.FC<WlProgramCreateSheetProps> = ({
  isEs,
  exercises = [],
  onClose,
  onCreate,
}) => {
  const initialStart = todayIsoDate();
  const initialWeeks = 4;
  const [name, setName] = useState(isEs ? 'Nuevo mesociclo' : 'New mesocycle');
  const [startDate, setStartDate] = useState(initialStart);
  const [totalWeeks, setTotalWeeks] = useState(initialWeeks);
  const [endDate, setEndDate] = useState(() => computeProgramEndDate(initialStart, initialWeeks));
  const [saving, setSaving] = useState(false);

  const trainingDays = totalTrainingDays(totalWeeks, DEFAULT_DAYS_PER_WEEK);
  const endBeforeStart = Boolean(endDate && startDate && endDate < startDate);
  const canSave = name.trim().length > 0 && totalWeeks >= 1 && !endBeforeStart;

  const handleStartDateChange = (nextStart: string) => {
    if (!nextStart) return;
    setStartDate(nextStart);
    // Keep weeks; refresh end to match the new window.
    setEndDate(computeProgramEndDate(nextStart, totalWeeks));
  };

  const handleEndDateChange = (nextEnd: string) => {
    if (!nextEnd) return;
    setEndDate(nextEnd);
    if (nextEnd < startDate) return;
    setTotalWeeks(computeWeeksFromDateRange(startDate, nextEnd));
  };

  const handleWeeksChange = (weeks: number) => {
    const next = Math.max(1, Math.min(52, weeks));
    setTotalWeeks(next);
    setEndDate(computeProgramEndDate(startDate, next));
  };

  const handleSubmit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const draft = buildStarterProgramDraft(
        {
          name: name.trim(),
          startDate,
          endDate,
          totalWeeks,
          daysPerWeek: DEFAULT_DAYS_PER_WEEK,
        },
        exercises,
      );
      const program = applyProgramSchedule(
        draft,
        { startDate, endDate, totalWeeks, daysPerWeek: DEFAULT_DAYS_PER_WEEK },
        TEMPLATE_ATHLETE,
        exercises,
      );
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
      <div className="wl-form-sheet-grid wl-form-sheet-grid--single">
        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Nombre del programa' : 'Program name'}</span>
          <input
            className="wl-form-sheet-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isEs ? 'Ej. Bloque de fuerza marzo' : 'e.g. March strength block'}
            autoFocus
          />
        </label>
      </div>

      <div className="wl-form-sheet-grid wl-form-sheet-grid--calendar">
        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Fecha de inicio' : 'Start date'}</span>
          <input
            type="date"
            className="wl-form-sheet-input"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Fecha límite' : 'End date'}</span>
          <input
            type="date"
            className="wl-form-sheet-input"
            value={endDate}
            min={startDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            aria-invalid={endBeforeStart}
          />
        </label>

        <label className="wl-form-sheet-field wl-form-sheet-field--weeks">
          <span className="wl-form-sheet-label">{isEs ? 'Semanas' : 'Weeks'}</span>
          <WlFormNumberStepper
            value={totalWeeks}
            min={1}
            max={52}
            onChange={handleWeeksChange}
            aria-label={isEs ? 'Semanas' : 'Weeks'}
            decrementAria={isEs ? 'Menos semanas' : 'Fewer weeks'}
            incrementAria={isEs ? 'Más semanas' : 'More weeks'}
          />
        </label>

        {endBeforeStart ? (
          <p className="wl-form-sheet-hint wl-form-sheet-hint--error wl-form-sheet-field--full">
            {isEs
              ? 'La fecha límite no puede ser anterior al inicio.'
              : 'End date cannot be before the start date.'}
          </p>
        ) : null}
      </div>

      <section className="wl-form-sheet-summary" aria-live="polite">
        <p className="wl-form-sheet-summary__eyebrow">{isEs ? 'Resumen del mesociclo' : 'Mesocycle summary'}</p>
        <p className="wl-form-sheet-summary__lead">
          {isEs
            ? `${trainingDays} días de entrenamiento distribuidos en ${totalWeeks} semana${totalWeeks === 1 ? '' : 's'} (${DEFAULT_DAYS_PER_WEEK} días por semana).`
            : `${trainingDays} training days across ${totalWeeks} week${totalWeeks === 1 ? '' : 's'} (${DEFAULT_DAYS_PER_WEEK} days per week).`}
        </p>
        <ul className="wl-form-sheet-summary__list">
          <li>
            {isEs
              ? `Calendario: ${formatShortDateFriendly(startDate, true)} → ${formatShortDateFriendly(endDate, true)}.`
              : `Calendar: ${formatShortDateFriendly(startDate, false)} → ${formatShortDateFriendly(endDate, false)}.`}
          </li>
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
