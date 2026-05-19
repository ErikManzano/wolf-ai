import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Gauge, UserCog } from 'lucide-react';
import type { GeneratedProgram, SessionGoal } from '../models/training';
import { K_VALUE_RANGES } from '../models/training';
import { mockAthletes } from '../data/loadMockData';
import type { ProgramAssignment } from '../models/training';
import { useAppContext } from '../context/AppContext';
import OlympicProgramPlan from './OlympicProgramPlan';
import { useWolfAssign } from '../context/WolfAssignContext';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { latestIntakeForWlProfile, mergeAthleteWithLatestIntake, parseIntakeDeadlift } from '../utils/wlStatsBridge';
import WlAssignmentManagement, { WL_MANAGE_FOCUS_KEY } from './wl-management/WlAssignmentManagement';
import './OlympicEnginePanel.css';
import '../styles/interactive.css';

const STORAGE_KEY = 'wolf_olympic_program_v1';

function readStoredProgram(): GeneratedProgram | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as GeneratedProgram;
    return p?.weeks?.length ? p : null;
  } catch {
    return null;
  }
}

interface OlympicEnginePanelProps {
  language: 'ES' | 'EN';
}

type StepId = 1 | 2 | 3 | 4;
const GOALS: SessionGoal[] = ['technique', 'strength', 'power'];

