import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudCheck, CloudUpload } from 'lucide-react';
import type { Athlete, GeneratedProgram, SessionGoal } from '../../models/training';
import { useAppContext } from '../../context/AppContext';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useDebouncedCallbackWithControls } from '../../hooks/useDebouncedCallback';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { latestIntakeForWlProfile, mergeAthleteWithLatestIntake } from '../../utils/wlStatsBridge';
import OlympicProgramPlan from '../OlympicProgramPlan';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import { WlEditorTitleField, WL_EDITOR_TITLE_MAX_LEN } from '../wl-shared/WlEditorTitleField';
import { formatProgramDateRange } from '../../utils/programSchedule';
import type { ProgramSyncState } from './programSync';
import '../wl-shared/app-breadcrumb.css';
import '../OlympicEnginePanel.css';
import './wl-programs.css';
import '../../styles/wl-editor-tokens.css';

const PRIMARY_GOAL: SessionGoal = 'strength';
const PROGRAM_AUTOSAVE_MS = 1800;
const WL_PROGRAM_EDITOR_TOOLBAR_PORTAL_ID = 'wl-program-editor-toolbar-anchor';
const WL_PROGRAM_EDITOR_CHROME_PORTAL_ID = 'wl-program-editor-chrome-anchor';

const REFERENCE_ATHLETE: Athlete = {
  id: 'ref-athlete',
  name: 'Reference',
  level: 'intermediate',
  bodyweight: 80,
  oneRM: { snatch: 80, cleanJerk: 100, backSquat: 140, frontSquat: 120 },
  fatigueScore: 20,
  readinessScore: 80,
};

interface WlAssignmentProgramEditorProps {
  language: 'ES' | 'EN';
  assignmentId: string;
  onBack: () => void;
}

