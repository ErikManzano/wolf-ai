import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarRange,
  Download,
  FileJson,
  Minus,
  PenLine,
  Plus,
  Table2,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { Athlete, GeneratedProgram, Session, SessionGoal } from '../models/training';
import { generatePeriodizedProgram } from '../services/programGenerator';
import {
  addDayToGeneratedWeek,
  addWeekToGeneratedProgram,
  PROGRAM_STRUCTURE_LIMITS,
  removeDayFromGeneratedWeek,
} from '../services/programStructureMutations';
import { replaceProgramSession } from '../services/sessionMutations';
import { calcularCargaTotal } from '../services/trainingEngine';
import { exportProgramAsJson } from '../services/programExport';
import {
  saveProgramEditDraft,
} from '../services/programDraftStore';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import OlympicSessionEditor from './OlympicSessionEditor';
import type { SessionCatalogProps } from './session-editor/types';
import { ProgramMatrixTable } from './session-editor/ProgramMatrixTable';
import { ProgramWeekDayNav } from './session-editor/ProgramWeekDayNav';
import { useWolfAssign } from '../context/WolfAssignContext';

const STORAGE_KEY = 'wolf_olympic_program_v1';

export interface OlympicProgramPlanCreateActions {
  generate: () => void;
  clear: () => void;
  canGenerate: boolean;
  canClear: boolean;
}

interface OlympicProgramPlanProps {
  language: 'ES' | 'EN';
  athleteId: string;
  athlete: Athlete;
  athleteForEngine: Athlete;
  primaryGoal: SessionGoal;
  program: GeneratedProgram | null;
  onProgramChange: (p: GeneratedProgram | null) => void;
  skipLocalDraftPersistence?: boolean;
  onProgramGenerated?: () => void;
  editingAssignmentId?: string | null;
  onAssignmentSynced?: (assignmentId: string) => void;
  mode?: 'full' | 'create' | 'customize' | 'assign';
  externalCreateActions?: boolean;
  onCreateActionsChange?: (actions: OlympicProgramPlanCreateActions | null) => void;
  /** Controlled plan name (e.g. from WlProgramEditor hero title). Hides inline name field. */
  programName?: string;
  onProgramNameChange?: (name: string) => void;
  /** Slot aligned to the right of Editor/Table tabs (e.g. status + enrollments). */
  customizeToolbarEnd?: React.ReactNode;
}

const PLAN_NAME_MAX_LEN = 48;

function clampStructure(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

interface ParamStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (next: number) => void;
  decrementAria: string;
  incrementAria: string;
}

const ParamStepper: React.FC<ParamStepperProps> = ({
  label,
  value,
  min,
  max,
  unit,
  onChange,
  decrementAria,
  incrementAria,
}) => (
  <div className="wolf-program-stepper">
    <span className="wolf-program-param-label">{label}</span>
    <div className="wolf-program-stepper-control">
      <button
        type="button"
        className="wolf-program-stepper-btn"
        onClick={() => onChange(clampStructure(value - 1, min, max))}
        disabled={value <= min}
        aria-label={decrementAria}
      >
        <Minus size={16} strokeWidth={2.5} aria-hidden />
      </button>
      <div className="wolf-program-stepper-value">
        <input
          type="number"
          className="wolf-program-stepper-input"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clampStructure(Number(e.target.value), min, max))}
          aria-label={label}
        />
        <span className="wolf-program-stepper-unit">{unit}</span>
      </div>
      <button
        type="button"
        className="wolf-program-stepper-btn"
        onClick={() => onChange(clampStructure(value + 1, min, max))}
        disabled={value >= max}
        aria-label={incrementAria}
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  </div>
);

