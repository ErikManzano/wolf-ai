import React, { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { WlFormSheet } from '../wl-shared/WlFormSheet';
import { WlFormNumberStepper } from '../wl-shared/WlFormNumberStepper';
import type { CoachProgramRow } from '../../models/coach-architecture';
import type { Athlete, Exercise, GeneratedProgram } from '../../models/training';
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

export type WlProgramCreateSubmit =
  | { mode: 'reusable'; name: string; program: GeneratedProgram }
  | { mode: 'athlete_new'; athleteProfileId: string; name: string; program: GeneratedProgram }
  | { mode: 'athlete_from_template'; athleteProfileId: string; coachProgramId: string };

export interface WlProgramCreateSheetProps {
  isEs: boolean;
  exercises?: Exercise[];
  athletes: Athlete[];
  templates: CoachProgramRow[];
  onClose: () => void;
  onSubmit: (payload: WlProgramCreateSubmit) => Promise<void>;
}

type CreateIntent = 'athlete' | 'reusable';

const WlProgramCreateSheet: React.FC<WlProgramCreateSheetProps> = ({
  isEs,
  exercises = [],
  athletes,
  templates,
  onClose,
  onSubmit,
}) => {
  const initialStart = todayIsoDate();
  const initialWeeks = 4;
  const [intent, setIntent] = useState<CreateIntent>('reusable');
  const [athleteProfileId, setAthleteProfileId] = useState('');
  const [fromExistingTemplate, setFromExistingTemplate] = useState(false);
  const [coachProgramId, setCoachProgramId] = useState('');
  const [name, setName] = useState(isEs ? 'Nuevo mesociclo' : 'New mesocycle');
  const [startDate, setStartDate] = useState(initialStart);
  const [totalWeeks, setTotalWeeks] = useState(initialWeeks);
  const [endDate, setEndDate] = useState(() => computeProgramEndDate(initialStart, initialWeeks));
  const [saving, setSaving] = useState(false);

  const assignFromTemplateOnly =
    intent === 'athlete' && fromExistingTemplate && coachProgramId.length > 0;

  const showCalendarStep = intent === 'reusable' || (intent === 'athlete' && !assignFromTemplateOnly);

  const trainingDays = totalTrainingDays(totalWeeks, DEFAULT_DAYS_PER_WEEK);
  const endBeforeStart = Boolean(endDate && startDate && endDate < startDate);

  const canSave = useMemo(() => {
    if (intent === 'athlete' && !athleteProfileId) return false;
    if (assignFromTemplateOnly) return true;
    return name.trim().length > 0 && totalWeeks >= 1 && !endBeforeStart;
  }, [intent, athleteProfileId, assignFromTemplateOnly, name, totalWeeks, endBeforeStart]);

  const handleStartDateChange = (nextStart: string) => {
    if (!nextStart) return;
    setStartDate(nextStart);
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
      if (assignFromTemplateOnly) {
        await onSubmit({
          mode: 'athlete_from_template',
          athleteProfileId,
          coachProgramId,
        });
        onClose();
        return;
      }

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

      if (intent === 'reusable') {
        await onSubmit({ mode: 'reusable', name: name.trim(), program });
      } else {
        await onSubmit({
          mode: 'athlete_new',
          athleteProfileId,
          name: name.trim(),
          program,
        });
      }
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
        {saving
          ? isEs
            ? 'Creando…'
            : 'Creating…'
          : isEs
            ? 'Crear programa'
            : 'Create program'}
      </button>
    </div>
  );

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={isEs ? 'Nuevo programa' : 'New program'}
      title={isEs ? '¿Para quién es este programa?' : 'Who is this program for?'}
      subtitle={
        isEs
          ? 'Elige si es para un atleta o una base que reutilizarás con varios.'
          : 'Choose an athlete-specific plan or a reusable base for many athletes.'
      }
      titleId="wl-program-create-title"
      onClose={onClose}
      footer={footer}
    >
      <fieldset className="wl-program-create-intent">
        <legend className="wl-form-sheet-label">{isEs ? 'Destino' : 'Destination'}</legend>
        <label className="wl-program-create-intent__option">
          <input
            type="radio"
            name="create-intent"
            checked={intent === 'athlete'}
            onChange={() => setIntent('athlete')}
          />
          <span>{isEs ? 'Para un atleta específico' : 'For a specific athlete'}</span>
        </label>
        {intent === 'athlete' ? (
          <label className="wl-form-sheet-field wl-program-create-intent__nested">
            <span className="wl-form-sheet-label">{isEs ? 'Atleta' : 'Athlete'}</span>
            <select
              className="wl-form-sheet-input"
              value={athleteProfileId}
              onChange={(e) => setAthleteProfileId(e.target.value)}
            >
              <option value="">{isEs ? 'Seleccionar atleta…' : 'Select athlete…'}</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="wl-program-create-intent__option">
          <input
            type="radio"
            name="create-intent"
            checked={intent === 'reusable'}
            onChange={() => {
              setIntent('reusable');
              setFromExistingTemplate(false);
            }}
          />
          <span>
            {isEs
              ? 'Como base reutilizable (asignarás a varios atletas después)'
              : 'As a reusable base (assign to multiple athletes later)'}
          </span>
        </label>
      </fieldset>

      {intent === 'athlete' && templates.length > 0 ? (
        <div className="wl-program-create-from-template">
          <label className="wl-program-create-intent__option">
            <input
              type="checkbox"
              checked={fromExistingTemplate}
              onChange={(e) => setFromExistingTemplate(e.target.checked)}
            />
            <span>{isEs ? 'A partir de una plantilla existente' : 'From an existing template'}</span>
          </label>
          {fromExistingTemplate ? (
            <label className="wl-form-sheet-field">
              <span className="wl-form-sheet-label">{isEs ? 'Plantilla' : 'Template'}</span>
              <select
                className="wl-form-sheet-input"
                value={coachProgramId}
                onChange={(e) => setCoachProgramId(e.target.value)}
              >
                <option value="">{isEs ? 'Elegir plantilla…' : 'Choose template…'}</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {showCalendarStep ? (
        <>
          <div className="wl-form-sheet-grid wl-form-sheet-grid--single">
            <label className="wl-form-sheet-field">
              <span className="wl-form-sheet-label">{isEs ? 'Nombre del programa' : 'Program name'}</span>
              <input
                className="wl-form-sheet-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEs ? 'Ej. Bloque de fuerza marzo' : 'e.g. March strength block'}
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

          <section className="wl-form-sheet-summary wl-form-sheet-summary--compact" aria-live="polite">
            <p className="wl-form-sheet-summary__eyebrow">{isEs ? 'Resumen' : 'Summary'}</p>
            <div className="wl-form-sheet-summary__stats">
              <div className="wl-form-sheet-stat">
                <span className="wl-form-sheet-stat__value">{totalWeeks}</span>
                <span className="wl-form-sheet-stat__label">{isEs ? 'Semanas' : 'Weeks'}</span>
              </div>
              <div className="wl-form-sheet-stat">
                <span className="wl-form-sheet-stat__value">{DEFAULT_DAYS_PER_WEEK}</span>
                <span className="wl-form-sheet-stat__label">{isEs ? 'Días/sem' : 'Days/wk'}</span>
              </div>
              <div className="wl-form-sheet-stat">
                <span className="wl-form-sheet-stat__value">{trainingDays}</span>
                <span className="wl-form-sheet-stat__label">{isEs ? 'Sesiones' : 'Sessions'}</span>
              </div>
            </div>
            <p className="wl-form-sheet-summary__range">
              {formatShortDateFriendly(startDate, isEs)} → {formatShortDateFriendly(endDate, isEs)}
            </p>
          </section>
        </>
      ) : null}
    </WlFormSheet>
  );
};

export default WlProgramCreateSheet;
