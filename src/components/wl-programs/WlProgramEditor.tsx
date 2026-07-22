import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarRange,
  ChevronDown,
  CloudCheck,
  CloudUpload,
  Trash2,
  Users,
} from 'lucide-react';
import type { Athlete, GeneratedProgram, SessionGoal } from '../../models/training';
import { useAppContext } from '../../context/AppContext';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useDebouncedCallback, useDebouncedCallbackWithControls } from '../../hooks/useDebouncedCallback';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { latestIntakeForWlProfile, mergeAthleteWithLatestIntake } from '../../utils/wlStatsBridge';
import OlympicProgramPlan, { type OlympicProgramPlanCreateActions } from '../OlympicProgramPlan';
import WlProgramAssignSheet from './WlProgramAssignSheet';
import { WlProgramPublishButton } from './WlProgramPublishButton';
import { countBlocksInProgramDay, isStructuralProgramChange, type ProgramSyncState } from './programSync';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import { WlEditorTitleField, WL_EDITOR_TITLE_MAX_LEN } from '../wl-shared/WlEditorTitleField';
import { WlProgramMobileHeaderTitle } from './WlProgramMobileHeaderTitle';
import '../wl-shared/app-breadcrumb.css';
import '../OlympicEnginePanel.css';
import '../wl-management/wl-management.css';
import './wl-programs.css';
import '../../styles/wl-editor-tokens.css';

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
const PROGRAM_AUTOSAVE_MS = 1800;
const WL_PROGRAM_EDITOR_TOOLBAR_PORTAL_ID = 'wl-program-editor-toolbar-anchor';
const WL_PROGRAM_EDITOR_CHROME_PORTAL_ID = 'wl-program-editor-chrome-anchor';

