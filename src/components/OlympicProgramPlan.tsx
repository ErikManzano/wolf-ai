import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarRange,
  ChevronDown,
  Download,
  FileJson,
  LayoutGrid,
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
  removeWeekFromGeneratedProgram,
  renameProgramDayLabel,
} from '../services/programStructureMutations';
import { replaceProgramSession } from '../services/sessionMutations';
import { exportProgramAsJson } from '../services/programExport';
import {
  clearProgramEditDraft,
  readProgramEditDraft,
  saveProgramEditDraft,
  type ProgramEditDraft,
} from '../services/programDraftStore';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import OlympicSessionEditor from './OlympicSessionEditor';
import { ProgramWeekDayNav } from './session-editor/ProgramWeekDayNav';
import { DraftRecoveryBanner } from './session-editor/DraftRecoveryBanner';
import ConfirmationModal from './ConfirmationModal';
import { useWolfAssign } from '../context/WolfAssignContext';

const STORAGE_KEY = 'wolf_olympic_program_v1';

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
}

const WEEK_OPTIONS = Array.from(
  { length: PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS },
  (_, i) => i + 1,
);
const DAY_OPTIONS = Array.from(
  { length: PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK },
  (_, i) => i + 1,
);
const PLAN_NAME_MAX_LEN = 48;

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

  const [planName, setPlanName] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [assignFlash, setAssignFlash] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const [recoveryDraft, setRecoveryDraft] = useState<ProgramEditDraft | null>(null);
  const [editingDayLabel, setEditingDayLabel] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<'week' | 'day' | null>(null);
  const programRef = useRef(program);
  const { assignProgramToAthlete, motorExercises } = useWolfAssign();

  useEffect(() => {
    programRef.current = program;
  }, [program]);

  const showCreate = mode === 'full' || mode === 'create';
  const showCustomize = mode === 'full' || mode === 'customize';
  const showAssign = mode === 'full' || mode === 'assign';

  const t = useMemo(
    () => ({
      title: isEs ? 'Mesociclo' : 'Mesocycle',
      subtitle: isEs
        ? `Hasta ${PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS} semanas y ${PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK} días por semana.`
        : `Up to ${PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS} weeks and ${PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK} days per week.`,
      weeks: isEs ? 'Semanas' : 'Weeks',
      days: isEs ? 'Dias / semana' : 'Days / week',
      name: isEs ? 'Nombre del plan' : 'Plan name',
      generate: isEs ? 'Generar programa completo' : 'Generate full program',
      clear: isEs ? 'Vaciar' : 'Clear',
      assign: isEs ? 'Asignar al atleta' : 'Assign to athlete',
      copyJson: isEs ? 'Copiar JSON' : 'Copy JSON',
      download: isEs ? 'Descargar .json' : 'Download .json',
      assignedOk: isEs ? `Plan asignado a ${athlete.name}.` : `Plan assigned to ${athlete.name}.`,
      blockParams: isEs ? 'Parámetros del bloque' : 'Block parameters',
      manualConfig: isEs ? 'Configuración manual' : 'Manual setup',
      quickPresets: isEs ? 'Configuración rápida (Presets)' : 'Quick setup (Presets)',
      quickPresetsHint: isEs
        ? 'Selecciona un preset para rellenar semanas y días arriba; luego genera con un solo clic.'
        : 'Pick a preset to fill weeks and days above, then generate in one click.',
      recommended: isEs ? 'Recomendado' : 'Recommended',
      previewTitle: isEs ? 'Vista previa del mesociclo' : 'Mesocycle preview',
      previewEmpty: isEs
        ? 'Configura los parámetros superiores para visualizar la estructura del mesociclo.'
        : 'Set the parameters above to preview your mesocycle structure.',
      previewWeeks: isEs ? 'Semanas del bloque' : 'Block weeks',
      nameHint: isEs ? 'Opcional, pero ayuda para organizar atletas.' : 'Optional, but helps organize athletes.',
      nameError: isEs ? `Máximo ${PLAN_NAME_MAX_LEN} caracteres.` : `Maximum ${PLAN_NAME_MAX_LEN} characters.`,
      noProgramYet: isEs ? 'Aún no hay programa generado.' : 'No program generated yet.',
      draftRecovery: isEs ? 'Hay cambios guardados en este dispositivo más recientes.' : 'More recent changes saved on this device.',
      restoreDraft: isEs ? 'Restaurar borrador' : 'Restore draft',
      dismissDraft: isEs ? 'Descartar' : 'Dismiss',
      autosaveHint: isEs
        ? 'Cada cambio se guarda en copia local al instante.'
        : 'Every change is saved to a local copy instantly.',
      weekDayNav: isEs ? 'Semana y día' : 'Week & day',
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
  const canGenerate = !hasPlanNameError;

  const quickConfigs = useMemo(
    () => [
      { weeks: recommendedConfig.weeks, days: recommendedConfig.days, label: t.recommended },
      { weeks: 4, days: 3, label: '4w · 3d' },
      { weeks: 8, days: 4, label: '8w · 4d' },
      { weeks: 12, days: 5, label: '12w · 5d' },
      { weeks: 16, days: 6, label: '16w · 6d' },
    ],
    [recommendedConfig.days, recommendedConfig.weeks, t.recommended],
  );

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

  useEffect(() => {
    if (!showCustomize || !program) {
      setRecoveryDraft(null);
      return;
    }
    const draft = readProgramEditDraft();
    if (!draft || draft.athleteId !== athleteId) return;
    const sameProgram = JSON.stringify(draft.program) === JSON.stringify(program);
    if (!sameProgram) setRecoveryDraft(draft);
  }, [showCustomize, program, athleteId]);

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
      programName: trimmedPlanName || undefined,
    });
    setSelectedWeek(1);
    setSelectedDay(1);
    onProgramGenerated?.();
    persist(p);
  }, [athleteId, athleteForEngine, totalWeeks, daysPerWeek, primaryGoal, trimmedPlanName, onProgramGenerated, persist, canGenerate]);

  const applyQuickConfig = useCallback((weeks: number, days: number) => {
    setTotalWeeks(weeks);
    setDaysPerWeek(days);
  }, []);

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

  useEffect(() => {
    const label = selectedWeekData?.days.find((d) => d.dayNumber === selectedDay)?.label ?? '';
    setEditingDayLabel(label);
  }, [selectedWeek, selectedDay, selectedWeekData]);

  const canAddWeek = (program?.weeks.length ?? 0) < PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS;
  const canRemoveWeek = (program?.weeks.length ?? 0) > PROGRAM_STRUCTURE_LIMITS.MIN_WEEKS;
  const canAddDay = (selectedWeekData?.days.length ?? 0) < PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK;
  const canRemoveDay = (selectedWeekData?.days.length ?? 0) > PROGRAM_STRUCTURE_LIMITS.MIN_DAYS_PER_WEEK;

  const handleDayLabelCommit = useCallback(
    (weekNumber: number, dayNumber: number, label: string) => {
      const current = programRef.current;
      if (!current) return;
      const week = current.weeks.find((w) => w.weekNumber === weekNumber);
      const day = week?.days.find((d) => d.dayNumber === dayNumber);
      if (!day || day.label === label.trim()) return;
      applyProgramUpdate(renameProgramDayLabel(current, weekNumber, dayNumber, label));
    },
    [applyProgramUpdate],
  );

  const handleAddWeek = useCallback(() => {
    const current = programRef.current;
    if (!current || !canAddWeek) return;
    const next = addWeekToGeneratedProgram(current, athleteForEngine, motorExercises);
    applyProgramUpdate(next, { week: next.weeks[next.weeks.length - 1]!.weekNumber, day: 1 });
  }, [athleteForEngine, motorExercises, canAddWeek, applyProgramUpdate]);

  const handleRemoveWeek = useCallback(() => {
    const current = programRef.current;
    if (!current || !canRemoveWeek) return;
    setConfirmRemove('week');
  }, [canRemoveWeek]);

  const confirmRemoveWeek = useCallback(() => {
    const current = programRef.current;
    if (!current || !canRemoveWeek) return;
    const next = removeWeekFromGeneratedProgram(current, selectedWeek);
    const fallback = next.weeks[Math.min(next.weeks.length - 1, selectedWeek - 2)] ?? next.weeks[0];
    applyProgramUpdate(next, { week: fallback?.weekNumber ?? 1, day: 1 });
    setConfirmRemove(null);
  }, [selectedWeek, canRemoveWeek, applyProgramUpdate]);

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

  const handleRemoveDay = useCallback(() => {
    const current = programRef.current;
    if (!current || !canRemoveDay) return;
    setConfirmRemove('day');
  }, [canRemoveDay]);

  const confirmRemoveDay = useCallback(() => {
    const current = programRef.current;
    if (!current || !canRemoveDay) return;
    const next = removeDayFromGeneratedWeek(current, selectedWeek, selectedDay);
    const updatedWeek = next.weeks.find((w) => w.weekNumber === selectedWeek);
    const fallbackDay = updatedWeek?.days[Math.min(updatedWeek.days.length - 1, selectedDay - 2)]?.dayNumber ?? 1;
    applyProgramUpdate(next, { day: fallbackDay });
    setConfirmRemove(null);
  }, [selectedWeek, selectedDay, canRemoveDay, applyProgramUpdate]);

  const restoreRecoveryDraft = useCallback(() => {
    if (!recoveryDraft) return;
    programRef.current = recoveryDraft.program;
    setSelectedWeek(recoveryDraft.selectedWeek);
    setSelectedDay(recoveryDraft.selectedDay);
    persist(recoveryDraft.program);
    setRecoveryDraft(null);
  }, [recoveryDraft, persist]);

  const dismissRecoveryDraft = useCallback(() => {
    clearProgramEditDraft();
    setRecoveryDraft(null);
  }, []);

  const handleAssignAthlete = useCallback(() => {
    if (!program) return;
    const id = assignProgramToAthlete(program, athleteId);
    onAssignmentSynced?.(id);
    setAssignFlash(true);
    window.setTimeout(() => setAssignFlash(false), 2400);
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
          <p className="wolf-program-meso-sub">{t.subtitle}</p>
        </header>
      )}

      {editingAssignmentId && (showCustomize || showAssign) && (
        <div className="wolf-program-edit-banner" role="status">
          {isEs ? 'Editando plan ya asignado.' : 'Editing assigned plan.'}
        </div>
      )}

      {showCreate && (
        <>
          <div className="wolf-program-gen-card wolf-program-gen-card--primary">
            <p className="wolf-program-gen-label">{t.blockParams}</p>

            <section className="wolf-program-manual" aria-labelledby="wolf-program-manual-heading">
              <h3 id="wolf-program-manual-heading" className="wolf-program-section-title">
                {t.manualConfig}
              </h3>
              <div className="wolf-program-params-grid">
                <label className="wolf-program-param">
                  <span className="wolf-program-param-label">{t.weeks}</span>
                  <div className="wolf-select-wrap">
                    <select
                      value={totalWeeks}
                      onChange={(e) => setTotalWeeks(Number(e.target.value))}
                    >
                      {WEEK_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="wolf-select-chevron" size={16} strokeWidth={2} aria-hidden />
                  </div>
                </label>
                <label className="wolf-program-param">
                  <span className="wolf-program-param-label">{t.days}</span>
                  <div className="wolf-select-wrap">
                    <select
                      value={daysPerWeek}
                      onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                    >
                      {DAY_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="wolf-select-chevron" size={16} strokeWidth={2} aria-hidden />
                  </div>
                </label>
                <label className="wolf-program-param wolf-program-param--name">
                  <span className="wolf-program-param-label">{t.name}</span>
                  <input
                    className="wolf-program-input"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    onBlur={() => setNameTouched(true)}
                    maxLength={PLAN_NAME_MAX_LEN + 4}
                    placeholder={isEs ? 'Opcional' : 'Optional'}
                    aria-invalid={hasPlanNameError}
                  />
                  <small
                    className={`wolf-program-help ${hasPlanNameError && nameTouched ? 'wolf-program-help--error' : ''}`}
                  >
                    {hasPlanNameError && nameTouched ? t.nameError : t.nameHint}
                  </small>
                </label>
              </div>
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
                  onClick={() => persist(null)}
                  disabled={!program}
                >
                  <Trash2 size={15} strokeWidth={2} aria-hidden />
                  {t.clear}
                </button>
              </div>
            </section>

            <div className="wolf-program-params-divider" role="separator" aria-hidden />

            <section className="wolf-program-quick" aria-labelledby="wolf-program-quick-heading">
              <h3 id="wolf-program-quick-heading" className="wolf-program-section-title">
                {t.quickPresets}
              </h3>
              <p className="wolf-program-quick-hint">{t.quickPresetsHint}</p>
              <div className="wolf-program-preset-tags" role="group" aria-label={t.quickPresets}>
                {quickConfigs.map((cfg) => {
                  const isActive = totalWeeks === cfg.weeks && daysPerWeek === cfg.days;
                  return (
                    <button
                      key={`${cfg.weeks}-${cfg.days}-${cfg.label}`}
                      type="button"
                      className={`wolf-program-preset-tag${isActive ? ' is-active' : ''}`}
                      onClick={() => applyQuickConfig(cfg.weeks, cfg.days)}
                      aria-pressed={isActive}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <article
            className={`wolf-program-preview${program ? ' wolf-program-preview--live' : ' wolf-program-preview--empty'}`}
            aria-label={t.previewTitle}
          >
            <header className="wolf-program-preview-head">
              <LayoutGrid size={18} strokeWidth={2} aria-hidden className="wolf-program-preview-icon" />
              <div>
                <h3 className="wolf-program-preview-title">{t.previewTitle}</h3>
                {program ? (
                  <p className="wolf-program-preview-meta">
                    <strong>{program.name}</strong>
                    <span className="wolf-program-preview-meta-sep" aria-hidden>
                      ·
                    </span>
                    <span className="muted">
                      {program.totalWeeks}w · {program.daysPerWeek}d/w
                    </span>
                  </p>
                ) : (
                  <p className="wolf-program-preview-empty-copy">{t.previewEmpty}</p>
                )}
              </div>
            </header>
            {program ? (
              <div className="wolf-program-preview-body">
                <span className="wolf-program-preview-weeks-label">{t.previewWeeks}</span>
                <div className="wolf-program-preview-week-grid" role="list">
                  {program.weeks.map((w) => (
                    <span key={w.weekNumber} className="wolf-program-preview-week-chip" role="listitem">
                      W{w.weekNumber}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
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
        <>
          {recoveryDraft && (
            <DraftRecoveryBanner
              isEs={isEs}
              savedAt={recoveryDraft.savedAt}
              onRestore={restoreRecoveryDraft}
              onDismiss={dismissRecoveryDraft}
            />
          )}
          <p className="wolf-program-inline-hint">
            {t.autosaveHint}
            {draftSavedAt && !syncPending && (
              <>
                {' '}
                · {isEs ? 'Última copia' : 'Last backup'}{' '}
                {new Date(draftSavedAt).toLocaleTimeString(isEs ? 'es' : 'en', { hour: '2-digit', minute: '2-digit' })}
              </>
            )}
            {syncPending && <> · {isEs ? 'Guardando…' : 'Saving…'}</>}
          </p>
          <ProgramWeekDayNav
            program={program}
            selectedWeek={selectedWeek}
            selectedDay={selectedDay}
            selectedWeekData={selectedWeekData}
            editingDayLabel={editingDayLabel}
            isEs={isEs}
            canAddWeek={canAddWeek}
            canRemoveWeek={canRemoveWeek}
            canAddDay={canAddDay}
            canRemoveDay={canRemoveDay}
            labels={{
              weekDayNav: t.weekDayNav,
              weeksRow: t.weeksRow,
              daysRow: t.daysRow,
              addWeek: t.addWeek,
              addDay: t.addDay,
              removeWeek: t.removeWeek,
              removeDay: t.removeDay,
              dayLabelAria: t.dayLabelAria,
              maxWeeks: t.maxWeeks,
              maxDays: t.maxDays,
            }}
            onSelectWeek={(weekNumber) => {
              setSelectedWeek(weekNumber);
              setSelectedDay(1);
            }}
            onSelectDay={setSelectedDay}
            onDayLabelChange={setEditingDayLabel}
            onDayLabelCommit={handleDayLabelCommit}
            onAddWeek={handleAddWeek}
            onRemoveWeek={handleRemoveWeek}
            onAddDay={handleAddDay}
            onRemoveDay={handleRemoveDay}
          />
          {daySession && (
            <OlympicSessionEditor
              session={daySession}
              athlete={athleteForEngine}
              exercises={motorExercises}
              isEs={isEs}
              onChange={handleSessionEdit}
              draftSavedAt={draftSavedAt}
              syncPending={syncPending}
              dayLabel={selectedDayLabel}
              weekNumber={selectedWeek}
              dayNumber={selectedDay}
            />
          )}
        </>
      )}

      <ConfirmationModal
        open={confirmRemove === 'week'}
        title={isEs ? 'Eliminar semana' : 'Remove week'}
        message={t.confirmRemoveWeek}
        confirmLabel={isEs ? 'Eliminar' : 'Remove'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => setConfirmRemove(null)}
        onConfirm={confirmRemoveWeek}
      />
      <ConfirmationModal
        open={confirmRemove === 'day'}
        title={isEs ? 'Eliminar día' : 'Remove day'}
        message={t.confirmRemoveDay}
        confirmLabel={isEs ? 'Eliminar' : 'Remove'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => setConfirmRemove(null)}
        onConfirm={confirmRemoveDay}
      />
    </div>
  );
};

export default OlympicProgramPlan;