const OlympicEnginePanel: React.FC<OlympicEnginePanelProps> = ({ language }) => {
  const isEs = language === 'ES';
  const { assignProgramToAthlete, updateAssignmentProgram, assignments } = useWolfAssign();
  const { intakes } = useAppContext();

  const t = useMemo(
    () => ({
      title: isEs ? 'Motor halterofilia' : 'Olympic lifting engine',
      coachBadge: isEs ? 'Panel coach' : 'Coach panel',
      subtitle: isEs
        ? 'Crea el mesociclo en minutos: define semanas, ajusta sesiones y asigna al atleta.'
        : 'Build a mesocycle in minutes: set weeks, tune sessions, and assign to the athlete.',
      stepperAria: isEs ? 'Flujo principal de planificación WL' : 'Primary WL planning flow',
      contextHeading: isEs ? 'Contexto del plan' : 'Plan context',
      step1: isEs ? 'Contexto del plan' : 'Plan context',
      step2: isEs ? 'Creación del plan' : 'Plan creation',
      step3: isEs ? 'Personalización' : 'Plan customization',
      step4: isEs ? 'Asignación y gestión' : 'Assignment & management',
      nextStep: isEs ? 'Continuar' : 'Continue',
      prevStep: isEs ? 'Volver' : 'Back',
      athlete: isEs ? 'Atleta objetivo' : 'Target athlete',
      goal: isEs ? 'Objetivo' : 'Goal',
      status: isEs ? 'Estado' : 'Status',
      kBand: isEs ? 'Banda K' : 'K band',
      technique: isEs ? 'Técnica' : 'Technique',
      strength: isEs ? 'Fuerza' : 'Strength',
      power: isEs ? 'Potencia' : 'Power',
      undertrained: isEs ? 'Infra-carga' : 'Undertrained',
      optimal: isEs ? 'Óptimo' : 'Optimal',
      overtrained: isEs ? 'Sobre-carga' : 'Overtrained',
      assignedTitle: isEs ? 'Planes asignados' : 'Assigned plans',
      assignedHint: isEs
        ? 'Después de crear el mesociclo, los planes enviados aparecen aquí. Editándolos se actualiza «Mi plan WL» del atleta.'
        : 'After you build a mesocycle, assigned plans show up here. Edits sync to the athlete’s “My WL plan”.',
      assignedSectionBadge: isEs ? 'Seguimiento' : 'Follow-up',
      editPlan: isEs ? 'Editar en motor' : 'Edit in engine',
      remove: isEs ? 'Quitar' : 'Remove',
      noAssignments: isEs ? 'Aún no hay asignaciones. Genera un programa y pulsa «Asignar al atleta».' : 'No assignments yet. Generate a program and tap “Assign to athlete”.',
      assignedPrefix: isEs ? 'Asignado' : 'Assigned',
      version: isEs ? 'Versión' : 'Version',
      history: isEs ? 'historial' : 'history',
      mustGenerateBeforeNext: isEs
        ? 'Genera el mesociclo en el paso 2 para continuar.'
        : 'Generate a mesocycle in step 2 to continue.',
      prsTitle: isEs ? 'PRs y perfil del atleta' : 'Athlete PRs & profile',
      prsHint: isEs
        ? 'Las cargas se calculan con tus PRs más recientes de «Stats y PRs». Si faltan datos, se usa el perfil demo.'
        : 'Loads use your latest “Stats & PRs” PRs. If data is missing, the demo profile is used.',
      statsBadge: isEs ? 'Último Stats' : 'Latest Stats',
      prsDead: isEs ? 'Peso muerto (Stats)' : 'Deadlift (Stats)',
      prsSn: 'Snatch',
      prsCj: 'C&J',
      prsBs: isEs ? 'Sentadilla trasera' : 'Back squat',
      prsFs: isEs ? 'Sentadilla frontal' : 'Front squat',
      prsBw: isEs ? 'Peso corporal' : 'Bodyweight',
    }),
    [isEs],
  );

  const goalLabel = (g: SessionGoal) =>
    g === 'technique' ? t.technique : g === 'strength' ? t.strength : t.power;

  const [activeStep, setActiveStep] = useState<StepId>(1);
  const [athleteId, setAthleteId] = useState(
    () => mockAthletes.find((a) => a.id === 'ath-you')?.id ?? mockAthletes[0]?.id ?? '',
  );
  const [goal, setGoal] = useState<SessionGoal>('strength');
  const [program, setProgram] = useState<GeneratedProgram | null>(() => readStoredProgram());
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  /** Evita condición de carrera al generar un plan nuevo tras editar una asignación. */
  const editingAssignmentRef = useRef<string | null>(null);

  useEffect(() => {
    editingAssignmentRef.current = editingAssignmentId;
  }, [editingAssignmentId]);

  const debouncedAssignmentSync = useDebouncedCallback((assignmentId: string, p: GeneratedProgram) => {
    updateAssignmentProgram(assignmentId, p);
  }, 600);

  const handleProgramChange = useCallback(
    (p: GeneratedProgram | null) => {
      setProgram(p);
      if (!p) {
        editingAssignmentRef.current = null;
        setEditingAssignmentId(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
      const aid = editingAssignmentRef.current;
      if (aid) {
        debouncedAssignmentSync(aid, p);
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      } catch {
        /* ignore */
      }
    },
    [debouncedAssignmentSync, updateAssignmentProgram],
  );

  const onNewProgramGenerated = useCallback(() => {
    editingAssignmentRef.current = null;
    setEditingAssignmentId(null);
  }, []);

  const openAssignmentForEdit = useCallback((asg: ProgramAssignment) => {
    editingAssignmentRef.current = asg.id;
    setEditingAssignmentId(asg.id);
    setAthleteId(asg.athleteProfileId);
    setProgram(asg.program);
    setActiveStep(3);
  }, []);

  const baseWlAthlete = useMemo(() => mockAthletes.find((a) => a.id === athleteId), [athleteId]);
  const latestStatsIntake = useMemo(() => latestIntakeForWlProfile(athleteId, intakes), [athleteId, intakes]);
  const athlete = useMemo(
    () => (baseWlAthlete ? mergeAthleteWithLatestIntake(baseWlAthlete, latestStatsIntake) : null),
    [baseWlAthlete, latestStatsIntake],
  );
  const deadliftFromStats = useMemo(() => parseIntakeDeadlift(latestStatsIntake), [latestStatsIntake]);

  const athleteForEngine = useMemo(() => athlete, [athlete]);

  const kRange = athlete ? K_VALUE_RANGES[athlete.level] : null;

  const canAdvanceToManagement = Boolean(program) || assignments.length > 0;
  const canAdvanceToCustomize = Boolean(program);
  const stepProgress = Math.round((activeStep / 4) * 100);

  const goToStep = useCallback(
    (next: StepId) => {
      if (next === 3 && !canAdvanceToCustomize) return;
      if (next === 4 && !canAdvanceToManagement) return;
      setActiveStep(next);
    },
    [canAdvanceToManagement, canAdvanceToCustomize],
  );

  const stepItems = useMemo(
    () =>
      [
        { id: 1 as StepId, label: t.step1, enabled: true },
        { id: 2 as StepId, label: t.step2, enabled: true },
        { id: 3 as StepId, label: t.step3, enabled: canAdvanceToCustomize },
        { id: 4 as StepId, label: t.step4, enabled: canAdvanceToManagement },
      ] as const,
    [t.step1, t.step2, t.step3, t.step4, canAdvanceToCustomize, canAdvanceToManagement],
  );

  useEffect(() => {
    try {
      if (sessionStorage.getItem(WL_MANAGE_FOCUS_KEY)) {
        setActiveStep(4);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleAssignDraft = useCallback(() => {
    if (!program) return;
    const id = assignProgramToAthlete(program, athleteId);
    editingAssignmentRef.current = id;
    setEditingAssignmentId(id);
    setActiveStep(4);
  }, [program, athleteId, assignProgramToAthlete]);

  const handleDiscardDraft = useCallback(() => {
    editingAssignmentRef.current = null;
    setEditingAssignmentId(null);
    setProgram(readStoredProgram());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handleOpenProgramInEngine = useCallback((p: GeneratedProgram, profileId?: string) => {
    if (profileId) setAthleteId(profileId);
    setProgram(p);
    editingAssignmentRef.current = null;
    setEditingAssignmentId(null);
    setActiveStep(3);
  }, []);

  const athleteDisplayName = athlete?.name ?? athleteId;

  return (
    <div
      className={`wolf-engine${activeStep === 3 ? ' wolf-engine--customize' : ''}${activeStep === 4 ? ' wolf-engine--manage' : ''}`}
    >
      <header className="wolf-coach-hero">
        <div className="wolf-coach-hero-accent" aria-hidden />
        <div className="wolf-coach-hero-inner">
          <div className="wolf-coach-hero-icon-wrap">
            <Gauge size={26} strokeWidth={2} />
          </div>
          <div className="wolf-coach-hero-text">
            <span className="wolf-coach-badge">
              <UserCog size={13} strokeWidth={2} />
              {t.coachBadge}
            </span>
            <h1 className="wolf-coach-title view-title">{t.title}</h1>
            <p className="wolf-coach-sub">{t.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="wolf-engine-stepper-rail" aria-label={t.stepperAria}>
        <div className="wolf-engine-tabs wolf-engine-tabs--4" role="tablist">
        {stepItems.map((step) => {
          const isActive = activeStep === step.id;
          const isDone = activeStep > step.id;
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'step' : undefined}
              className={`wolf-tab ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => goToStep(step.id)}
              disabled={!step.enabled}
            >
              <span className="wolf-step-dot" aria-hidden>
                {isDone ? '✓' : step.id}
              </span>
              <span className="wolf-step-label">{step.label}</span>
            </button>
          );
        })}
      </div>
      <div className="wolf-stepper-progress" aria-hidden>
        <div className="wolf-stepper-progress-track">
          <div className="wolf-stepper-progress-fill" style={{ width: `${stepProgress}%` }} />
        </div>
        <span className="wolf-stepper-progress-label">{stepProgress}%</span>
      </div>
      </div>

      <div className={`wolf-engine-controls-card${activeStep === 1 ? '' : ' wolf-engine-controls-card--hidden'}`}>
        <h2 id="wolf-engine-context-heading" className="wolf-engine-context-heading">
          {t.contextHeading}
        </h2>
        <div className="wolf-engine-shared-controls">
          <label className="wolf-engine-field">
            <span>{t.athlete}</span>
            <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
              {mockAthletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.level})
                </option>
              ))}
            </select>
          </label>
          <label className="wolf-engine-field">
            <span>{t.goal}</span>
            <select value={goal} onChange={(e) => setGoal(e.target.value as SessionGoal)}>
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {goalLabel(g)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {kRange && (
          <div className="wolf-engine-band wolf-engine-band--chip">
            <span className="wolf-engine-band-label">{t.kBand}</span>
            <span className="wolf-engine-band-value">
              {kRange[0]}–{kRange[1]}
            </span>
            <span className="wolf-engine-band-level">({athlete?.level})</span>
          </div>
        )}

        {athlete && (
          <div className="wolf-coach-athlete-prs" aria-label={t.prsTitle}>
            <div className="wolf-coach-athlete-prs-head">
              <BarChart3 size={18} strokeWidth={2} aria-hidden />
              <div>
                <h3 className="wolf-coach-athlete-prs-title">{t.prsTitle}</h3>
                <p className="wolf-coach-athlete-prs-hint">{t.prsHint}</p>
                {latestStatsIntake && (
                  <p className="wolf-coach-stats-badge">
                    {t.statsBadge}: {latestStatsIntake.date}
                    {latestStatsIntake.coachNote ? ` · ${latestStatsIntake.coachNote}` : ''}
                  </p>
                )}
              </div>
            </div>
            <dl className="wolf-coach-athlete-prs-grid">
              <div className="wolf-coach-pr-item">
                <dt>{t.prsBw}</dt>
                <dd>{athlete.bodyweight} kg</dd>
              </div>
              <div className="wolf-coach-pr-item">
                <dt>{t.prsSn}</dt>
                <dd>{athlete.oneRM.snatch} kg</dd>
              </div>
              <div className="wolf-coach-pr-item">
                <dt>{t.prsCj}</dt>
                <dd>{athlete.oneRM.cleanJerk} kg</dd>
              </div>
              <div className="wolf-coach-pr-item">
                <dt>{t.prsBs}</dt>
                <dd>{athlete.oneRM.backSquat} kg</dd>
              </div>
              <div className="wolf-coach-pr-item">
                <dt>{t.prsFs}</dt>
                <dd>{athlete.oneRM.frontSquat} kg</dd>
              </div>
              {deadliftFromStats != null && deadliftFromStats > 0 && (
                <div className="wolf-coach-pr-item">
                  <dt>{t.prsDead}</dt>
                  <dd>{deadliftFromStats} kg</dd>
                </div>
              )}
            </dl>
          </div>
        )}
        <div className="wolf-stepper-actions">
          <button type="button" className="btn-primary" onClick={() => goToStep(2)}>
            {t.nextStep}
          </button>
        </div>
      </div>

      <div className="content-area wolf-engine-content">
        {activeStep === 4 && athleteForEngine && athlete ? (
          <WlAssignmentManagement
            language={language}
            program={program}
            athleteId={athleteId}
            athleteName={athleteDisplayName}
            editingAssignmentId={editingAssignmentId}
            onAssignDraft={handleAssignDraft}
            onCustomizeDraft={() => goToStep(3)}
            onDiscardDraft={handleDiscardDraft}
            onEditAssignment={openAssignmentForEdit}
            onOpenProgramInEngine={handleOpenProgramInEngine}
          />
        ) : null}
        {athleteForEngine && athlete && (activeStep === 2 || activeStep === 3) && (
          <div className={`wolf-step-content${activeStep === 3 ? ' wolf-step-content--customize' : ''}`}>
            <OlympicProgramPlan
              language={language}
              athleteId={athleteId}
              athlete={athlete}
              athleteForEngine={athleteForEngine}
              primaryGoal={goal}
              program={program}
              onProgramChange={handleProgramChange}
              skipLocalDraftPersistence={Boolean(editingAssignmentId)}
              editingAssignmentId={editingAssignmentId}
              onProgramGenerated={onNewProgramGenerated}
              onAssignmentSynced={(id) => {
                editingAssignmentRef.current = id;
                setEditingAssignmentId(id);
                setActiveStep(4);
              }}
              mode={activeStep === 2 ? 'create' : 'customize'}
            />
            <div className="wolf-stepper-actions">
              {activeStep > 1 && (
                <button type="button" className="btn-secondary" onClick={() => goToStep((activeStep - 1) as StepId)}>
                  {t.prevStep}
                </button>
              )}
              {activeStep < 4 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => goToStep((activeStep + 1) as StepId)}
                  disabled={activeStep === 2 && !canAdvanceToCustomize}
                >
                  {t.nextStep}
                </button>
              )}
            </div>
            {activeStep === 2 && !canAdvanceToCustomize && (
              <p className="wolf-program-inline-hint">{t.mustGenerateBeforeNext}</p>
            )}
          </div>
        )}
      </div>


    </div>
  );
};

export default OlympicEnginePanel;
