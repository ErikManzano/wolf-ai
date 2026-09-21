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
  const initialStart = program.startDate || new Date().toISOString().slice(0, 10);
  const initialEnd = program.endDate || computeProgramEndDate(initialStart, initialWeeks);

  const daysPerWeek = useMemo(
    () =>
      Math.max(
        1,
        program.daysPerWeek,
        ...program.weeks.map((w) => w.days.length),
      ),
    [program.daysPerWeek, program.weeks],
  );

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [totalWeeks, setTotalWeeks] = useState(initialWeeks);
  const [saving, setSaving] = useState(false);

  const endBeforeStart = Boolean(endDate && startDate && endDate < startDate);
  const spanDays = useMemo(
    () => (endBeforeStart ? 0 : calendarDaysInclusive(startDate, endDate)),
    [startDate, endDate, endBeforeStart],
  );
  const trainingDays = totalTrainingDays(totalWeeks, daysPerWeek);
  const weeksFromRange = endBeforeStart ? totalWeeks : computeWeeksFromDateRange(startDate, endDate);
  const structureMismatch = weeksFromRange !== totalWeeks;

  const canSave = !endBeforeStart && totalWeeks >= 1 && !saving;

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
          ? `Define inicio, fecha límite y semanas de «${programName}». Los días se editan en el editor.`
          : `Set start, deadline, and weeks for “${programName}”. Edit days in the program editor.`
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
          <span className="wl-form-sheet-label">{isEs ? 'Fecha límite' : 'End date'}</span>
          <input
            type="date"
            className="wl-form-sheet-input"
            value={endDate}
            min={startDate}
            onChange={(e) => handleEndChange(e.target.value)}
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
            aria-label={isEs ? 'Semanas del mesociclo' : 'Mesocycle weeks'}
            decrementAria={isEs ? 'Menos semanas' : 'Fewer weeks'}
            incrementAria={isEs ? 'Más semanas' : 'More weeks'}
          />
        </label>

        {endBeforeStart ? (
          <p className="wl-form-sheet-hint wl-form-sheet-hint--error wl-form-sheet-field--full">
            {isEs
              ? 'La fecha límite no puede ser anterior al inicio.'
              : 'Deadline cannot be before the start date.'}
          </p>
        ) : null}
      </div>

      <section className="wl-form-sheet-summary wl-form-sheet-summary--compact" aria-live="polite">
        <p className="wl-form-sheet-summary__eyebrow">
          <CalendarRange size={14} aria-hidden /> {isEs ? 'Resumen' : 'Summary'}
        </p>
        <div className="wl-form-sheet-summary__stats">
          <div className="wl-form-sheet-stat">
            <span className="wl-form-sheet-stat__value">{totalWeeks}</span>
            <span className="wl-form-sheet-stat__label">{isEs ? 'Semanas' : 'Weeks'}</span>
          </div>
          <div className="wl-form-sheet-stat">
            <span className="wl-form-sheet-stat__value">{daysPerWeek}</span>
            <span className="wl-form-sheet-stat__label">{isEs ? 'Días/sem' : 'Days/wk'}</span>
          </div>
          <div className="wl-form-sheet-stat">
            <span className="wl-form-sheet-stat__value">{trainingDays}</span>
            <span className="wl-form-sheet-stat__label">{isEs ? 'Sesiones' : 'Sessions'}</span>
          </div>
          <div className="wl-form-sheet-stat">
            <span className="wl-form-sheet-stat__value">{spanDays}</span>
            <span className="wl-form-sheet-stat__label">{isEs ? 'Días ventana' : 'Window days'}</span>
          </div>
        </div>
        <p className="wl-form-sheet-summary__range">
          {formatShortDateFriendly(startDate, isEs)} → {formatShortDateFriendly(endDate, isEs)}
        </p>
        {structureMismatch ? (
          <div className="wl-form-sheet-callout wl-form-sheet-callout--warn">
            <p className="wl-form-sheet-callout__text">
              {isEs
                ? `Las fechas sugieren ${weeksFromRange} semanas; el mesociclo tiene ${totalWeeks}.`
                : `Dates suggest ${weeksFromRange} weeks; mesocycle has ${totalWeeks}.`}
            </p>
            <button type="button" className="wl-form-sheet-callout__btn" onClick={syncWeeksToDeadline}>
              {isEs ? `Usar ${weeksFromRange} semanas` : `Use ${weeksFromRange} weeks`}
            </button>
          </div>
        ) : null}
        <p className="wl-form-sheet-summary__foot">
          {isEs
            ? 'Al guardar solo se ajustan semanas vacías. Los días se editan en el editor.'
            : 'Saving only adjusts empty weeks. Edit days in the program editor.'}
        </p>
      </section>
    </WlFormSheet>
  );
};

export default WlProgramScheduleSheet;
