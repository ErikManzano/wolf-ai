import React, { useMemo, useState } from 'react';
import { CalendarRange, Save } from 'lucide-react';
import type { Exercise, GeneratedProgram } from '../../models/training';
import { WlFormSheet } from '../wl-shared/WlFormSheet';
import { WlFormNumberStepper } from '../wl-shared/WlFormNumberStepper';
import {
  TEMPLATE_ATHLETE,
  calendarDaysInclusive,
  computeProgramEndDate,
  computeWeeksFromDateRange,
  formatShortDateFriendly,
  totalTrainingDays,
} from '../../utils/programSchedule';
import { applyProgramSchedule } from '../../services/programStructureMutations';

export interface WlProgramScheduleSheetProps {
  isEs: boolean;
  programName: string;
  program: GeneratedProgram;
  exercises?: Exercise[];
  onClose: () => void;
  onSave: (program: GeneratedProgram) => Promise<void>;
}

const WlProgramScheduleSheet: React.FC<WlProgramScheduleSheetProps> = ({
  isEs,
  programName,
  program,
  exercises = [],
  onClose,
  onSave,
}) => {
  const initialWeeks = Math.max(1, program.totalWeeks || program.weeks.length || 1);
  const initialDays = Math.max(1, program.daysPerWeek || program.weeks[0]?.days.length || 3);
  const initialStart = program.startDate || new Date().toISOString().slice(0, 10);
  const initialEnd = program.endDate || computeProgramEndDate(initialStart, initialWeeks);

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [totalWeeks, setTotalWeeks] = useState(initialWeeks);
  const [daysPerWeek, setDaysPerWeek] = useState(initialDays);
  const [saving, setSaving] = useState(false);

  const endBeforeStart = Boolean(endDate && startDate && endDate < startDate);
  const spanDays = useMemo(
    () => (endBeforeStart ? 0 : calendarDaysInclusive(startDate, endDate)),
    [startDate, endDate, endBeforeStart],
  );
  const trainingDays = totalTrainingDays(totalWeeks, daysPerWeek);
  const weeksFromRange = endBeforeStart ? totalWeeks : computeWeeksFromDateRange(startDate, endDate);
  const structureMismatch = weeksFromRange !== totalWeeks;

  const canSave = !endBeforeStart && totalWeeks >= 1 && daysPerWeek >= 1 && !saving;

  const handleStartChange = (next: string) => {
    if (!next) return;
    setStartDate(next);
    setEndDate(computeProgramEndDate(next, totalWeeks));
  };

  const handleEndChange = (next: string) => {
    if (!next) return;
    setEndDate(next);
    if (next < startDate) return;
    setTotalWeeks(computeWeeksFromDateRange(startDate, next));
  };

  const handleWeeksChange = (weeks: number) => {
    const next = Math.max(1, Math.min(52, weeks));
    setTotalWeeks(next);
    setEndDate(computeProgramEndDate(startDate, next));
  };

  const syncWeeksToDeadline = () => {
    if (endBeforeStart) return;
    setTotalWeeks(weeksFromRange);
  };

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const next = applyProgramSchedule(
        program,
        { startDate, endDate, totalWeeks, daysPerWeek },
        TEMPLATE_ATHLETE,
        exercises,
      );
      await onSave(next);
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
        disabled={!canSave}
        onClick={() => void handleSubmit()}
      >
        <Save size={16} aria-hidden />
        {saving
          ? isEs
            ? 'Guardando…'
            : 'Saving…'
          : isEs
            ? 'Guardar calendario'
            : 'Save schedule'}
      </button>
    </div>
  );

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={isEs ? 'Calendario competitivo' : 'Competition calendar'}
      title={isEs ? 'Fechas del programa' : 'Program dates'}
      subtitle={
        isEs
          ? `Define inicio, fecha límite y la estructura semanal de «${programName}».`
          : `Set start, deadline, and weekly structure for “${programName}”.`
      }
      titleId="wl-program-schedule-title"
      onClose={onClose}
      footer={footer}
    >
      <div className="wl-form-sheet-grid wl-form-sheet-grid--calendar">
        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Fecha de inicio' : 'Start date'}</span>
          <input
            type="date"
            className="wl-form-sheet-input"
            value={startDate}
            onChange={(e) => handleStartChange(e.target.value)}
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Semanas' : 'Weeks'}</span>
          <WlFormNumberStepper
            value={totalWeeks}
            min={1}
            max={52}
            onChange={handleWeeksChange}
            aria-label={isEs ? 'Semanas del mesociclo' : 'Mesocycle weeks'}
            decrementAria={isEs ? 'Menos semanas' : 'Fewer weeks'}
            incrementAria={isEs ? 'Más semanas' : 'More weeks'}
          />
        </label>

        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">
            {isEs ? 'Fecha límite (competición)' : 'Deadline (competition)'}
          </span>
          <input
            type="date"
            className="wl-form-sheet-input"
            value={endDate}
            min={startDate}
            onChange={(e) => handleEndChange(e.target.value)}
            aria-invalid={endBeforeStart}
          />
          {endBeforeStart ? (
            <span className="wl-form-sheet-hint wl-form-sheet-hint--error">
              {isEs
                ? 'La fecha límite no puede ser anterior al inicio.'
                : 'Deadline cannot be before the start date.'}
            </span>
          ) : (
            <span className="wl-form-sheet-hint">
              {isEs
                ? 'Tope hacia la competencia o peak.'
                : 'Competition / peak cutoff.'}
            </span>
          )}
        </label>

        <label className="wl-form-sheet-field wl-form-sheet-field--full">
          <span className="wl-form-sheet-label">{isEs ? 'Días / semana' : 'Days / week'}</span>
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
        <p className="wl-form-sheet-summary__eyebrow">
          <CalendarRange size={14} aria-hidden />{' '}
          {isEs ? 'Alineación con el calendario' : 'Calendar alignment'}
        </p>
        <p className="wl-form-sheet-summary__lead">
          {isEs
            ? `${formatShortDateFriendly(startDate, true)} → ${formatShortDateFriendly(endDate, true)} · ${spanDays} días de ventana · ${trainingDays} sesiones prescritas.`
            : `${formatShortDateFriendly(startDate, false)} → ${formatShortDateFriendly(endDate, false)} · ${spanDays}-day window · ${trainingDays} prescribed sessions.`}
        </p>
        <ul className="wl-form-sheet-summary__list">
          <li>
            {isEs
              ? `Estructura: ${totalWeeks} semana${totalWeeks === 1 ? '' : 's'} × ${daysPerWeek} día${daysPerWeek === 1 ? '' : 's'}.`
              : `Structure: ${totalWeeks} week${totalWeeks === 1 ? '' : 's'} × ${daysPerWeek} day${daysPerWeek === 1 ? '' : 's'}.`}
          </li>
          {structureMismatch ? (
            <li>
              {isEs
                ? `La ventana de fechas implica ~${weeksFromRange} semanas; el mesociclo está en ${totalWeeks}.`
                : `The date window implies ~${weeksFromRange} weeks; the mesocycle is set to ${totalWeeks}.`}{' '}
              <button
                type="button"
                className="wl-form-sheet-link"
                onClick={syncWeeksToDeadline}
              >
                {isEs ? 'Ajustar semanas a la fecha límite' : 'Match weeks to deadline'}
              </button>
            </li>
          ) : (
            <li>
              {isEs
                ? 'Semanas y fecha límite están alineadas.'
                : 'Weeks and deadline are aligned.'}
            </li>
          )}
          <li>
            {isEs
              ? 'Al guardar se crean o recortan semanas/días vacíos para coincidir con esta estructura.'
              : 'Saving adds or trims empty weeks/days to match this structure.'}
          </li>
        </ul>
      </section>
    </WlFormSheet>
  );
};

export default WlProgramScheduleSheet;
