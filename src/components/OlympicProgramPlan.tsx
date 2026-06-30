import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarRange,
  Copy,
  Download,
  FileJson,
  Minus,
  PenLine,
  Plus,
  Redo2,
  BarChart3,
  Table2,
  Trash2,
  Undo2,
  UserPlus,
} from 'lucide-react';
import type { Athlete, GeneratedProgram, Session, SessionGoal } from '../models/training';
import { generatePeriodizedProgram } from '../services/programGenerator';
import {
  addDayToGeneratedWeek,
  duplicateDayInGeneratedWeek,
  addWeekToGeneratedProgram,
  PROGRAM_STRUCTURE_LIMITS,
  removeDayFromGeneratedWeek,
  removeWeekFromGeneratedProgram,
  reorderDaysInGeneratedWeek,
  reorderWeeksInGeneratedProgram,
  resolveDayNumberAfterDayReorder,
  resolveWeekNumberAfterWeekReorder,
  swapProgramDaySlots,
  type ProgramDaySlot,
} from '../services/programStructureMutations';
import { replaceProgramSession, refreshSession } from '../services/sessionMutations';
import { calcularCargaTotal } from '../services/trainingEngine';
import { exportProgramAsJson } from '../services/programExport';
import {
  saveProgramEditDraft,
} from '../services/programDraftStore';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { useProgramHistory } from '../hooks/useProgramHistory';
import OlympicSessionEditor, { type SessionEditorView } from './OlympicSessionEditor';
import type { SessionCatalogProps } from './session-editor/types';
import { ProgramMatrixTable } from './session-editor/ProgramMatrixTable';
import { ProgramWeekDayNav } from './session-editor/ProgramWeekDayNav';
import {
  ProgramStatsScopeControls,
  type ProgramStatsScope,
} from './session-editor/ProgramDayBoardTabs';
import { SessionDayStatsPanel } from './session-editor/SessionDayStatsPanel';
import { SessionWeekStatsPanel } from './session-editor/SessionWeekStatsPanel';
import { SessionProgramStatsPanel } from './session-editor/SessionProgramStatsPanel';
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
  onProgramChange: (p: GeneratedProgram | null, editContext?: { weekNumber: number; dayNumber: number; dayLabel?: string }) => void;
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
  /** When set, renders Editor/Table toolbar into this element (desktop sticky header). */
  customizeToolbarPortalId?: string | null;
  /** Flush pending autosave (e.g. before week/day navigation). */
  onFlushAutosave?: () => void;
  /** Coach program id — resolves assignment for execution stats on enrolled athletes. */
  coachProgramId?: string;
  /** API autosave state (WlProgramEditor). */
  programSyncState?: import('./wl-programs/programSync').ProgramSyncState;
  lastSavedAt?: string | null;
  onRetryProgramSave?: () => void;
  /** Sync block-count baseline when coach switches week/day (autosave). */
  onActiveDayContext?: (ctx: { weekNumber: number; dayNumber: number }) => void;
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
  customizeToolbarPortalId = null,
  onFlushAutosave,
  coachProgramId,
  programSyncState,
  lastSavedAt = null,
  onRetryProgramSave,
  onActiveDayContext,
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
  const [sessionEditorView, setSessionEditorView] = useState<SessionEditorView>('sheet');
  const [statsScope, setStatsScope] = useState<ProgramStatsScope>('day');
  const [customizeSubview, setCustomizeSubview] = useState<'editor' | 'table' | 'stats'>('editor');
  const [toolbarPortalNode, setToolbarPortalNode] = useState<HTMLElement | null>(null);
  const navFlushEpochRef = useRef(0);
  const skipNavFlushRef = useRef(true);

  useLayoutEffect(() => {
    if (!customizeToolbarPortalId) {
      setToolbarPortalNode(null);
      return;
    }
    setToolbarPortalNode(document.getElementById(customizeToolbarPortalId));
  }, [customizeToolbarPortalId, program]);

  useEffect(() => {
    setSessionEditorView('sheet');
  }, [selectedWeek, selectedDay]);

  useEffect(() => {
    if (!program || !onActiveDayContext) return;
    onActiveDayContext({ weekNumber: selectedWeek, dayNumber: selectedDay });
  }, [program, selectedWeek, selectedDay, onActiveDayContext]);
  const [assignFlash, setAssignFlash] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const programRef = useRef(program);
  const selectedWeekRef = useRef(selectedWeek);
  const selectedDayRef = useRef(selectedDay);
  selectedWeekRef.current = selectedWeek;
  selectedDayRef.current = selectedDay;
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHistoryRef = useRef<GeneratedProgram | null>(null);
  const { assignProgramToAthlete, motorExercises, sessionExercisePicker, sessionExercisePickerSingles, assignments, completions, setLogs } =
    useWolfAssign();

  const sessionCatalog = useMemo<SessionCatalogProps>(
    () => ({
      pickerOptions: sessionExercisePicker,
      pickerSingles: sessionExercisePickerSingles,
    }),
    [sessionExercisePicker, sessionExercisePickerSingles],
  );

  const statsAssignmentId = useMemo(() => {
    if (editingAssignmentId) return editingAssignmentId;
    if (!coachProgramId || !athleteId) return null;
    return (
      assignments.find(
        (a) => a.coachProgramId === coachProgramId && a.athleteProfileId === athleteId,
      )?.id ?? null
    );
  }, [editingAssignmentId, coachProgramId, athleteId, assignments]);

  const statsExecutionContext = useMemo(
    () => ({
      assignmentId: statsAssignmentId,
      completions,
      setLogs,
    }),
    [statsAssignmentId, completions, setLogs],
  );

  useEffect(() => {
    programRef.current = program;
  }, [program]);

  const {
    canUndo,
    canRedo,
    resetHistory,
    recordSnapshot,
    undo,
    redo,
    pushRedoSnapshot,
    pushUndoSnapshot,
    runWithoutRecording,
  } = useProgramHistory(program);

  useEffect(
    () => () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    },
    [],
  );

  const scheduleHistorySnapshot = useCallback(
    (snapshot: GeneratedProgram) => {
      pendingHistoryRef.current = snapshot;
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
      historyTimerRef.current = setTimeout(() => {
        const pending = pendingHistoryRef.current;
        pendingHistoryRef.current = null;
        historyTimerRef.current = null;
        if (pending) recordSnapshot(pending);
      }, 450);
    },
    [recordSnapshot],
  );

  const flushHistorySnapshot = useCallback(() => {
    if (!historyTimerRef.current) return;
    clearTimeout(historyTimerRef.current);
    historyTimerRef.current = null;
    const pending = pendingHistoryRef.current;
    pendingHistoryRef.current = null;
    if (pending) recordSnapshot(pending);
  }, [recordSnapshot]);

  useEffect(() => {
    if (skipNavFlushRef.current) {
      skipNavFlushRef.current = false;
      return;
    }
    const epoch = ++navFlushEpochRef.current;
    const runFlush = () => {
      if (navFlushEpochRef.current !== epoch) return;
      onFlushAutosave?.();
      flushHistorySnapshot();
    };
    const idleId =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(runFlush, { timeout: 1200 })
        : window.setTimeout(runFlush, 0);
    return () => {
      if (typeof idleId === 'number') window.clearTimeout(idleId);
      else cancelIdleCallback(idleId);
    };
  }, [selectedWeek, selectedDay, onFlushAutosave, flushHistorySnapshot]);

  const navigateToWeek = useCallback((weekNumber: number, dayNumber = 1) => {
    if (weekNumber === selectedWeek && dayNumber === selectedDay) return;
    setSelectedWeek(weekNumber);
    setSelectedDay(dayNumber);
  }, [selectedWeek, selectedDay]);

  const navigateToDay = useCallback((dayNumber: number) => {
    if (dayNumber === selectedDay) return;
    setSelectedDay(dayNumber);
  }, [selectedDay]);

  const handleWeekStatsDaySelect = useCallback((dayNumber: number) => {
    navigateToDay(dayNumber);
    setStatsScope('day');
  }, [navigateToDay]);

  const handleProgramStatsWeekSelect = useCallback((weekNumber: number) => {
    navigateToWeek(weekNumber, 1);
    setStatsScope('week');
  }, [navigateToWeek]);

  const switchCustomizeSubview = useCallback((view: 'editor' | 'table' | 'stats') => {
    if (view === customizeSubview) return;
    if (view === 'editor') {
      setSessionEditorView('sheet');
    }
    setCustomizeSubview(view);
  }, [customizeSubview]);

  useEffect(() => {
    resetHistory();
  }, [editingAssignmentId, athleteId, resetHistory]);

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
      customizeViewTable: isEs ? 'Tabla' : 'Table',
      customizeViewStats: isEs ? 'Estadísticas' : 'Statistics',
      weeksRow: isEs ? 'Semanas' : 'Weeks',
      daysRow: isEs ? 'Días' : 'Days',
      addWeek: isEs ? 'Añadir semana' : 'Add week',
      duplicateDay: isEs ? 'Duplicar día' : 'Duplicate day',
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
      undo: isEs ? 'Deshacer' : 'Undo',
      redo: isEs ? 'Rehacer' : 'Redo',
      undoShortcut: isEs ? 'Deshacer (Ctrl+Z)' : 'Undo (Ctrl+Z)',
      redoShortcut: isEs ? 'Rehacer (Ctrl+Shift+Z)' : 'Redo (Ctrl+Shift+Z)',
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
    resetHistory();
    persist(p);
  }, [athleteId, athleteForEngine, totalWeeks, daysPerWeek, primaryGoal, trimmedPlanName, onProgramGenerated, persist, canGenerate, motorExercises, resetHistory]);

  const handleClearProgram = useCallback(() => {
    resetHistory();
    persist(null);
  }, [persist, resetHistory]);

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
    (
      next: GeneratedProgram,
      selection?: { week?: number; day?: number },
      options?: { skipHistory?: boolean; immediateHistory?: boolean },
    ) => {
      const current = programRef.current;
      if (current && !options?.skipHistory) {
        if (options?.immediateHistory) {
          flushHistorySnapshot();
          recordSnapshot(current);
        } else {
          scheduleHistorySnapshot(current);
        }
      }
      programRef.current = next;
      if (selection?.week != null) setSelectedWeek(selection.week);
      if (selection?.day != null) setSelectedDay(selection.day);
      const wk = selection?.week ?? selectedWeek;
      const dy = selection?.day ?? selectedDay;
      const dayLabel = next.weeks.find((w) => w.weekNumber === wk)?.days.find((d) => d.dayNumber === dy)?.label;
      const ctx = {
        weekNumber: wk,
        dayNumber: dy,
        dayLabel,
      };
      onProgramChange(next, ctx);
      writeEditDraft(next);
      if (!skipLocalDraftPersistence) {
        setSyncPending(true);
        debouncedStoragePersist(next);
      }
    },
    [
      onProgramChange,
      writeEditDraft,
      debouncedStoragePersist,
      skipLocalDraftPersistence,
      recordSnapshot,
      scheduleHistorySnapshot,
      flushHistorySnapshot,
      selectedWeek,
      selectedDay,
    ],
  );

  const handleUndo = useCallback(() => {
    const current = programRef.current;
    if (!current) return;
    const prev = undo();
    if (!prev) return;
    runWithoutRecording(() => {
      pushRedoSnapshot(current);
      applyProgramUpdate(prev, undefined, { skipHistory: true });
    });
  }, [undo, pushRedoSnapshot, applyProgramUpdate, runWithoutRecording]);

  const handleRedo = useCallback(() => {
    const current = programRef.current;
    if (!current) return;
    const next = redo();
    if (!next) return;
    runWithoutRecording(() => {
      pushUndoSnapshot(current);
      applyProgramUpdate(next, undefined, { skipHistory: true });
    });
  }, [redo, pushUndoSnapshot, applyProgramUpdate, runWithoutRecording]);

  useEffect(() => {
    if (!showCustomize || !program) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showCustomize, program, handleUndo, handleRedo]);

  const handleSessionEdit = useCallback(
    (s: Session) => {
      const current = programRef.current;
      if (!current) return;
      const refreshed = refreshSession(s, athleteForEngine, motorExercises);
      applyProgramUpdate(
        replaceProgramSession(current, selectedWeekRef.current, selectedDayRef.current, refreshed),
      );
    },
    [applyProgramUpdate, athleteForEngine, motorExercises],
  );

  const sessionSaveState = skipLocalDraftPersistence && programSyncState ? programSyncState : null;
  const sessionSavedAt = skipLocalDraftPersistence ? lastSavedAt : draftSavedAt;
  const sessionSyncPending =
    sessionSaveState === 'saving' || sessionSaveState === 'pending' || (!sessionSaveState && syncPending);

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
  const canRemoveWeek = (program?.weeks.length ?? 0) > PROGRAM_STRUCTURE_LIMITS.MIN_WEEKS;
  const canRemoveDay =
    (selectedWeekData?.days.length ?? 0) > PROGRAM_STRUCTURE_LIMITS.MIN_DAYS_PER_WEEK;

  const handleAddWeek = useCallback(() => {
    const current = programRef.current;
    if (!current || !canAddWeek) return;
    const next = addWeekToGeneratedProgram(current, athleteForEngine, motorExercises);
    applyProgramUpdate(next, { week: next.weeks[next.weeks.length - 1]!.weekNumber, day: 1 }, { immediateHistory: true });
  }, [athleteForEngine, motorExercises, canAddWeek, applyProgramUpdate]);

  const handleAddDay = useCallback(() => {
    const current = programRef.current;
    if (!current || !canAddDay) return;
    const week = current.weeks.find((w) => w.weekNumber === selectedWeek);
    if (!week) return;
    const next = addDayToGeneratedWeek(current, selectedWeek, athleteForEngine, motorExercises);
    const updatedWeek = next.weeks.find((w) => w.weekNumber === selectedWeek);
    const newDay = updatedWeek?.days[updatedWeek.days.length - 1]?.dayNumber ?? 1;
    applyProgramUpdate(next, { day: newDay }, { immediateHistory: true });
  }, [selectedWeek, athleteForEngine, motorExercises, canAddDay, applyProgramUpdate]);

  const handleDuplicateDay = useCallback(() => {
    const current = programRef.current;
    if (!current || !canAddDay) return;
    const next = duplicateDayInGeneratedWeek(current, selectedWeek, selectedDay);
    if (next === current) return;
    const weekAfter = next.weeks.find((w) => w.weekNumber === selectedWeek);
    const newDay = weekAfter?.days[weekAfter.days.length - 1]?.dayNumber ?? selectedDay;
    applyProgramUpdate(next, { day: newDay }, { immediateHistory: true });
  }, [selectedWeek, selectedDay, canAddDay, applyProgramUpdate]);

  const handleRemoveWeek = useCallback(
    (weekNumber: number) => {
      const current = programRef.current;
      if (!current || !canRemoveWeek) return;
      const removedIndex = current.weeks.findIndex((w) => w.weekNumber === weekNumber);
      const selectedIndex = current.weeks.findIndex((w) => w.weekNumber === selectedWeek);
      const next = removeWeekFromGeneratedProgram(current, weekNumber);
      if (next === current) return;
      let newWeek = selectedWeek;
      let newDay = selectedDay;
      if (weekNumber === selectedWeek) {
        newWeek = Math.min(removedIndex + 1, next.weeks.length);
        newDay = 1;
      } else if (removedIndex < selectedIndex) {
        newWeek = selectedWeek - 1;
      }
      applyProgramUpdate(next, { week: newWeek, day: newDay }, { immediateHistory: true });
    },
    [selectedWeek, selectedDay, canRemoveWeek, applyProgramUpdate],
  );

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
      applyProgramUpdate(next, { day: newDay }, { immediateHistory: true });
    },
    [selectedWeek, selectedDay, canRemoveDay, applyProgramUpdate],
  );

  const handleReorderWeek = useCallback(
    (fromWeekNumber: number, toWeekNumber: number) => {
      const current = programRef.current;
      if (!current || fromWeekNumber === toWeekNumber || current.weeks.length <= 1) return;
      const next = reorderWeeksInGeneratedProgram(current, fromWeekNumber, toWeekNumber);
      if (next === current) return;
      const newWeek = resolveWeekNumberAfterWeekReorder(
        current.weeks,
        selectedWeek,
        fromWeekNumber,
        toWeekNumber,
      );
      applyProgramUpdate(next, { week: newWeek, day: selectedDay }, { immediateHistory: true });
    },
    [selectedWeek, selectedDay, applyProgramUpdate],
  );

  const handleReorderDay = useCallback(
    (fromDayNumber: number, toDayNumber: number) => {
      const current = programRef.current;
      if (!current || fromDayNumber === toDayNumber) return;
      const weekBefore = current.weeks.find((w) => w.weekNumber === selectedWeek);
      if (!weekBefore || weekBefore.days.length <= 1) return;
      const next = reorderDaysInGeneratedWeek(current, selectedWeek, fromDayNumber, toDayNumber);
      if (next === current) return;
      const newDay = resolveDayNumberAfterDayReorder(
        weekBefore.days,
        selectedDay,
        fromDayNumber,
        toDayNumber,
      );
      applyProgramUpdate(next, { day: newDay }, { immediateHistory: true });
    },
    [selectedWeek, selectedDay, applyProgramUpdate],
  );

  const handleSwapCells = useCallback(
    (from: ProgramDaySlot, to: ProgramDaySlot) => {
      const current = programRef.current;
      if (!current) return;
      const next = swapProgramDaySlots(current, from, to);
      if (next === current) return;
      applyProgramUpdate(next, undefined, { immediateHistory: true });
    },
    [applyProgramUpdate],
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

  const customizeViewTabs = (
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
        onClick={() => switchCustomizeSubview('editor')}
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
        onClick={() => switchCustomizeSubview('table')}
      >
        <Table2 size={14} aria-hidden />
        {t.customizeViewTable}
      </button>
      <button
        type="button"
        role="tab"
        id="wolf-program-tab-stats"
        aria-selected={customizeSubview === 'stats'}
        aria-controls="wolf-program-panel-stats"
        className={`wolf-program-customize-tab${customizeSubview === 'stats' ? ' is-active' : ''}`}
        onClick={() => switchCustomizeSubview('stats')}
      >
        <BarChart3 size={14} aria-hidden />
        {t.customizeViewStats}
      </button>
    </div>
  );

  const customizeHistoryActions = (
    <div
      className="wolf-program-customize-toolbar-actions"
      role="group"
      aria-label={isEs ? 'Historial de edición' : 'Edit history'}
    >
      <button
        type="button"
        className="wolf-program-history-btn"
        disabled={!canAddDay}
        title={t.duplicateDay}
        aria-label={t.duplicateDay}
        onClick={handleDuplicateDay}
      >
        <Copy size={15} aria-hidden />
      </button>
      <button
        type="button"
        className="wolf-program-history-btn"
        disabled={!canUndo}
        title={t.undoShortcut}
        aria-label={t.undoShortcut}
        onClick={handleUndo}
      >
        <Undo2 size={15} aria-hidden />
      </button>
      <button
        type="button"
        className="wolf-program-history-btn"
        disabled={!canRedo}
        title={t.redoShortcut}
        aria-label={t.redoShortcut}
        onClick={handleRedo}
      >
        <Redo2 size={15} aria-hidden />
      </button>
    </div>
  );

  const customizeToolbar =
    program && showCustomize ? (
      <div
        className={`wolf-program-customize-toolbar${toolbarPortalNode ? ' wolf-program-customize-toolbar--in-head' : ''} wolf-program-customize-toolbar--actions-only`}
      >
        <div className="wolf-program-customize-toolbar-end">
          {customizeHistoryActions}
          {customizeToolbarEnd}
        </div>
      </div>
    ) : null;

  const planViewChrome =
    program && showCustomize ? (
      <div className="wolf-program-day-board__stats-chrome wolf-program-day-board__stats-chrome--layout">
        {customizeViewTabs}
        <div className="wolf-program-day-board__stats-chrome-end">
          <ProgramStatsScopeControls
            statsScope={statsScope}
            isEs={isEs}
            onStatsScopeChange={setStatsScope}
            variant="toolbar"
            disabled={customizeSubview !== 'stats'}
          />
          {!toolbarPortalNode ? customizeHistoryActions : null}
        </div>
      </div>
    ) : null;

  const customizeToolbarPortaled =
    toolbarPortalNode && customizeToolbar ? createPortal(customizeToolbar, toolbarPortalNode) : null;

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
          {planViewChrome}

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
                  navigateToWeek(weekNumber, dayNumber);
                  switchCustomizeSubview('editor');
                }}
                onSwapCells={handleSwapCells}
              />
            </div>
          ) : customizeSubview === 'stats' ? (
            <div
              id="wolf-program-panel-stats"
              role="tabpanel"
              aria-labelledby="wolf-program-tab-stats"
              className="wolf-program-customize-panel wolf-program-customize-panel--stats"
            >
              <div className="wolf-program-day-board wolf-program-day-board--stats-only">
                <div className="wolf-program-day-board__head">
                  <ProgramWeekDayNav
                    density="editor"
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
                      removeWeek: t.removeWeek,
                      removeDay: t.removeDay,
                    }}
                    canRemoveWeek={canRemoveWeek}
                    canRemoveDay={canRemoveDay}
                    onSelectWeek={(weekNumber) => navigateToWeek(weekNumber, 1)}
                    onSelectDay={navigateToDay}
                    onAddWeek={handleAddWeek}
                    onAddDay={handleAddDay}
                    onRemoveWeek={handleRemoveWeek}
                    onRemoveDay={handleRemoveDay}
                    onReorderWeek={handleReorderWeek}
                    onReorderDay={handleReorderDay}
                    statsContext={statsScope}
                  />
                </div>
                <div className="wolf-program-day-board__body">
                  {daySession && statsScope === 'day' ? (
                    <SessionDayStatsPanel
                      key={`stats-day-${selectedWeek}-${selectedDay}`}
                      session={daySession}
                      athlete={athleteForEngine}
                      exercises={motorExercises}
                      isEs={isEs}
                      weekNumber={selectedWeek}
                      dayNumber={selectedDay}
                      dayLabel={selectedDayLabel}
                      weekTonnage={weekTonnages[selectedWeek] ?? 0}
                      weekData={selectedWeekData}
                      onSelectDay={handleWeekStatsDaySelect}
                      executionContext={statsExecutionContext}
                      dashboard
                    />
                  ) : null}
                  {statsScope === 'week' ? (
                    <SessionWeekStatsPanel
                      key={`stats-week-${selectedWeek}`}
                      athlete={athleteForEngine}
                      exercises={motorExercises}
                      isEs={isEs}
                      weekNumber={selectedWeek}
                      weekTonnage={weekTonnages[selectedWeek] ?? 0}
                      weekData={selectedWeekData}
                      selectedDay={selectedDay}
                      onSelectDay={handleWeekStatsDaySelect}
                      executionContext={statsExecutionContext}
                      dashboard
                    />
                  ) : null}
                  {statsScope === 'program' ? (
                    <SessionProgramStatsPanel
                      key="stats-program"
                      program={program}
                      athlete={athleteForEngine}
                      exercises={motorExercises}
                      isEs={isEs}
                      selectedWeek={selectedWeek}
                      onSelectWeek={handleProgramStatsWeekSelect}
                      executionContext={statsExecutionContext}
                      dashboard
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div
              id="wolf-program-panel-editor"
              role="tabpanel"
              aria-labelledby="wolf-program-tab-editor"
              className="wolf-program-customize-panel wolf-program-customize-panel--editor"
            >
              <div
                className={`wolf-program-day-board${sessionEditorView !== 'sheet' ? ' wolf-program-day-board--exercise-focus' : ''}`}
              >
                {sessionEditorView === 'sheet' ? (
                  <div className="wolf-program-day-board__head">
                    <ProgramWeekDayNav
                      density="editor"
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
                        removeWeek: t.removeWeek,
                        removeDay: t.removeDay,
                      }}
                      canRemoveWeek={canRemoveWeek}
                      canRemoveDay={canRemoveDay}
                      onSelectWeek={(weekNumber) => navigateToWeek(weekNumber, 1)}
                      onSelectDay={navigateToDay}
                      onAddWeek={handleAddWeek}
                      onAddDay={handleAddDay}
                      onRemoveWeek={handleRemoveWeek}
                      onRemoveDay={handleRemoveDay}
                      onReorderWeek={handleReorderWeek}
                      onReorderDay={handleReorderDay}
                    />
                  </div>
                ) : null}
                <div className="wolf-program-day-board__body">
                  {daySession ? (
                    <div
                      key={`${selectedWeek}-${selectedDay}`}
                      id="wolf-program-day-panel-session"
                      className="wolf-program-session-pane wolf-program-day-board__pane"
                    >
                      <OlympicSessionEditor
                        session={daySession}
                        athlete={athleteForEngine}
                        exercises={motorExercises}
                        catalog={sessionCatalog}
                        isEs={isEs}
                        onChange={handleSessionEdit}
                        draftSavedAt={sessionSavedAt}
                        syncPending={sessionSyncPending}
                        saveState={sessionSaveState ?? undefined}
                        onRetrySave={onRetryProgramSave}
                        onFlushAutosave={onFlushAutosave}
                        dayLabel={selectedDayLabel}
                        weekNumber={selectedWeek}
                        dayNumber={selectedDay}
                        embedded
                        onViewChange={setSessionEditorView}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {customizeToolbarPortaled}
    </div>
  );
};

export default OlympicProgramPlan;
