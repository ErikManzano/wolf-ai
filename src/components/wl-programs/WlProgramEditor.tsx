import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarRange,
  ChevronDown,
  Trash2,
  Users,
} from 'lucide-react';
import type { Athlete, GeneratedProgram, SessionGoal } from '../../models/training';
import { useAppContext } from '../../context/AppContext';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { latestIntakeForWlProfile, mergeAthleteWithLatestIntake } from '../../utils/wlStatsBridge';
import OlympicProgramPlan, { type OlympicProgramPlanCreateActions } from '../OlympicProgramPlan';
import WlProgramAssignSheet from './WlProgramAssignSheet';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import { WlEditorTitleField, WL_EDITOR_TITLE_MAX_LEN } from '../wl-shared/WlEditorTitleField';
import '../wl-shared/app-breadcrumb.css';
import '../OlympicEnginePanel.css';
import '../wl-management/wl-management.css';
import './wl-programs.css';

interface WlProgramEditorProps {
  language: 'ES' | 'EN';
  programId: string;
  onBack: () => void;
}

const PRIMARY_GOAL: SessionGoal = 'strength';

const REFERENCE_ATHLETE: Athlete = {
  id: 'ref-athlete',
  name: 'Reference',
  level: 'intermediate',
  bodyweight: 80,
  oneRM: { snatch: 80, cleanJerk: 100, backSquat: 140, frontSquat: 120 },
  fatigueScore: 20,
  readinessScore: 80,
};

const PLAN_TITLE_MAX_LEN = WL_EDITOR_TITLE_MAX_LEN;