const OlympicProgramPlan: React.FC<OlympicProgramPlanProps> = ({
  language,
  athleteId,
  athlete,
  athleteForEngine,
  primaryGoal,
  program,
  onProgramChange,
  skipLocalDraftPersistence = false,
  onProgramGenerated,
  editingAssignmentId = null,
  onAssignmentSynced,
  mode = 'full',
  externalCreateActions = false,
  onCreateActionsChange,
  programName: programNameProp,
  onProgramNameChange,
  customizeToolbarEnd,
}) => {
  const isEs = language === 'ES';
  const recommendedConfig = useMemo(() => {
    if (athleteForEngine.level === 'advanced') return { weeks: 12 as const, days: 5 as const };
    if (athleteForEngine.level === 'intermediate') return { weeks: 8 as const, days: 4 as const };
    return { weeks: 4 as const, days: 3 as const };
  }, [athleteForEngine.level]);

  const [totalWeeks, setTotalWeeks] = useState<number>(recommendedConfig.weeks);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(recommendedConfig.days);

  useEffect(() => {
    setTotalWeeks(recommendedConfig.weeks);
    setDaysPerWeek(recommendedConfig.days);
  }, [recommendedConfig.weeks, recommendedConfig.days]);

  const [planNameInternal, setPlanNameInternal] = useState('');
  const isNameControlled = programNameProp !== undefined;
  const planName = isNameControlled ? programNameProp : planNameInternal;
  const setPlanName = isNameControlled
    ? (value: string) => onProgramNameChange?.(value)
    : setPlanNameInternal;
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [sessionEditorView, setSessionEditorView] = useState<'sheet' | 'exercise'>('sheet');
  const [customizeSubview, setCustomizeSubview] = useState<'editor' | 'table'>('editor');

  useEffect(() => {
    setSessionEditorView('sheet');
  }, [selectedWeek, selectedDay]);
  const [assignFlash, setAssignFlash] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const programRef = useRef(program);
  const { assignProgramToAthlete, motorExercises, sessionExercisePicker, sessionExercisePickerSingles } =
    useWolfAssign();

  const sessionCatalog = useMemo<SessionCatalogProps>(
    () => ({
      pickerOptions: sessionExercisePicker,
      pickerSingles: sessionExercisePickerSingles,
    }),
    [sessionExercisePicker, sessionExercisePickerSingles],
  );

  useEffect(() => {
    programRef.current = program;
  }, [program]);

  const showCreate = mode === 'full' || mode === 'create';
  const showCustomize = mode === 'full' || mode === 'customize';
  const showAssign = mode === 'full' || mode === 'assign';

  const t = useMemo(
    () => ({
      title: isEs ? 'Mesociclo' : 'Mesocycle',
      weeks: isEs ? 'Semanas' : 'Weeks',
      days: isEs ? 'Dias / semana' : 'Days / week',
      name: isEs ? 'Nombre del plan' : 'Plan name',
      generate: isEs ? 'Generar programa completo' : 'Generate full program',
      clear: isEs ? 'Vaciar' : 'Clear',
      assign: isEs ? 'Asignar al atleta' : 'Assign to athlete',
      copyJson: isEs ? 'Copiar JSON' : 'Copy JSON',
      download: isEs ? 'Descargar .json' : 'Download .json',
      assignedOk: isEs ? `Plan asignado a ${athlete.name}.` : `Plan assigned to ${athlete.name}.`,
      structureLabel: isEs ? 'Estructura del bloque' : 'Block structure',
      manualConfig: isEs ? 'Configuración del plan' : 'Plan setup',
      weekUnit: isEs ? 'sem' : 'wk',
      dayUnit: isEs ? 'días/sem' : 'd/wk',
      sessionsTotal: isEs ? 'sesiones totales' : 'total sessions',
      decWeeks: isEs ? 'Menos semanas' : 'Fewer weeks',
      incWeeks: isEs ? 'Más semanas' : 'More weeks',
      decDays: isEs ? 'Menos días por semana' : 'Fewer days per week',
      incDays: isEs ? 'Más días por semana' : 'More days per week',
      nameError: isEs ? `Máximo ${PLAN_NAME_MAX_LEN} caracteres.` : `Maximum ${PLAN_NAME_MAX_LEN} characters.`,
      noProgramYet: isEs ? 'Aún no hay programa generado.' : 'No program generated yet.',
      weekDayNav: isEs ? 'Semana y día' : 'Week & day',
      matrixWeekCol: isEs ? 'Semana' : 'Week',
      matrixEmpty: isEs ? 'Sin ejercicios' : 'No exercises',
      matrixOverview: isEs
        ? 'Toca una celda para abrir ese día en el editor'
        : 'Tap a cell to open that day in the editor',
      customizeViewLabel: isEs ? 'Vista del plan' : 'Plan view',
      customizeViewEditor: isEs ? 'Editor' : 'Editor',
      customizeViewTable: isEs ? 'Tabla' : 'Grid',
      weeksRow: isEs ? 'Semanas' : 'Weeks',
      daysRow: isEs ? 'Días' : 'Days',
      addWeek: isEs ? 'Añadir semana' : 'Add week',
      addDay: isEs ? 'Añadir día' : 'Add day',
      removeWeek: isEs ? 'Quitar semana' : 'Remove week',
      removeDay: isEs ? 'Quitar día' : 'Remove day',
      dayLabelAria: isEs ? 'Nombre del día' : 'Day label',
      confirmRemoveWeek: isEs ? '¿Eliminar esta semana y todas sus sesiones?' : 'Remove this week and all its sessions?',
      confirmRemoveDay: isEs ? '¿Eliminar este día y su sesión?' : 'Remove this day and its session?',
      maxWeeks: isEs
        ? `Máximo ${PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS} semanas.`
        : `Maximum ${PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS} weeks.`,
      maxDays: isEs
        ? `Máximo ${PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK} días por semana.`
        : `Maximum ${PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK} days per week.`,
    }),
    [isEs, athlete.name],
  );

  const trimmedPlanName = useMemo(() => planName.trim(), [planName]);
  const hasPlanNameError = planName.length > PLAN_NAME_MAX_LEN;
  const hasPlanName = trimmedPlanName.length > 0;
  const canGenerate = !hasPlanNameError && hasPlanName;

  const totalSessions = totalWeeks * daysPerWeek;

  const persist = useCallback(
    (p: GeneratedProgram | null) => {
      if (!skipLocalDraftPersistence) {
        try {
          if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
          else localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
      onProgramChange(p);
      setSyncPending(false);
    },
    [onProgramChange, skipLocalDraftPersistence],
  );

  const persistStorageOnly = useCallback(
    (p: GeneratedProgram) => {
      if (skipLocalDraftPersistence) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      } catch {
        /* ignore */
      }
      setSyncPending(false);
    },
    [skipLocalDraftPersistence],
  );

  const debouncedStoragePersist = useDebouncedCallback((p: GeneratedProgram) => {
    persistStorageOnly(p);
  }, 450);

  const writeEditDraft = useCallback(
    (p: GeneratedProgram) => {
      const savedAt = new Date().toISOString();
      saveProgramEditDraft({
        program: p,
        athleteId,
        selectedWeek,
        selectedDay,
        assignmentId: editingAssignmentId,
        savedAt,
      });
      setDraftSavedAt(savedAt);
    },
    [athleteId, selectedWeek, selectedDay, editingAssignmentId],
  );

  const flushLocalSave = useCallback(() => {
    const p = programRef.current;
    if (!p || skipLocalDraftPersistence) return;
    persistStorageOnly(p);
    setSyncPending(false);
  }, [persistStorageOnly, skipLocalDraftPersistence]);

  useEffect(() => {
    if (!showCustomize) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      flushLocalSave();
      if (syncPending) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushLocalSave();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [showCustomize, syncPending, flushLocalSave]);

  const handleGenerate = useCallback(() => {
    if (!canGenerate) return;
    const p = generatePeriodizedProgram({
      athleteId,
      athlete: athleteForEngine,
      exercises: motorExercises,
      totalWeeks,
      daysPerWeek,
      primaryGoal,
      programName: trimmedPlanName,
    });
    setSelectedWeek(1);
    setSelectedDay(1);
    onProgramGenerated?.();
    persist(p);
  }, [athleteId, athleteForEngine, totalWeeks, daysPerWeek, primaryGoal, trimmedPlanName, onProgramGenerated, persist, canGenerate, motorExercises]);

  const handleClearProgram = useCallback(() => {
    persist(null);
  }, [persist]);

  useEffect(() => {
    if (!externalCreateActions || !showCreate) {
      onCreateActionsChange?.(null);
      return;
    }
    onCreateActionsChange?.({
      generate: handleGenerate,
      clear: handleClearProgram,
      canGenerate,
      canClear: Boolean(program),
    });
    return () => onCreateActionsChange?.(null);
  }, [
    externalCreateActions,
    showCreate,
    handleGenerate,
    handleClearProgram,
    canGenerate,
    program,
    onCreateActionsChange,
  ]);

  const applyProgramUpdate = useCallback(
    (next: GeneratedProgram, selection?: { week?: number; day?: number }) => {
      programRef.current = next;
      if (selection?.week != null) setSelectedWeek(selection.week);
      if (selection?.day != null) setSelectedDay(selection.day);
      onProgramChange(next);
      writeEditDraft(next);
      if (!skipLocalDraftPersistence) {
        setSyncPending(true);
        debouncedStoragePersist(next);
      }
    },
    [onProgramChange, writeEditDraft, debouncedStoragePersist, skipLocalDraftPersistence],
  );

  const handleSessionEdit = useCallback(
    (s: Session) => {
      const current = programRef.current;
      if (!current) return;
      applyProgramUpdate(replaceProgramSession(current, selectedWeek, selectedDay, s));
    },
    [selectedWeek, selectedDay, applyProgramUpdate],
  );

  useEffect(() => {
    if (!program?.weeks.length) return;
    const week = program.weeks.find((w) => w.weekNumber === selectedWeek);
    if (!week) {
      const fallbackWeek = program.weeks[program.weeks.length - 1]!.weekNumber;
      setSelectedWeek(fallbackWeek);
      setSelectedDay(1);
      return;
    }
    if (!week.days.some((d) => d.dayNumber === selectedDay)) {
      setSelectedDay(week.days[week.days.length - 1]?.dayNumber ?? 1);
    }
  }, [program, selectedWeek, selectedDay]);

  const selectedWeekData = useMemo(
    () => program?.weeks.find((w) => w.weekNumber === selectedWeek),
    [program, selectedWeek],
  );

  const weekTonnages = useMemo(() => {
    if (!program?.weeks.length) return {};
    const map: Record<number, number> = {};
    for (const w of program.weeks) {
      map[w.weekNumber] = w.days.reduce(
        (sum, day) => sum + calcularCargaTotal(day.session, athleteForEngine, motorExercises),
        0,
      );
    }
    return map;
  }, [program, athleteForEngine, motorExercises]);

  const canAddWeek = (program?.weeks.length ?? 0) < PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS;
  const canAddDay = (selectedWeekData?.days.length ?? 0) < PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK;
  const canRemoveDay =
    (selectedWeekData?.days.length ?? 0) > PROGRAM_STRUCTURE_LIMITS.MIN_DAYS_PER_WEEK;

  const handleAddWeek = useCallback(() => {
    const current = programRef.current;
    if (!current || !canAddWeek) return;
    const next = addWeekToGeneratedProgram(current, athleteForEngine, motorExercises);
    applyProgramUpdate(next, { week: next.weeks[next.weeks.length - 1]!.weekNumber, day: 1 });
  }, [athleteForEngine, motorExercises, canAddWeek, applyProgramUpdate]);

  const handleAddDay = useCallback(() => {
    const current = programRef.current;
    if (!current || !canAddDay) return;
    const week = current.weeks.find((w) => w.weekNumber === selectedWeek);
    if (!week) return;
    const next = addDayToGeneratedWeek(current, selectedWeek, athleteForEngine, motorExercises);
    const updatedWeek = next.weeks.find((w) => w.weekNumber === selectedWeek);
    const newDay = updatedWeek?.days[updatedWeek.days.length - 1]?.dayNumber ?? 1;
    applyProgramUpdate(next, { day: newDay });
  }, [selectedWeek, athleteForEngine, motorExercises, canAddDay, applyProgramUpdate]);

  const handleRemoveDay = useCallback(
    (dayNumber: number) => {
      const current = programRef.current;
      if (!current || !canRemoveDay) return;
      const weekBefore = current.weeks.find((w) => w.weekNumber === selectedWeek);
      if (!weekBefore) return;
      const removedIndex = weekBefore.days.findIndex((d) => d.dayNumber === dayNumber);
      const selectedIndex = weekBefore.days.findIndex((d) => d.dayNumber === selectedDay);
      const next = removeDayFromGeneratedWeek(current, selectedWeek, dayNumber);
      if (next === current) return;
      const weekAfter = next.weeks.find((w) => w.weekNumber === selectedWeek);
      let newIndex = selectedIndex;
      if (removedIndex === selectedIndex) {
        newIndex = Math.min(removedIndex, (weekAfter?.days.length ?? 1) - 1);
      } else if (removedIndex < selectedIndex) {
        newIndex = selectedIndex - 1;
      }
      const newDay = weekAfter?.days[newIndex]?.dayNumber ?? 1;
      applyProgramUpdate(next, { day: newDay });
    },
    [selectedWeek, selectedDay, canRemoveDay, applyProgramUpdate],
  );

  const handleAssignAthlete = useCallback(async () => {
    if (!program) return;
    try {
      const id = await assignProgramToAthlete(program, athleteId);
      onAssignmentSynced?.(id);
      setAssignFlash(true);
      window.setTimeout(() => setAssignFlash(false), 2400);
    } catch {
      /* alerta mostrada en el provider */
    }
  }, [program, athleteId, assignProgramToAthlete, onAssignmentSynced]);

  const daySession = useMemo(() => {
    if (!program) return null;
    const w = program.weeks.find((x) => x.weekNumber === selectedWeek);
    const d = w?.days.find((x) => x.dayNumber === selectedDay);
    return d?.session ?? null;
  }, [program, selectedWeek, selectedDay]);

  const selectedDayLabel = useMemo(() => {
    if (!program) return undefined;
    const w = program.weeks.find((x) => x.weekNumber === selectedWeek);
    return w?.days.find((x) => x.dayNumber === selectedDay)?.label;
  }, [program, selectedWeek, selectedDay]);

  const copyJson = useCallback(async () => {
    if (!program) return;
    await navigator.clipboard.writeText(exportProgramAsJson(program));
  }, [program]);

  const downloadJson = useCallback(() => {
    if (!program) return;
    const blob = new Blob([exportProgramAsJson(program)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${program.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [program]);

  return (
    <div className={`wolf-program-plan${showCustomize && !showCreate ? ' wolf-program-plan--edit' : ''}`}>
      {showCreate && (
        <header className="wolf-program-meso-head">
          <h2 className="wolf-program-meso-title">{t.title}</h2>
        </header>
      )}

      {editingAssignmentId && (showCustomize || showAssign) && (
        <div className="wolf-program-edit-banner" role="status">
          {isEs ? 'Editando plan ya asignado.' : 'Editing assigned plan.'}
        </div>
      )}

      {showCreate && (
        <>
          {!isNameControlled ? (
            <label className="wolf-program-title-field">
              <span className="wolf-program-title-label">{t.name}</span>
              <input
                className="wolf-program-title-input"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                maxLength={PLAN_NAME_MAX_LEN + 4}
                placeholder={isEs ? 'Ej. Mesociclo fuerza' : 'E.g. Strength block'}
                aria-invalid={hasPlanNameError || (nameTouched && !hasPlanName)}
                aria-required="true"
              />
              {hasPlanNameError && nameTouched ? (
                <small className="wolf-program-help wolf-program-help--error">{t.nameError}</small>
              ) : nameTouched && !hasPlanName ? (
                <small className="wolf-program-help wolf-program-help--error">
                  {isEs ? 'El nombre del plan es obligatorio.' : 'Plan name is required.'}
                </small>
              ) : null}
            </label>
          ) : null}
          <div className="wolf-program-gen-card wolf-program-gen-card--primary">
            <div className="wolf-program-structure-summary" aria-live="polite">
              <span className="wolf-program-structure-summary-label">{t.structureLabel}</span>
              <div className="wolf-program-structure-stats">
                <span className="wolf-program-structure-stat">
                  <strong>{totalWeeks}</strong>
                  <small>{t.weekUnit}</small>
                </span>
                <span className="wolf-program-structure-sep" aria-hidden>
                  ×
                </span>
                <span className="wolf-program-structure-stat">
                  <strong>{daysPerWeek}</strong>
                  <small>{t.dayUnit}</small>
                </span>
                <span className="wolf-program-structure-eq" aria-hidden>
                  =
                </span>
                <span className="wolf-program-structure-total">
                  <strong>{totalSessions}</strong>
                  <small>{t.sessionsTotal}</small>
                </span>
              </div>
            </div>

            <section className="wolf-program-manual" aria-label={t.manualConfig}>
              <div className="wolf-program-params-grid">
                <ParamStepper
                  label={t.weeks}
                  value={totalWeeks}
                  min={PROGRAM_STRUCTURE_LIMITS.MIN_WEEKS}
                  max={PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS}
                  unit={t.weekUnit}
                  onChange={setTotalWeeks}
                  decrementAria={t.decWeeks}
                  incrementAria={t.incWeeks}
                />
                <ParamStepper
                  label={t.days}
                  value={daysPerWeek}
                  min={PROGRAM_STRUCTURE_LIMITS.MIN_DAYS_PER_WEEK}
                  max={PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK}
                  unit={t.dayUnit}
                  onChange={setDaysPerWeek}
                  decrementAria={t.decDays}
                  incrementAria={t.incDays}
                />
              </div>
              {!externalCreateActions ? (
                <div className="wolf-program-cta-row">
                  <button
                    type="button"
                    className="btn-primary wolf-program-generate-btn"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                  >
                    <CalendarRange size={18} strokeWidth={2} aria-hidden />
                    {t.generate}
                  </button>
                  <button
                    type="button"
                    className="wolf-program-clear-btn"
                    onClick={handleClearProgram}
                    disabled={!program}
                  >
                    <Trash2 size={15} strokeWidth={2} aria-hidden />
                    {t.clear}
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}

      {!program && !showCreate && (
        <div className="wolf-program-empty-card">
          <p className="wolf-program-empty-lead">{t.noProgramYet}</p>
        </div>
      )}

      {program && showAssign && (
        <div className="wolf-program-live-card">
          <div className="wolf-program-meta">
            <strong>{program.name}</strong>
            <span className="muted">
              {program.totalWeeks}w · {program.daysPerWeek}d/w
            </span>
          </div>
          <div className="wolf-program-export">
            <button type="button" className="btn-primary" onClick={handleAssignAthlete}>
              <UserPlus size={16} /> {t.assign}
            </button>
            <button type="button" className="btn-secondary" onClick={copyJson}>
              <FileJson size={16} /> {t.copyJson}
            </button>
            <button type="button" className="btn-secondary" onClick={downloadJson}>
              <Download size={16} /> {t.download}
            </button>
          </div>
          {assignFlash && <p className="wolf-program-assign-flash">{t.assignedOk}</p>}
        </div>
      )}

      {program && showCustomize && (
        <div
          className={`wolf-program-customize-layout wolf-program-customize-layout--${customizeSubview}`}
        >
          <div className="wolf-program-customize-toolbar">
            <div
              className="wolf-program-customize-tabs"
              role="tablist"
              aria-label={t.customizeViewLabel}
            >
              <button
                type="button"
                role="tab"
                id="wolf-program-tab-editor"
                aria-selected={customizeSubview === 'editor'}
                aria-controls="wolf-program-panel-editor"
                className={`wolf-program-customize-tab${customizeSubview === 'editor' ? ' is-active' : ''}`}
                onClick={() => setCustomizeSubview('editor')}
              >
                <PenLine size={14} aria-hidden />
                {t.customizeViewEditor}
              </button>
              <button
                type="button"
                role="tab"
                id="wolf-program-tab-table"
                aria-selected={customizeSubview === 'table'}
                aria-controls="wolf-program-panel-table"
                className={`wolf-program-customize-tab${customizeSubview === 'table' ? ' is-active' : ''}`}
                onClick={() => setCustomizeSubview('table')}
              >
                <Table2 size={14} aria-hidden />
                {t.customizeViewTable}
              </button>
            </div>
            {customizeToolbarEnd ? (
              <div className="wolf-program-customize-toolbar-end">{customizeToolbarEnd}</div>
            ) : null}
          </div>

          {customizeSubview === 'table' ? (
            <div
              id="wolf-program-panel-table"
              role="tabpanel"
              aria-labelledby="wolf-program-tab-table"
              className="wolf-program-customize-panel wolf-program-customize-panel--table"
            >
              <ProgramMatrixTable
                program={program}
                exercises={motorExercises}
                selectedWeek={selectedWeek}
                selectedDay={selectedDay}
                isEs={isEs}
                weekTonnages={weekTonnages}
                expanded
                exportTitle={planName.trim() || program?.name?.trim() || undefined}
                labels={{
                  weekCol: t.matrixWeekCol,
                  emptyCell: t.matrixEmpty,
                  overviewHint: t.matrixOverview,
                }}
                onSelectCell={(weekNumber, dayNumber) => {
                  setSelectedWeek(weekNumber);
                  setSelectedDay(dayNumber);
                  setCustomizeSubview('editor');
                }}
              />
            </div>
          ) : (
            <div
              id="wolf-program-panel-editor"
              role="tabpanel"
              aria-labelledby="wolf-program-tab-editor"
              className="wolf-program-customize-panel wolf-program-customize-panel--editor"
            >
              <div
                className={`wolf-program-day-board${sessionEditorView === 'exercise' ? ' wolf-program-day-board--exercise-focus' : ''}`}
              >
                {sessionEditorView === 'sheet' ? (
                  <ProgramWeekDayNav
                    program={program}
                    selectedWeek={selectedWeek}
                    selectedDay={selectedDay}
                    selectedWeekData={selectedWeekData}
                    isEs={isEs}
                    weekTonnages={weekTonnages}
                    canAddWeek={canAddWeek}
                    canAddDay={canAddDay}
                    labels={{
                      weeksRow: t.weeksRow,
                      daysRow: t.daysRow,
                      addWeek: t.addWeek,
                      addDay: t.addDay,
                      maxWeeks: t.maxWeeks,
                      maxDays: t.maxDays,
                      removeDay: t.removeDay,
                    }}
                    canRemoveDay={canRemoveDay}
                    onSelectWeek={(weekNumber) => {
                      setSelectedWeek(weekNumber);
                      setSelectedDay(1);
                    }}
                    onSelectDay={setSelectedDay}
                    onAddWeek={handleAddWeek}
                    onAddDay={handleAddDay}
                    onRemoveDay={handleRemoveDay}
                  />
                ) : null}
                {daySession ? (
                  <OlympicSessionEditor
                    key={`${selectedWeek}-${selectedDay}`}
                    session={daySession}
                    athlete={athleteForEngine}
                    exercises={motorExercises}
                    catalog={sessionCatalog}
                    isEs={isEs}
                    onChange={handleSessionEdit}
                    draftSavedAt={draftSavedAt}
                    syncPending={syncPending}
                    dayLabel={selectedDayLabel}
                    weekNumber={selectedWeek}
                    dayNumber={selectedDay}
                    embedded
                    onViewChange={setSessionEditorView}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OlympicProgramPlan;
