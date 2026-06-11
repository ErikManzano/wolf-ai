import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { Athlete, GeneratedProgram, SessionGoal } from '../../models/training';
import { K_VALUE_RANGES } from '../../models/training';
import { useAppContext } from '../../context/AppContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { latestIntakeForWlProfile, mergeAthleteWithLatestIntake, parseIntakeDeadlift } from '../../utils/wlStatsBridge';
import OlympicProgramPlan, { type OlympicProgramPlanCreateActions } from '../OlympicProgramPlan';
import WlProgramAssignSheet from './WlProgramAssignSheet';
import '../OlympicEnginePanel.css';
import '../wl-management/wl-management.css';
import './wl-programs.css';

type EditorTab = 'generate' | 'customize';

interface WlProgramEditorProps {
  language: 'ES' | 'EN';
  programId: string;
  onBack: () => void;
}

const GOALS: SessionGoal[] = ['technique', 'strength', 'power'];

const REFERENCE_ATHLETE: Athlete = {
  id: 'ref-athlete',
  name: 'Reference',
  level: 'intermediate',
  bodyweight: 80,
  oneRM: { snatch: 80, cleanJerk: 100, backSquat: 140, frontSquat: 120 },
  fatigueScore: 20,
  readinessScore: 80,
};

function athleteInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const WlProgramEditor: React.FC<WlProgramEditorProps> = ({ language, programId, onBack }) => {
  const isEs = language === 'ES';
  const { intakes } = useAppContext();
  const {
    getCoachProgramById,
    updateCoachProgram,
    rosterForCoach,
    currentUser,
    wlAthletes,
  } = useWolfAssign();

  const coachProgram = getCoachProgramById(programId);
  const coachAthletes = useMemo(() => rosterForCoach(currentUser), [rosterForCoach, currentUser]);

  const [tab, setTab] = useState<EditorTab>(() =>
    coachProgram?.program?.weeks?.length ? 'customize' : 'generate',
  );
  const [athleteId, setAthleteId] = useState(
    () => coachAthletes.find((a) => a.id === 'ath-erik')?.id ?? coachAthletes[0]?.id ?? '',
  );
  const [goal, setGoal] = useState<SessionGoal>('strength');
  const [program, setProgram] = useState<GeneratedProgram | null>(coachProgram?.program ?? null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createActions, setCreateActions] = useState<OlympicProgramPlanCreateActions | null>(null);
  const programRef = useRef(program);
  programRef.current = program;

  const hasProgram = Boolean(program?.weeks?.length);

  useEffect(() => {
    if (coachProgram) setProgram(coachProgram.program);
  }, [coachProgram?.id, coachProgram?.updatedAt]);

  useEffect(() => {
    if (coachAthletes.length === 0) return;
    setAthleteId((prev) => (coachAthletes.some((a) => a.id === prev) ? prev : coachAthletes[0]!.id));
  }, [coachAthletes]);

  const baseWlAthlete = useMemo(() => wlAthletes.find((a) => a.id === athleteId), [wlAthletes, athleteId]);
  const latestStatsIntake = useMemo(() => latestIntakeForWlProfile(athleteId, intakes), [athleteId, intakes]);
  const athlete = useMemo(
    () => (baseWlAthlete ? mergeAthleteWithLatestIntake(baseWlAthlete, latestStatsIntake) : null),
    [baseWlAthlete, latestStatsIntake],
  );
  const athleteForEngine = athlete ?? REFERENCE_ATHLETE;
  const kRange = athlete ? K_VALUE_RANGES[athlete.level] : K_VALUE_RANGES.intermediate;
  const deadliftFromStats = useMemo(() => parseIntakeDeadlift(latestStatsIntake), [latestStatsIntake]);

  const debouncedSave = useDebouncedCallback(async (p: GeneratedProgram) => {
    await updateCoachProgram(programId, { program: p });
  }, 800);

  const handleProgramChange = useCallback(
    (p: GeneratedProgram | null) => {
      setProgram(p);
      if (p) void debouncedSave(p);
    },
    [debouncedSave],
  );

  const handleProgramGenerated = useCallback(() => {
    setTab('customize');
  }, []);

  const handlePublish = async () => {
    if (!program) return;
    setSaving(true);
    try {
      await updateCoachProgram(programId, { program, status: 'published' });
    } finally {
      setSaving(false);
    }
  };

  const goalLabel = (g: SessionGoal) =>
    g === 'technique' ? (isEs ? 'Técnica' : 'Technique') : g === 'strength' ? (isEs ? 'Fuerza' : 'Strength') : isEs ? 'Potencia' : 'Power';

  const prStatCards = useMemo(() => {
    if (!athlete) return [];
    const cards = [
      { key: 'bw', label: isEs ? 'PC' : 'BW', value: String(athlete.bodyweight), unit: 'kg', Icon: Scale },
      { key: 'sn', label: 'Sn', value: String(athlete.oneRM.snatch), unit: 'kg', Icon: Dumbbell },
      { key: 'cj', label: 'C&J', value: String(athlete.oneRM.cleanJerk), unit: 'kg', Icon: Dumbbell },
      { key: 'bs', label: isEs ? 'Sent.' : 'BS', value: String(athlete.oneRM.backSquat), unit: 'kg', Icon: Dumbbell },
    ];
    if (deadliftFromStats != null && deadliftFromStats > 0) {
      cards.push({
        key: 'dl',
        label: isEs ? 'PM' : 'DL',
        value: String(deadliftFromStats),
        unit: 'kg',
        Icon: Dumbbell,
      });
    }
    return cards;
  }, [athlete, deadliftFromStats, isEs]);

  const contextBar = (compact?: boolean) => (
    <section
      className={`wl-programs-context-bar${compact ? ' wl-programs-context-bar--compact' : ''}`}
      aria-label={isEs ? 'Referencia de cargas' : 'Load reference'}
    >
      <div className="wl-programs-context-bar__group wl-programs-context-bar__athlete">
        {!compact && athlete ? (
          <span className="wl-programs-athlete-avatar" aria-hidden>
            {athleteInitials(athlete.name)}
          </span>
        ) : null}
        <label className="wl-programs-inline-field">
          <span>{isEs ? 'Atleta ref.' : 'Ref. athlete'}</span>
          <div className="wolf-select-wrap">
            <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)} disabled={compact}>
              {coachAthletes.length === 0 ? (
                <option value="">{isEs ? 'Sin atletas' : 'No athletes'}</option>
              ) : (
                coachAthletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))
              )}
            </select>
            {!compact ? <ChevronDown className="wolf-select-chevron" size={16} strokeWidth={2} aria-hidden /> : null}
          </div>
        </label>
        {athlete ? (
          <span className="wl-programs-level-tag">{athlete.level}</span>
        ) : null}
      </div>

      <div className="wl-programs-context-bar__group wl-programs-context-bar__goal">
        <span className="wl-programs-context-bar__label">{isEs ? 'Objetivo' : 'Goal'}</span>
        {compact ? (
          <span className="wl-programs-goal-readonly">{goalLabel(goal)}</span>
        ) : (
          <div className="wl-programs-goal-pills" role="group" aria-label={isEs ? 'Objetivo' : 'Goal'}>
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                className={`wl-programs-goal-pill${goal === g ? ' active' : ''}`}
                aria-pressed={goal === g}
                onClick={() => setGoal(g)}
              >
                {goalLabel(g)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="wl-programs-context-bar__group wl-programs-context-bar__k">
        <span className="wl-programs-context-bar__label">{isEs ? 'Banda K' : 'K band'}</span>
        <strong className="wl-programs-k-value">
          {kRange[0]}–{kRange[1]}
        </strong>
      </div>

      {prStatCards.length > 0 ? (
        <div className="wl-programs-context-bar__group wl-programs-context-bar__prs">
          {prStatCards.map(({ key, label, value, unit, Icon }) => (
            <span key={key} className="wl-programs-pr-mini">
              <Icon size={11} strokeWidth={2} aria-hidden />
              <span className="wl-programs-pr-mini-label">{label}</span>
              <strong>
                {value}
                <small>{unit}</small>
              </strong>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );

  if (!coachProgram) {
    return (
      <div className="wl-programs-panel">
        <button type="button" className="btn-outline" onClick={onBack}>
          <ArrowLeft size={16} /> {isEs ? 'Volver' : 'Back'}
        </button>
        <p className="wl-mgmt-empty">{isEs ? 'Programa no encontrado.' : 'Program not found.'}</p>
      </div>
    );
  }

  const steps: { id: EditorTab; step: number; label: string; icon: typeof Sparkles; disabled?: boolean }[] = [
    { id: 'generate', step: 1, label: isEs ? 'Programa' : 'Program', icon: Sparkles },
    { id: 'customize', step: 2, label: isEs ? 'Personalizar' : 'Customize', icon: SlidersHorizontal, disabled: !hasProgram },
  ];

  return (
    <div className="wl-programs-panel wl-programs-editor">
      <header className="wl-programs-editor-hero">
        <nav className="wl-programs-breadcrumb" aria-label={isEs ? 'Navegación' : 'Breadcrumb'}>
          <button type="button" className="wl-programs-back-btn" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden />
            {isEs ? 'Programas' : 'Programs'}
          </button>
          <ChevronRight size={14} className="wl-programs-breadcrumb-sep" aria-hidden />
          <span className="wl-programs-breadcrumb-current">{coachProgram.name}</span>
        </nav>

        <div className="wl-programs-editor-hero-meta">
          <span className={`wl-programs-status-pill wl-programs-status-pill--${coachProgram.status}`}>
            {coachProgram.status === 'published' ? (isEs ? 'Publicado' : 'Published') : isEs ? 'Borrador' : 'Draft'}
          </span>
          {hasProgram ? (
            <span className="wl-programs-structure-chip">
              {program!.totalWeeks} {isEs ? 'sem' : 'wk'} × {program!.daysPerWeek} {isEs ? 'días' : 'days'}
            </span>
          ) : null}
          {coachProgram.enrolledAthletes.length > 0 ? (
            <span className="wl-programs-enrolled-chip">
              {coachProgram.enrolledAthletes.length} {isEs ? 'atletas' : 'athletes'}
            </span>
          ) : null}
        </div>
      </header>

      <div className="wl-programs-stepper" role="tablist" aria-label={isEs ? 'Pasos del editor' : 'Editor steps'}>
        {steps.map(({ id, step, label, icon: Icon, disabled }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            disabled={disabled}
            className={`wl-programs-step${tab === id ? ' active' : ''}${disabled ? ' disabled' : ''}`}
            onClick={() => !disabled && setTab(id)}
          >
            <span className="wl-programs-step-num">{step}</span>
            <Icon size={15} strokeWidth={2} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="wl-programs-editor-body">
        {tab === 'generate' ? (
          <div className="wl-programs-editor-stage">
            {contextBar()}
            <div className="wl-programs-generate-main wl-programs-embedded-plan">
              <OlympicProgramPlan
                language={language}
                athleteId={athleteId}
                athlete={athleteForEngine}
                athleteForEngine={athleteForEngine}
                primaryGoal={goal}
                program={program}
                onProgramChange={handleProgramChange}
                onProgramGenerated={handleProgramGenerated}
                onCreateActionsChange={setCreateActions}
                externalCreateActions
                skipLocalDraftPersistence
                mode="create"
              />
            </div>
          </div>
        ) : (
          <div className="wl-programs-editor-stage">
            {contextBar(true)}
            <div className="wl-programs-customize-wrap wolf-engine--customize wl-programs-embedded-plan">
              {hasProgram ? (
                <OlympicProgramPlan
                  language={language}
                  athleteId={athleteId}
                  athlete={athleteForEngine}
                  athleteForEngine={athleteForEngine}
                  primaryGoal={goal}
                  program={program}
                  onProgramChange={handleProgramChange}
                  skipLocalDraftPersistence
                  mode="customize"
                />
              ) : (
                <div className="wl-programs-customize-empty">
                  <Sparkles size={36} strokeWidth={1.25} aria-hidden />
                  <h3>{isEs ? 'Primero genera el mesociclo' : 'Generate the mesocycle first'}</h3>
                  <p>
                    {isEs
                      ? 'Configura semanas y días en el paso 1, luego personaliza sesiones aquí.'
                      : 'Set weeks and days in step 1, then customize sessions here.'}
                  </p>
                  <button type="button" className="btn-primary" onClick={() => setTab('generate')}>
                    {isEs ? 'Ir a generar' : 'Go to generate'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="wl-programs-action-dock" aria-label={isEs ? 'Acciones del paso' : 'Step actions'}>
        <p className="wl-programs-action-dock__hint">
          {tab === 'generate'
            ? isEs
              ? 'Define la estructura y genera el mesociclo.'
              : 'Set structure and generate the mesocycle.'
            : saving
              ? isEs
                ? 'Guardando…'
                : 'Saving…'
              : isEs
                ? 'Los cambios se guardan automáticamente.'
                : 'Changes save automatically.'}
        </p>
        <div className="wl-programs-action-dock__actions">
          {tab === 'generate' ? (
            <>
              {createActions?.canClear ? (
                <button
                  type="button"
                  className="btn-outline wl-programs-action-dock__ghost"
                  onClick={() => createActions.clear()}
                >
                  <Trash2 size={16} aria-hidden />
                  {isEs ? 'Vaciar' : 'Clear'}
                </button>
              ) : null}
              <button
                type="button"
                className="btn-primary"
                disabled={!createActions?.canGenerate}
                onClick={() => createActions?.generate()}
              >
                <CalendarRange size={16} aria-hidden />
                {isEs ? 'Generar programa' : 'Generate program'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving || !hasProgram || coachProgram.status === 'published'}
                onClick={() => void handlePublish()}
              >
                {coachProgram.status === 'published' ? (isEs ? 'Publicado' : 'Published') : isEs ? 'Publicar' : 'Publish'}
              </button>
              <button type="button" className="btn-primary" disabled={!hasProgram} onClick={() => setAssignOpen(true)}>
                <UserPlus size={16} aria-hidden />
                {isEs ? 'Asignar' : 'Assign'}
              </button>
            </>
          )}
        </div>
      </footer>

      {assignOpen ? (
        <WlProgramAssignSheet isEs={isEs} program={coachProgram} onClose={() => setAssignOpen(false)} />
      ) : null}
    </div>
  );
};

export default WlProgramEditor;