const WlAssignmentProgramEditor: React.FC<WlAssignmentProgramEditorProps> = ({
  language,
  assignmentId,
  onBack,
}) => {
  const isEs = language === 'ES';
  const isMobileLayout = useMediaQuery('(max-width: 1024px)');
  const { intakes } = useAppContext();
  const {
    assignments,
    updateAssignmentProgram,
    wlAthletes,
    openProgramEditor,
  } = useWolfAssign();

  const assignment = useMemo(
    () => assignments.find((a) => a.id === assignmentId) ?? null,
    [assignments, assignmentId],
  );

  const athleteProfileId = assignment?.athleteProfileId ?? '';
  const baseWlAthlete = useMemo(
    () => wlAthletes.find((a) => a.id === athleteProfileId),
    [wlAthletes, athleteProfileId],
  );
  const latestStatsIntake = useMemo(
    () => latestIntakeForWlProfile(athleteProfileId, intakes),
    [athleteProfileId, intakes],
  );
  const athlete = useMemo(
    () => (baseWlAthlete ? mergeAthleteWithLatestIntake(baseWlAthlete, latestStatsIntake) : null),
    [baseWlAthlete, latestStatsIntake],
  );
  const athleteForEngine = athlete ?? REFERENCE_ATHLETE;

  const [program, setProgram] = useState<GeneratedProgram | null>(() => assignment?.program ?? null);
  const [programTitle, setProgramTitle] = useState(() => assignment?.program.name ?? '');
  const [syncState, setSyncState] = useState<ProgramSyncState>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [mobilePinnedChrome, setMobilePinnedChrome] = useState<React.ReactNode>(null);
  const [mobileExerciseFocus, setMobileExerciseFocus] = useState<{
    onBackToDay: () => void;
    exerciseTitle: string;
  } | null>(null);
  const [toolbarPortalNode, setToolbarPortalNode] = useState<HTMLElement | null>(null);
  const [chromePortalNode, setChromePortalNode] = useState<HTMLElement | null>(null);
  const programRef = useRef(program);
  const editContextRef = useRef<import('../../models/notifications').ProgramEditContext | undefined>(
    undefined,
  );

  useEffect(() => {
    programRef.current = program;
  }, [program]);

  useEffect(() => {
    if (!assignment) return;
    setProgram(assignment.program);
    setProgramTitle(assignment.program.name);
    setSyncState('saved');
  }, [assignment?.id, assignment?.program]);

  const athleteDisplayName = athlete?.name?.trim() || athleteProfileId || (isEs ? 'Atleta' : 'Athlete');

  const { run: debouncedSave, flush: flushAutosave, cancel: cancelAutosave } =
    useDebouncedCallbackWithControls(
      (p: GeneratedProgram, editContext?: import('../../models/notifications').ProgramEditContext) => {
        setSyncState('saving');
        updateAssignmentProgram(assignmentId, p, editContext);
        setSyncState('saved');
        setLastSavedAt(new Date().toISOString());
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
        cancelAutosave();
        setProgram(null);
        setSyncState('saved');
        return;
      }
      if (editContext) editContextRef.current = editContext;
      setSyncState('pending');
      setProgram(p);
      debouncedSave(p, editContext ?? editContextRef.current);
    },
    [debouncedSave, cancelAutosave],
  );

  const handleProgramTitleChange = useCallback((value: string) => {
    setProgramTitle(value);
    const current = programRef.current;
    if (!current) return;
    const next = { ...current, name: value.trim() || current.name };
    handleProgramChange(next);
  }, [handleProgramChange]);

  const hasProgram = Boolean(program?.weeks?.length);
  const useStickyDesktopHead = !isMobileLayout;
  const portalToolbarToHead = useStickyDesktopHead && hasProgram;

  const syncHint =
    syncState === 'pending'
      ? isEs
        ? 'Cambios sin guardar'
        : 'Unsaved changes'
      : syncState === 'saving'
        ? isEs
          ? 'Guardando…'
          : 'Saving…'
        : null;
  const SyncCloudIcon = syncState === 'saved' ? CloudCheck : CloudUpload;

  const editorProgramMeta = (
    <div className="wl-programs-editor-hero-meta wl-programs-editor-hero-meta--toolbar">
      <span className="wl-programs-status-pill wl-programs-status-pill--published">
        {isEs ? 'Individual' : 'Individual'}
      </span>
      {syncHint ? (
        <span className={`wl-programs-sync-status wl-programs-sync-status--${syncState}`} role="status">
          <SyncCloudIcon size={14} strokeWidth={2.25} aria-hidden />
          <span className="wl-programs-sync-status__label">{syncHint}</span>
        </span>
      ) : null}
      {hasProgram && program ? (
        <span className="wl-programs-enrolled-chip wl-programs-enrolled-chip--dates">
          {formatProgramDateRange(program, isEs) ?? athleteDisplayName}
        </span>
      ) : null}
    </div>
  );

  const mobileTopBar = useMemo(
    () =>
      isMobileLayout && assignment
        ? {
            titleContent: mobileExerciseFocus ? (
              <div className="mobile-header-title mobile-header-title--exercise">
                {mobileExerciseFocus.exerciseTitle}
              </div>
            ) : hasProgram ? (
              <div className="mobile-header-title">{`${athleteDisplayName} · ${programTitle}`}</div>
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
      assignment,
      isEs,
      onBack,
      hasProgram,
      mobilePinnedChrome,
      mobileExerciseFocus,
      athleteDisplayName,
      programTitle,
    ],
  );
  useMobileTopBar(mobileTopBar);

  if (!assignment) {
    return (
      <div className="wl-programs-panel">
        <button type="button" className="btn-outline" onClick={onBack}>
          {isEs ? 'Volver' : 'Back'}
        </button>
        <p className="wl-mgmt-empty">{isEs ? 'Plan no encontrado.' : 'Plan not found.'}</p>
      </div>
    );
  }

  return (
    <div
      className={`wl-programs-panel wl-programs-editor wl-programs-editor--no-dock${useStickyDesktopHead ? ' wl-programs-editor--sticky-head' : ''}${isMobileLayout && hasProgram ? ' wl-programs-editor--mobile-plan' : ''}`}
    >
      <header
        className={`wl-programs-editor-hero${useStickyDesktopHead ? ' wl-programs-editor-sticky-head' : ''}${portalToolbarToHead ? ' wl-programs-editor-sticky-head--unified' : ''}`}
      >
        {useStickyDesktopHead ? (
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
                maxLength={WL_EDITOR_TITLE_MAX_LEN}
                placeholder={isEs ? 'Nombre del plan' : 'Plan name'}
                label={isEs ? `${athleteDisplayName} · plan` : `${athleteDisplayName} · plan`}
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
            <div className="wl-programs-editor-sticky-head__status">{editorProgramMeta}</div>
          </div>
        ) : null}
        {portalToolbarToHead ? (
          <div
            ref={setChromePortalNode}
            id={WL_PROGRAM_EDITOR_CHROME_PORTAL_ID}
            className="wl-programs-editor-chrome-anchor wl-programs-embedded-plan"
          />
        ) : null}
      </header>

      <div className="wl-programs-editor-body">
        <div className="wl-programs-editor-stage">
          <div className="wl-programs-customize-wrap wolf-engine--customize wl-programs-embedded-plan">
            {program ? (
              <OlympicProgramPlan
                language={language}
                athleteId={athleteProfileId}
                athlete={athleteForEngine}
                athleteForEngine={athleteForEngine}
                primaryGoal={PRIMARY_GOAL}
                program={program}
                onProgramChange={handleProgramChange}
                onFlushAutosave={flushAutosave}
                skipLocalDraftPersistence
                mode="customize"
                editorMode="instance"
                editingAssignmentId={assignmentId}
                programName={programTitle}
                onProgramNameChange={handleProgramTitleChange}
                customizeToolbarPortalId={portalToolbarToHead ? WL_PROGRAM_EDITOR_TOOLBAR_PORTAL_ID : null}
                customizeToolbarPortalNode={portalToolbarToHead ? toolbarPortalNode : null}
                customizeChromePortalId={portalToolbarToHead ? WL_PROGRAM_EDITOR_CHROME_PORTAL_ID : null}
                customizeChromePortalNode={portalToolbarToHead ? chromePortalNode : null}
                customizeToolbarEnd={portalToolbarToHead ? undefined : editorProgramMeta}
                programSyncState={syncState}
                lastSavedAt={lastSavedAt}
                onMobilePinnedChrome={isMobileLayout ? setMobilePinnedChrome : undefined}
                onMobileExerciseFocusChange={isMobileLayout ? setMobileExerciseFocus : undefined}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WlAssignmentProgramEditor;
