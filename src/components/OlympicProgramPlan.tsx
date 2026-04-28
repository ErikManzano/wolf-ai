import React, { useCallback, useMemo, useState } from 'react';
import { CalendarRange, Download, FileJson, RefreshCw, UserPlus } from 'lucide-react';
import type { Athlete, GeneratedProgram, Session, SessionGoal } from '../models/training';
import { mockExercises } from '../data/loadMockData';
import { generatePeriodizedProgram, regenerateProgramDay } from '../services/programGenerator';
import { replaceProgramSession } from '../services/sessionMutations';
import { exportProgramAsJson } from '../services/programExport';
import { evaluateSessionFull } from '../services/sessionEvaluator';
import OlympicSessionEditor from './OlympicSessionEditor';
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

const WEEK_OPTIONS = [4, 8, 12, 16] as const;
const DAY_OPTIONS = [2, 3, 4, 5] as const;
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
  const [totalWeeks, setTotalWeeks] = useState<12 | 8 | 4 | 16>(12);
  const [daysPerWeek, setDaysPerWeek] = useState<3 | 2 | 4 | 5>(4);
  const [planName, setPlanName] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [assignFlash, setAssignFlash] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const { assignProgramToAthlete } = useWolfAssign();

  const showCreate = mode === 'full' || mode === 'create';
  const showCustomize = mode === 'full' || mode === 'customize';
  const showAssign = mode === 'full' || mode === 'assign';

  const t = useMemo(
    () => ({
      title: isEs ? 'Mesociclo' : 'Mesocycle',
      subtitle: isEs
        ? 'Periodizacion por semanas y fases.'
        : 'Week-by-week phased planning.',
      weeks: isEs ? 'Semanas' : 'Weeks',
      days: isEs ? 'Dias / semana' : 'Days / week',
      name: isEs ? 'Nombre del plan' : 'Plan name',
      generate: isEs ? 'Generar programa completo' : 'Generate full program',
      clear: isEs ? 'Vaciar' : 'Clear',
      regen: isEs ? 'Regenerar esta sesion' : 'Regenerate this day',
      assign: isEs ? 'Asignar al atleta' : 'Assign to athlete',
      copyJson: isEs ? 'Copiar JSON' : 'Copy JSON',
      download: isEs ? 'Descargar .json' : 'Download .json',
      assignedOk: isEs ? `Plan asignado a ${athlete.name}.` : `Plan assigned to ${athlete.name}.`,
      status: isEs ? 'Estado' : 'Status',
      under: isEs ? 'Infra' : 'Under',
      optimal: isEs ? 'Optimo' : 'Optimal',
      over: isEs ? 'Sobre' : 'Over',
      quickConfig: isEs ? 'Configuración rápida' : 'Quick setup',
      recommended: isEs ? 'Recomendado' : 'Recommended',
      quickGenerate: isEs ? 'Generar rápido' : 'Quick generate',
      nameHint: isEs ? 'Opcional, pero ayuda para organizar atletas.' : 'Optional, but helps organize athletes.',
      nameError: isEs ? `Máximo ${PLAN_NAME_MAX_LEN} caracteres.` : `Maximum ${PLAN_NAME_MAX_LEN} characters.`,
      noProgramYet: isEs ? 'Aún no hay programa generado.' : 'No program generated yet.',
    }),
    [isEs, athlete.name],
  );

  const trimmedPlanName = useMemo(() => planName.trim(), [planName]);
  const hasPlanNameError = planName.length > PLAN_NAME_MAX_LEN;
  const canGenerate = !hasPlanNameError;

  const recommendedConfig = useMemo(() => {
    if (athleteForEngine.level === 'advanced') return { weeks: 12 as const, days: 5 as const };
    if (athleteForEngine.level === 'intermediate') return { weeks: 8 as const, days: 4 as const };
    return { weeks: 4 as const, days: 3 as const };
  }, [athleteForEngine.level]);

  const quickConfigs = useMemo(
    () => [
      { weeks: recommendedConfig.weeks, days: recommendedConfig.days, label: t.recommended },
      { weeks: 4 as const, days: 3 as const, label: '4w · 3d' },
      { weeks: 8 as const, days: 4 as const, label: '8w · 4d' },
      { weeks: 12 as const, days: 5 as const, label: '12w · 5d' },
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
    },
    [onProgramChange, skipLocalDraftPersistence],
  );

  const handleGenerate = useCallback(() => {
    if (!canGenerate) return;
    const p = generatePeriodizedProgram({
      athleteId,
      athlete: athleteForEngine,
      exercises: mockExercises,
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

  const applyQuickConfig = useCallback(
    (weeks: (typeof WEEK_OPTIONS)[number], days: (typeof DAY_OPTIONS)[number], shouldGenerate = false) => {
      setTotalWeeks(weeks);
      setDaysPerWeek(days);
      if (shouldGenerate) {
        const p = generatePeriodizedProgram({
          athleteId,
          athlete: athleteForEngine,
          exercises: mockExercises,
          totalWeeks: weeks,
          daysPerWeek: days,
          primaryGoal,
          programName: trimmedPlanName || undefined,
        });
        setSelectedWeek(1);
        setSelectedDay(1);
        onProgramGenerated?.();
        persist(p);
      }
    },
    [athleteId, athleteForEngine, primaryGoal, trimmedPlanName, onProgramGenerated, persist],
  );

  const handleSessionEdit = useCallback(
    (s: Session) => {
      if (!program) return;
      persist(replaceProgramSession(program, selectedWeek, selectedDay, s));
    },
    [program, selectedWeek, selectedDay, persist],
  );

  const handleRegenDay = useCallback(() => {
    if (!program) return;
    persist(regenerateProgramDay(program, selectedWeek, selectedDay, athleteForEngine, mockExercises));
  }, [program, selectedWeek, selectedDay, athleteForEngine, persist]);

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

  const evalDay = useMemo(() => {
    if (!daySession) return null;
    return evaluateSessionFull(daySession, athleteForEngine, mockExercises).evaluation;
  }, [daySession, athleteForEngine]);

  const statusLabel = (s: string) => (s === 'undertrained' ? t.under : s === 'optimal' ? t.optimal : t.over);

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
    <div className="wolf-program-plan">
      <header className="wolf-program-meso-head">
        <h2 className="wolf-program-meso-title">{t.title}</h2>
        <p className="wolf-program-meso-sub">{t.subtitle}</p>
      </header>

      {editingAssignmentId && (showCustomize || showAssign) && (
        <div className="wolf-program-edit-banner" role="status">
          {isEs ? 'Editando plan ya asignado.' : 'Editing assigned plan.'}
        </div>
      )}

      {showCreate && (
        <div className="wolf-program-gen-card wolf-program-gen-card--primary">
          <p className="wolf-program-gen-label">{isEs ? 'Parametros del bloque' : 'Block parameters'}</p>
          <div className="wolf-program-toolbar">
            <label className="wolf-engine-field">
              <span>{t.weeks}</span>
              <select value={totalWeeks} onChange={(e) => setTotalWeeks(Number(e.target.value) as 12 | 8 | 4 | 16)}>
                {WEEK_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="wolf-engine-field">
              <span>{t.days}</span>
              <select value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value) as 3 | 2 | 4 | 5)}>
                {DAY_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="wolf-engine-field wolf-prog-name">
              <span>{t.name}</span>
              <input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                maxLength={PLAN_NAME_MAX_LEN + 4}
                placeholder={isEs ? 'Opcional' : 'Optional'}
                aria-invalid={hasPlanNameError}
              />
              <small className={`wolf-program-help ${hasPlanNameError && nameTouched ? 'wolf-program-help--error' : ''}`}>
                {hasPlanNameError && nameTouched ? t.nameError : t.nameHint}
              </small>
            </label>
            <button type="button" className="btn-primary" onClick={handleGenerate} disabled={!canGenerate}>
              <CalendarRange size={18} /> {t.generate}
            </button>
            <button type="button" className="btn-outline" onClick={() => persist(null)}>
              {t.clear}
            </button>
          </div>
          <div className="wolf-program-quick-row" aria-label={t.quickConfig}>
            <span className="wolf-program-quick-label">{t.quickConfig}</span>
            {quickConfigs.map((cfg) => (
              <button
                key={`${cfg.weeks}-${cfg.days}-${cfg.label}`}
                type="button"
                className={`btn-secondary wolf-program-quick-btn ${totalWeeks === cfg.weeks && daysPerWeek === cfg.days ? 'wolf-program-quick-btn--active' : ''}`}
                onClick={() => applyQuickConfig(cfg.weeks, cfg.days)}
              >
                {cfg.label}
              </button>
            ))}
            <button type="button" className="btn-primary wolf-program-quick-generate" onClick={() => applyQuickConfig(totalWeeks, daysPerWeek, true)} disabled={!canGenerate}>
              {t.quickGenerate}
            </button>
          </div>
        </div>
      )}

      {!program && !showCreate && (
        <div className="wolf-program-empty-card">
          <p className="wolf-program-empty-lead">{t.noProgramYet}</p>
        </div>
      )}

      {program && (showCreate || showAssign) && (
        <div className="wolf-program-live-card">
          <div className="wolf-program-meta">
            <strong>{program.name}</strong>
            <span className="muted">{program.totalWeeks}w · {program.daysPerWeek}d/w</span>
          </div>
          {showAssign && (
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
          )}
          {showAssign && assignFlash && <p className="wolf-program-assign-flash">{t.assignedOk}</p>}
        </div>
      )}

      {program && showCustomize && (
        <>
          <div className="wolf-program-nav">
            <div className="wolf-program-nav-label">{isEs ? 'Semana y dia' : 'Week & day'}</div>
            <div className="wolf-week-strip wolf-week-strip-scroll">
              {program.weeks.map((w) => (
                <button key={w.weekNumber} type="button" className={`wolf-week-pill ${selectedWeek === w.weekNumber ? 'active' : ''}`} onClick={() => { setSelectedWeek(w.weekNumber); setSelectedDay(1); }}>
                  W{w.weekNumber}
                </button>
              ))}
            </div>
            <div className="wolf-day-strip wolf-day-strip-scroll">
              {program.weeks.find((x) => x.weekNumber === selectedWeek)?.days.map((d) => (
                <button key={d.dayNumber} type="button" className={`wolf-day-pill ${selectedDay === d.dayNumber ? 'active' : ''}`} onClick={() => setSelectedDay(d.dayNumber)}>
                  {d.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-outline wolf-regen-day" onClick={handleRegenDay}>
              <RefreshCw size={16} /> {t.regen}
            </button>
          </div>
          {evalDay && (
            <div className="wolf-program-day-eval">
              <span>K {evalDay.kValue.toFixed(1)} · {evalDay.load} kg · {evalDay.totalReps} reps</span>
              <span className="wolf-status">{t.status}: {statusLabel(evalDay.status)}</span>
            </div>
          )}
          {daySession && (
            <OlympicSessionEditor session={daySession} athlete={athleteForEngine} exercises={mockExercises} isEs={isEs} onChange={handleSessionEdit} />
          )}
        </>
      )}
    </div>
  );
};

export default OlympicProgramPlan;