const WlProgramEditor: React.FC<WlProgramEditorProps> = ({ language, programId, onBack }) => {
  const isEs = language === 'ES';
  const isMobileLayout = useMediaQuery('(max-width: 1024px)');
  const { intakes } = useAppContext();
  const { pushAlert } = useWolfAlert();
  const {
    getCoachProgramById,
    updateCoachProgram,
    updateCoachProgramSession,
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
  const [syncState, setSyncState] = useState<ProgramSyncState>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [createActions, setCreateActions] = useState<OlympicProgramPlanCreateActions | null>(null);
  const [programTitle, setProgramTitle] = useState(() => coachProgram?.name ?? '');
  const [publishing, setPublishing] = useState(false);
  const [showEnrollmentsSheet, setShowEnrollmentsSheet] = useState(false);
  const [mobilePinnedChrome, setMobilePinnedChrome] = useState<React.ReactNode>(null);
  const [mobileExerciseFocus, setMobileExerciseFocus] = useState<{
    onBackToDay: () => void;
    exerciseTitle: string;
  } | null>(null);
  const [toolbarPortalNode, setToolbarPortalNode] = useState<HTMLElement | null>(null);
  const [chromePortalNode, setChromePortalNode] = useState<HTMLElement | null>(null);
  const mobileTitleInputRef = useRef<HTMLInputElement>(null);
  const programRef = useRef(program);
  const dirtyRef = useRef(false);
  const saveSeqRef = useRef(0);
  const editContextRef = useRef<import('../../models/notifications').ProgramEditContext | undefined>(undefined);
  const sessionBlockCountRef = useRef<number | null>(null);
  const lastPersistedProgramRef = useRef<GeneratedProgram | null>(null);

  useEffect(() => {
    programRef.current = program;
  }, [program]);

  const hasProgram = Boolean(program?.weeks?.length);

  useEffect(() => {
    dirtyRef.current = false;
    saveSeqRef.current = 0;
    if (coachProgram) {
      setProgram(coachProgram.program);
      lastPersistedProgramRef.current = coachProgram.program;
      setSyncState('saved');
    }
  }, [programId, coachProgram?.id]);

  useEffect(() => {
    if (!coachProgram || dirtyRef.current) return;
    setProgramTitle(coachProgram.name);
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
              !hasProgram
                ? programTitle.trim() ||
                  coachProgram.name ||
                  (isEs ? 'Sin nombre' : 'Untitled')
                : undefined,
            titleContent: mobileExerciseFocus ? (
              <div className="mobile-header-title mobile-header-title--exercise">
                {mobileExerciseFocus.exerciseTitle}
              </div>
            ) : hasProgram ? (
              <WlProgramMobileHeaderTitle
                isEs={isEs}
                value={programTitle}
                onChange={handleProgramTitleChange}
                onBlur={handleProgramTitleBlur}
                maxLength={PLAN_TITLE_MAX_LEN}
                placeholder={isEs ? 'Ej. Mesociclo fuerza' : 'E.g. Strength block'}
                inputRef={mobileTitleInputRef}
              />
            ) : undefined,
            back: mobileExerciseFocus
              ? {
                  label: isEs ? 'Volver al día' : 'Back to day',
                  onBack: mobileExerciseFocus.onBackToDay,
                }
              : {
                  label: isEs ? 'Volver a Programas' : 'Back to Programs',
                  onBack,
                },
            hideBrandIcon: true,
            pinnedBelowHeader: mobileExerciseFocus ? null : mobilePinnedChrome,
            lockEdgeSwipe: true,
          }
        : null,
    [
      isMobileLayout,
      coachProgram,
      programTitle,
      isEs,
      onBack,
      hasProgram,
      mobilePinnedChrome,
      mobileExerciseFocus,
      handleProgramTitleChange,
      handleProgramTitleBlur,
    ],
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

  const persistProgram = useCallback(
    async (p: GeneratedProgram, seq: number, structural = false) => {
      if (seq !== saveSeqRef.current) return;
      setSyncState('saving');
      try {
        const ctx = editContextRef.current;
        const needsFullProgram =
          structural ||
          ctx?.forceProgramSave === true ||
          isStructuralProgramChange(lastPersistedProgramRef.current, p);
        let saved = null;
        if (!needsFullProgram && ctx) {
          const week = p.weeks.find((w) => w.weekNumber === ctx.weekNumber);
          const day = week?.days.find((d) => d.dayNumber === ctx.dayNumber);
          if (day?.session) {
            saved = await updateCoachProgramSession(
              programId,
              ctx.weekNumber,
              ctx.dayNumber,
              day.session,
              ctx,
            );
          }
        }
        if (!saved) {
          saved = await updateCoachProgram(programId, { program: p, editContext: ctx });
        }
        if (seq !== saveSeqRef.current) return;
        if (!saved) {
          setSyncState('pending');
          return;
        }
        if (needsFullProgram && isStructuralProgramChange(p, saved.program)) {
          pushAlert({
            tone: 'error',
            title: isEs ? 'No se guardó el plan' : 'Plan not saved',
            message: isEs
              ? 'El servidor no aplicó el cambio de estructura. Reintenta guardar.'
              : 'The server did not apply the structure change. Try saving again.',
          });
          setSyncState('pending');
          return;
        }
        lastPersistedProgramRef.current = saved.program;
        dirtyRef.current = false;
        setProgram(saved.program);
        setLastSavedAt(new Date().toISOString());
        setSyncState('saved');
      } catch {
        if (seq === saveSeqRef.current) {
          setSyncState('pending');
        }
      }
    },
    [programId, updateCoachProgram, updateCoachProgramSession, pushAlert, isEs],
  );

  const { run: debouncedSave, flush: flushAutosave, cancel: cancelAutosave } = useDebouncedCallbackWithControls(
    (p: GeneratedProgram) => {
      saveSeqRef.current += 1;
      const seq = saveSeqRef.current;
      void persistProgram(p, seq, false);
    },
    PROGRAM_AUTOSAVE_MS,
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushAutosave();
    };
    const onBeforeUnload = () => flushAutosave();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      flushAutosave();
      cancelAutosave();
    };
  }, [flushAutosave, cancelAutosave]);

  const handleProgramChange = useCallback(
    (p: GeneratedProgram | null, editContext?: import('../../models/notifications').ProgramEditContext) => {
      if (!p) {
        dirtyRef.current = false;
        cancelAutosave();
        sessionBlockCountRef.current = null;
        setProgram(null);
        setSyncState('saved');
        return;
      }
      if (editContext) editContextRef.current = editContext;
      const ctx = editContext ?? editContextRef.current;
      const prevProgram = programRef.current;
      const blockCount =
        ctx != null ? countBlocksInProgramDay(p, ctx.weekNumber, ctx.dayNumber) : null;
      const prevCount = sessionBlockCountRef.current;
      const structural =
        ctx?.forceProgramSave === true ||
        isStructuralProgramChange(prevProgram, p) ||
        (blockCount != null && prevCount != null && blockCount !== prevCount);
      if (blockCount != null) sessionBlockCountRef.current = blockCount;

      dirtyRef.current = true;
      setSyncState('pending');
      setProgram(p);

      if (structural) {
        cancelAutosave();
        saveSeqRef.current += 1;
        const seq = saveSeqRef.current;
        void persistProgram(p, seq, true);
        return;
      }
      debouncedSave(p);
    },
    [debouncedSave, cancelAutosave, persistProgram],
  );

  const handleRetrySave = useCallback(() => {
    const latest = programRef.current;
    if (!latest) return;
    cancelAutosave();
    saveSeqRef.current += 1;
    const seq = saveSeqRef.current;
    void persistProgram(latest, seq, true);
  }, [cancelAutosave, persistProgram]);

  const handleActiveDayContext = useCallback(
    (ctx: { weekNumber: number; dayNumber: number }) => {
      const p = programRef.current;
      if (!p) return;
      sessionBlockCountRef.current = countBlocksInProgramDay(p, ctx.weekNumber, ctx.dayNumber);
    },
    [],
  );

  const enrolledCount = coachProgram?.enrolledAthletes?.length ?? 0;
  const isPublished = coachProgram?.status === 'published';

  const publishDockHint = useMemo(() => {
    if (!hasProgram || isPublished) return null;
    if (enrolledCount > 0) {
      return isEs
        ? `${enrolledCount} atleta${enrolledCount === 1 ? '' : 's'} inscrito${enrolledCount === 1 ? '' : 's'} — publica para que vean los cambios.`
        : `${enrolledCount} enrolled athlete${enrolledCount === 1 ? '' : 's'} — publish so they receive updates.`;
    }
    if (syncState === 'pending') {
      return isEs
        ? 'Tienes cambios sin guardar. Publicar los incluirá.'
        : 'You have unsaved changes. Publishing will include them.';
    }
    return isEs
      ? 'Marca el plan como listo para asignar.'
      : 'Mark the plan as ready to assign.';
  }, [hasProgram, isPublished, enrolledCount, syncState, isEs]);

  const handlePublish = async () => {
    const latest = programRef.current;
    if (!latest || publishing) return;
    cancelAutosave();
    saveSeqRef.current += 1;
    const seq = saveSeqRef.current;
    setPublishing(true);
    await persistProgram(latest, seq);
    if (seq !== saveSeqRef.current) {
      setPublishing(false);
      return;
    }
    try {
      const saved = await updateCoachProgram(programId, { program: latest, status: 'published' });
      if (!saved) {
        pushAlert({
          tone: 'error',
          title: isEs ? 'No se pudo publicar' : 'Could not publish',
          message: isEs
            ? 'Revisa tu conexión e inténtalo de nuevo.'
            : 'Check your connection and try again.',
        });
        setSyncState('pending');
        return;
      }
      dirtyRef.current = false;
      setSyncState('saved');
      const athletes = enrolledCount;
      pushAlert({
        tone: 'success',
        title: isEs ? 'Plan publicado' : 'Plan published',
        message:
          athletes > 0
            ? isEs
              ? `Los ${athletes} atleta${athletes === 1 ? '' : 's'} inscrito${athletes === 1 ? '' : 's'} recibirán este plan actualizado.`
              : `${athletes} enrolled athlete${athletes === 1 ? '' : 's'} will receive this updated plan.`
            : isEs
              ? 'El plan está listo. Asigna atletas cuando quieras.'
              : 'Plan is ready. Assign athletes whenever you like.',
      });
    } catch {
      setSyncState('pending');
      pushAlert({
        tone: 'error',
        title: isEs ? 'No se pudo publicar' : 'Could not publish',
        message: isEs
          ? 'Guarda los cambios e inténtalo otra vez.'
          : 'Save your changes and try again.',
      });
    } finally {
      if (seq === saveSeqRef.current) {
        setPublishing(false);
      }
    }
  };

  const saving = syncState === 'saving';
  const syncHint = useMemo(() => {
    if (!hasProgram) return null;
    if (syncState === 'saving') return isEs ? 'Guardando…' : 'Saving…';
    if (syncState === 'pending') return isEs ? 'Cambios pendientes' : 'Unsaved changes';
    return isEs ? 'Guardado' : 'Saved';
  }, [hasProgram, syncState, isEs]);

  const cloudSyncLabel = useMemo(() => {
    if (syncState === 'saving') {
      return isEs ? 'Subiendo cambios a la nube…' : 'Uploading changes to the cloud…';
    }
    if (syncState === 'pending') {
      return isEs ? 'Hay cambios sin subir a la nube' : 'Changes not yet uploaded to the cloud';
    }
    return isEs ? 'Cambios guardados en la nube' : 'Changes saved in the cloud';
  }, [syncState, isEs]);

  const actionDockHint = useMemo(() => {
    if (!hasProgram) {
      if (titleMissing) {
        return isEs ? 'Añade un nombre al plan y define la estructura.' : 'Add a plan name and set the structure.';
      }
      return isEs ? 'Define la estructura y genera el mesociclo.' : 'Set structure and generate the mesocycle.';
    }
    if (syncState === 'saving') return isEs ? 'Guardando…' : 'Saving…';
    if (syncState === 'pending') {
      return isEs ? 'Guardando al pausar…' : 'Saves when you pause editing.';
    }
    if (enrolledCount > 0) {
      return isEs
        ? `Cambios sincronizados. Los atletas inscritos reciben aviso del día editado.`
        : `Changes synced. Enrolled athletes are notified about the edited day.`;
    }
    return isEs ? 'Todo guardado.' : 'All changes saved.';
  }, [hasProgram, titleMissing, isEs, syncState, enrolledCount]);

  const SyncCloudIcon = syncState === 'saved' ? CloudCheck : CloudUpload;

  const syncStatusChip =
    hasProgram && syncHint ? (
      <span
        className={`wl-programs-sync-status wl-programs-sync-status--${syncState}`}
        role="status"
        aria-live="polite"
        title={cloudSyncLabel}
        aria-label={cloudSyncLabel}
      >
        <SyncCloudIcon size={14} strokeWidth={2.25} className="wl-programs-sync-status__icon" aria-hidden />
        <span className="wl-programs-sync-status__label">{syncHint}</span>
      </span>
    ) : null;

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

  const showActionDock = !hasProgram || !isPublished;
  const useStickyDesktopHead = !isMobileLayout;
  const portalToolbarToHead = useStickyDesktopHead && hasProgram;

  const editorProgramMeta = (
    <div className="wl-programs-editor-hero-meta wl-programs-editor-hero-meta--toolbar">
      <span className={`wl-programs-status-pill wl-programs-status-pill--${coachProgram.status}`}>
        {coachProgram.status === 'published' ? (isEs ? 'Publicado' : 'Published') : isEs ? 'Borrador' : 'Draft'}
      </span>
      {syncStatusChip}
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
      className={`wl-programs-panel wl-programs-editor${showActionDock ? '' : ' wl-programs-editor--no-dock'}${useStickyDesktopHead ? ' wl-programs-editor--sticky-head' : ''}${isMobileLayout && hasProgram ? ' wl-programs-editor--mobile-plan' : ''}`}
    >
      <header
        className={`wl-programs-editor-hero${useStickyDesktopHead ? ' wl-programs-editor-sticky-head' : ''}${portalToolbarToHead ? ' wl-programs-editor-sticky-head--unified' : ''}`}
      >
        {useStickyDesktopHead ? (
          <>
            <div className="wl-programs-editor-sticky-head__bar">
              <div className="wl-programs-editor-sticky-head__nav">
                <AppBreadcrumb
                  isEs={isEs}
                  className="app-breadcrumb--icon-back wl-programs-editor-crumb"
                  onBack={onBack}
                  backLabel={isEs ? 'Programas' : 'Programs'}
                  items={[]}
                />
                <WlEditorTitleField
                  isEs={isEs}
                  value={programTitle}
                  onChange={handleProgramTitleChange}
                  onBlur={handleProgramTitleBlur}
                  maxLength={PLAN_TITLE_MAX_LEN}
                  placeholder={isEs ? 'Ej. Mesociclo fuerza' : 'E.g. Strength block'}
                  label={isEs ? 'Nombre del plan' : 'Plan name'}
                  required
                  className="wl-programs-editor-sticky-title"
                />
              </div>
              {portalToolbarToHead ? (
                <div
                  ref={setToolbarPortalNode}
                  id={WL_PROGRAM_EDITOR_TOOLBAR_PORTAL_ID}
                  className="wl-programs-editor-toolbar-anchor wl-programs-editor-sticky-head__tabs"
                />
              ) : null}
              {(portalToolbarToHead || !hasProgram) ? (
                <div className="wl-programs-editor-sticky-head__status">{editorProgramMeta}</div>
              ) : null}
            </div>
            {portalToolbarToHead ? (
              <div
                ref={setChromePortalNode}
                id={WL_PROGRAM_EDITOR_CHROME_PORTAL_ID}
                className="wl-programs-editor-chrome-anchor wl-programs-embedded-plan"
              />
            ) : null}
          </>
        ) : (
          <>
            <div className="wl-programs-editor-hero-top">
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
                inputRef={isMobileLayout && hasProgram ? undefined : mobileTitleInputRef}
              />
            </div>
          </>
        )}
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
                onFlushAutosave={flushAutosave}
                skipLocalDraftPersistence
                mode="customize"
                programName={programTitle}
                onProgramNameChange={handleProgramTitleChange}
                customizeToolbarPortalId={portalToolbarToHead ? WL_PROGRAM_EDITOR_TOOLBAR_PORTAL_ID : null}
                customizeToolbarPortalNode={portalToolbarToHead ? toolbarPortalNode : null}
                customizeChromePortalId={portalToolbarToHead ? WL_PROGRAM_EDITOR_CHROME_PORTAL_ID : null}
                customizeChromePortalNode={portalToolbarToHead ? chromePortalNode : null}
                customizeToolbarEnd={portalToolbarToHead ? undefined : editorProgramMeta}
                coachProgramId={programId}
                enrolledAthletes={coachProgram.enrolledAthletes}
                programSyncState={syncState}
                lastSavedAt={lastSavedAt}
                onRetryProgramSave={handleRetrySave}
                onActiveDayContext={handleActiveDayContext}
                onMobilePinnedChrome={isMobileLayout ? setMobilePinnedChrome : undefined}
                onMobileExerciseFocusChange={isMobileLayout ? setMobileExerciseFocus : undefined}
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
          {!hasProgram ? (
            <p className="wl-programs-action-dock__hint">{actionDockHint}</p>
          ) : publishDockHint ? (
            <p className="wl-programs-action-dock__publish-hint">{publishDockHint}</p>
          ) : null}
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
              <WlProgramPublishButton
                isEs={isEs}
                disabled={saving || !hasProgram}
                loading={publishing}
                onClick={() => void handlePublish()}
              />
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
