import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Gauge, Pencil, Trash2, UserCog, Users } from 'lucide-react';
import type { GeneratedProgram, SessionGoal } from '../models/training';
import { K_VALUE_RANGES } from '../models/training';
import { mockAthletes } from '../data/loadMockData';
import type { ProgramAssignment } from '../models/training';
import { useAppContext } from '../context/AppContext';
import OlympicProgramPlan from './OlympicProgramPlan';
import { useWolfAssign } from '../context/WolfAssignContext';
import { latestIntakeForWlProfile, mergeAthleteWithLatestIntake, parseIntakeDeadlift } from '../utils/wlStatsBridge';
import './OlympicEnginePanel.css';

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
  const { assignments, updateAssignmentProgram, removeAssignment } = useWolfAssign();
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
      fatigue: isEs ? 'Fatiga (sim.)' : 'Fatigue (sim.)',
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
  const [fatigueOverride, setFatigueOverride] = useState(48);
  const [program, setProgram] = useState<GeneratedProgram | null>(() => readStoredProgram());
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  /** Evita condición de carrera al generar un plan nuevo tras editar una asignación. */
  const editingAssignmentRef = useRef<string | null>(null);

  useEffect(() => {
    editingAssignmentRef.current = editingAssignmentId;
  }, [editingAssignmentId]);

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
        updateAssignmentProgram(aid, p);
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      } catch {
        /* ignore */
      }
    },
    [updateAssignmentProgram],
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

  const athleteForEngine = useMemo(() => {
    if (!athlete) return null;
    return { ...athlete, fatigueScore: fatigueOverride };
  }, [athlete, fatigueOverride]);

  const kRange = athlete ? K_VALUE_RANGES[athlete.level] : null;

  const coachAssignments = useMemo(() => [...assignments].reverse(), [assignments]);
  const canAdvanceToManagement = Boolean(program);
  const canAdvanceToCustomize = Boolean(program);
  const stepProgress = Math.round((activeStep / 4) * 100);

  const goToStep = useCallback(
    (next: StepId) => {
      if (next === 4 && !canAdvanceToManagement) return;
      if (next === 3 && !canAdvanceToCustomize) return;
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

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(isEs ? 'es' : 'en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className={`wolf-engine${activeStep === 3 ? ' wolf-engine--customize' : ''}`}>
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

      <div className="wolf-engine-tabs wolf-engine-tabs--4" role="tablist" aria-label={t.stepperAria}>
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
          <label className="wolf-engine-field wolf-engine-field-wide">
            <span>
              {t.fatigue}: {fatigueOverride}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={fatigueOverride}
              onChange={(e) => setFatigueOverride(Number(e.target.value))}
            />
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
        {athleteForEngine && athlete && (activeStep === 2 || activeStep === 3 || activeStep === 4) && (
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
              }}
              mode={activeStep === 2 ? 'create' : activeStep === 3 ? 'customize' : 'assign'}
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
                  disabled={(activeStep === 2 && !canAdvanceToCustomize) || (activeStep >= 3 && !canAdvanceToManagement)}
                >
                  {t.nextStep}
                </button>
              )}
            </div>
            {activeStep === 2 && !canAdvanceToCustomize && (
              <p className="wolf-program-inline-hint">{t.mustGenerateBeforeNext}</p>
            )}
            {activeStep >= 3 && !canAdvanceToManagement && (
              <p className="wolf-program-inline-hint">{t.mustGenerateBeforeNext}</p>
            )}
          </div>
        )}
      </div>

      {activeStep === 4 && (
        <section
          className="wolf-coach-assignments wolf-coach-assignments--secondary"
          aria-labelledby="wolf-coach-assigned-heading"
        >
          <div className="wolf-coach-assignments-head">
            <Users size={18} strokeWidth={2} className="wolf-coach-assignments-ico" aria-hidden />
            <div>
              <span className="wolf-coach-assignments-badge">{t.assignedSectionBadge}</span>
              <h2 id="wolf-coach-assigned-heading" className="wolf-coach-assignments-title">
                {t.assignedTitle}
              </h2>
              <p className="wolf-coach-assignments-hint">{t.assignedHint}</p>
            </div>
          </div>
          {coachAssignments.length === 0 ? (
            <p className="wolf-coach-assignments-empty">{t.noAssignments}</p>
          ) : (
            <ul className="wolf-coach-assignment-list">
              {coachAssignments.map((asg) => {
                const prof = mockAthletes.find((a) => a.id === asg.athleteProfileId);
                const active = editingAssignmentId === asg.id;
                return (
                  <li key={asg.id} className={`wolf-coach-assignment-card ${active ? 'wolf-coach-assignment-card--active' : ''}`}>
                    <div className="wolf-coach-assignment-main">
                      <strong className="wolf-coach-assignment-name">{asg.program.name}</strong>
                      <span className="wolf-coach-assignment-meta">
                        {prof?.name ?? asg.athleteProfileId} · {asg.program.totalWeeks}w · {asg.program.daysPerWeek}d/w
                      </span>
                      <span className="wolf-coach-assignment-meta">
                        {t.version} {asg.version} · {asg.versionHistory.length} {t.history}
                      </span>
                      <span className="wolf-coach-assignment-date">
                        {t.assignedPrefix}: {fmtDate(asg.assignedAt)}
                      </span>
                    </div>
                    <div className="wolf-coach-assignment-actions">
                      <button
                        type="button"
                        className="btn-secondary wolf-coach-assignment-btn"
                        onClick={() => openAssignmentForEdit(asg)}
                      >
                        <Pencil size={16} aria-hidden /> {t.editPlan}
                      </button>
                      <button
                        type="button"
                        className="wolf-coach-assignment-btn wolf-coach-assignment-btn--danger"
                        title={t.remove}
                        aria-label={`${t.remove}: ${asg.program.name}`}
                        onClick={() => {
                          if (active) {
                            editingAssignmentRef.current = null;
                            setEditingAssignmentId(null);
                            setProgram(readStoredProgram());
                          }
                          removeAssignment(asg.id);
                        }}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

    </div>
  );
};

export default OlympicEnginePanel;