const WlProgramEditor: React.FC<WlProgramEditorProps> = ({ language, programId, onBack }) => {
  const isEs = language === 'ES';
  const isMobileLayout = useMediaQuery('(max-width: 1024px)');
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

  const [athleteId, setAthleteId] = useState(
    () => coachAthletes.find((a) => a.id === 'ath-erik')?.id ?? coachAthletes[0]?.id ?? '',
  );
  const [program, setProgram] = useState<GeneratedProgram | null>(coachProgram?.program ?? null);
  const [saving, setSaving] = useState(false);
  const [createActions, setCreateActions] = useState<OlympicProgramPlanCreateActions | null>(null);
  const [programTitle, setProgramTitle] = useState(() => coachProgram?.name ?? '');
  const [showEnrollmentsSheet, setShowEnrollmentsSheet] = useState(false);
  const programRef = useRef(program);
  programRef.current = program;

  const hasProgram = Boolean(program?.weeks?.length);

  useEffect(() => {
    if (coachProgram) setProgram(coachProgram.program);
  }, [coachProgram?.id, coachProgram?.updatedAt]);

  useEffect(() => {
    if (coachProgram) setProgramTitle(coachProgram.name);
  }, [coachProgram?.id, coachProgram?.name]);

  const debouncedSaveTitle = useDebouncedCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === coachProgram?.name) return;
    await updateCoachProgram(programId, { name: trimmed });
  }, 600);

  const handleProgramTitleChange = useCallback(
    (value: string) => {
      setProgramTitle(value);
      debouncedSaveTitle(value);
    },
    [debouncedSaveTitle],
  );

  const handleProgramTitleBlur = useCallback(
    (title: string) => {
      void debouncedSaveTitle(title);
    },
    [debouncedSaveTitle],
  );

  const titleMissing = programTitle.trim().length === 0;

  const mobileTopBar = useMemo(
    () =>
      isMobileLayout && coachProgram
        ? {
            title:
              programTitle.trim() ||
              coachProgram.name ||
              (isEs ? 'Sin nombre' : 'Untitled'),
            back: {
              label: isEs ? 'Volver a Programas' : 'Back to Programs',
              onBack,
            },
            lockEdgeSwipe: true,
          }
        : null,
    [isMobileLayout, coachProgram, programTitle, isEs, onBack],
  );
  useMobileTopBar(mobileTopBar);

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

  const debouncedSave = useDebouncedCallback(async (p: GeneratedProgram) => {
    setSaving(true);
    try {
      await updateCoachProgram(programId, { program: p });
    } finally {
      setSaving(false);
    }
  }, 1200);

  const handleProgramChange = useCallback(
    (p: GeneratedProgram | null) => {
      setProgram(p);
      if (p) void debouncedSave(p);
    },
    [debouncedSave],
  );

  const handlePublish = async () => {
    if (!program) return;
    setSaving(true);
    try {
      await updateCoachProgram(programId, { program, status: 'published' });
    } finally {
      setSaving(false);
    }
  };

  const actionDockHint = useMemo(() => {
    if (!hasProgram) {
      if (titleMissing) {
        return isEs ? 'Añade un nombre al plan y define la estructura.' : 'Add a plan name and set the structure.';
      }
      return isEs ? 'Define la estructura y genera el mesociclo.' : 'Set structure and generate the mesocycle.';
    }
    if (saving) return isEs ? 'Guardando…' : 'Saving…';
    return isEs ? 'Los cambios se guardan automáticamente.' : 'Changes save automatically.';
  }, [hasProgram, titleMissing, isEs, saving]);

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

  const isPublished = coachProgram.status === 'published';
  const showActionDock = !hasProgram || !isPublished;

  const editorProgramMeta = (
    <div className="wl-programs-editor-hero-meta wl-programs-editor-hero-meta--toolbar">
      <span className={`wl-programs-status-pill wl-programs-status-pill--${coachProgram.status}`}>
        {coachProgram.status === 'published' ? (isEs ? 'Publicado' : 'Published') : isEs ? 'Borrador' : 'Draft'}
      </span>
      {hasProgram ? (
        <button
          type="button"
          className="wl-programs-enrolled-chip wl-programs-enrolled-chip--action"
          onClick={() => setShowEnrollmentsSheet(true)}
          aria-haspopup="dialog"
        >
          <Users size={14} aria-hidden />
          {coachProgram.enrolledAthletes.length === 0
            ? isEs
              ? 'Gestionar inscritos'
              : 'Manage enrollments'
            : isEs
              ? `${coachProgram.enrolledAthletes.length} inscrito${coachProgram.enrolledAthletes.length === 1 ? '' : 's'}`
              : `${coachProgram.enrolledAthletes.length} enrolled`}
          <ChevronDown size={14} aria-hidden className="wl-programs-enrolled-chip__chev" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div
      className={`wl-programs-panel wl-programs-editor${showActionDock ? '' : ' wl-programs-editor--no-dock'}`}
    >
      <header className="wl-programs-editor-hero">
        <div className="wl-programs-editor-hero-top">
          {!isMobileLayout ? (
            <AppBreadcrumb
              isEs={isEs}
              className="app-breadcrumb--icon-back wl-programs-editor-crumb"
              onBack={onBack}
              backLabel={isEs ? 'Programas' : 'Programs'}
              items={[
                { label: isEs ? 'Programas' : 'Programs' },
                { label: programTitle.trim() || coachProgram.name || (isEs ? 'Sin nombre' : 'Untitled') },
              ]}
            />
          ) : null}
          {!hasProgram ? editorProgramMeta : null}
        </div>
        <div className="wl-programs-editor-hero-main">
          <WlEditorTitleField
            isEs={isEs}
            value={programTitle}
            onChange={handleProgramTitleChange}
            onBlur={handleProgramTitleBlur}
            maxLength={PLAN_TITLE_MAX_LEN}
            placeholder={isEs ? 'Ej. Mesociclo fuerza' : 'E.g. Strength block'}
            label={isEs ? 'Nombre del plan' : 'Plan name'}
            required
          />
        </div>
      </header>

      <div className="wl-programs-editor-body">
        <div className="wl-programs-editor-stage">
          <div
            className={`wl-programs-customize-wrap wolf-engine--customize wl-programs-embedded-plan${!hasProgram ? ' wl-programs-customize-wrap--create' : ''}`}
          >
            {!hasProgram ? (
              <OlympicProgramPlan
                language={language}
                athleteId={athleteId}
                athlete={athleteForEngine}
                athleteForEngine={athleteForEngine}
                primaryGoal={PRIMARY_GOAL}
                program={program}
                onProgramChange={handleProgramChange}
                onCreateActionsChange={setCreateActions}
                externalCreateActions
                skipLocalDraftPersistence
                mode="create"
                programName={programTitle}
                onProgramNameChange={handleProgramTitleChange}
              />
            ) : (
              <OlympicProgramPlan
                language={language}
                athleteId={athleteId}
                athlete={athleteForEngine}
                athleteForEngine={athleteForEngine}
                primaryGoal={PRIMARY_GOAL}
                program={program}
                onProgramChange={handleProgramChange}
                skipLocalDraftPersistence
                mode="customize"
                programName={programTitle}
                onProgramNameChange={handleProgramTitleChange}
                customizeToolbarEnd={editorProgramMeta}
              />
            )}
          </div>
        </div>
      </div>

      {showActionDock ? (
        <footer
          className={`wl-programs-action-dock${hasProgram ? ' wl-programs-action-dock--compact' : ''}`}
          aria-label={isEs ? 'Acciones del paso' : 'Step actions'}
        >
          {!hasProgram ? <p className="wl-programs-action-dock__hint">{actionDockHint}</p> : null}
          <div className="wl-programs-action-dock__actions">
            {!hasProgram ? (
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
              <button
                type="button"
                className="btn-primary wl-programs-action-dock__publish"
                disabled={saving || !hasProgram}
                onClick={() => void handlePublish()}
              >
                {isEs ? 'Publicar' : 'Publish'}
              </button>
            )}
          </div>
        </footer>
      ) : null}

      {showEnrollmentsSheet ? (
        <WlProgramAssignSheet
          isEs={isEs}
          program={coachProgram}
          onClose={() => setShowEnrollmentsSheet(false)}
        />
      ) : null}
    </div>
  );
};

export default WlProgramEditor;
