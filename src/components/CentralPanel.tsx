import React, { useEffect, useMemo, useState } from 'react';
import './CentralPanel.css';
import './SuperDashboard.css';
import '../styles/interactive.css';
import {
  ChevronRight, Settings2, SlidersHorizontal, Share, Download, GripVertical, Plus,
  LayoutDashboard, Dumbbell, Calendar as CalendarIcon, ArrowLeft, TrendingUp, Award,
  BarChart3, Clock, Users, Search, Info, ShieldCheck,
  Save, X, BookMarked, Layers, MoveDiagonal
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import WlAthletesSection from './wl-management/WlAthletesSection';
import WlProgramsPanel from './wl-programs/WlProgramsPanel';
import './wl-management/wl-management.css';
import { WL_PROGRAMS_FOCUS_KEY } from './wl-programs/WlProgramsHub';
import CoachExerciseLibrary from './CoachExerciseLibrary';
import PraxiogramsPanel from './praxiogram/PraxiogramsPanel';
import AthleteTrainingView from './AthleteTrainingView';
import PerformanceStatsHistory from './PerformanceStatsHistory';
import { useWolfAssign } from '../context/WolfAssignContext';
import { appAthleteIdForWlProfile } from '../utils/wlStatsBridge';
import {
  aggregateTemplateLogging,
  aggregateWlAttendance,
  buildAlertsAppCoach,
  buildAlertsWl,
  buildAppAssignmentRows,
  buildWlAssignmentRows,
  countIntakesSubmittedThisWeek,
  countPrsFromIntakesThisWeek,
  mergedAttendancePct,
  sortAlerts,
  volumeSparklineFromIntakes,
  type DashboardAlert,
} from '../utils/dashboardStats';
import { mockAthletes } from '../data/loadMockData';
import type { AthleteLevel } from '../models/training';
import type { AppViewId } from '../navigation/appNavigation';
import { WlAccountView } from './account/WlAccountView';

interface CentralPanelProps {
  language: 'ES' | 'EN';
  activeView: string;
  setActiveView: (view: string) => void;
  setLanguage: (lang: 'ES' | 'EN') => void;
  onRequestLogout: () => void;
}


const CentralPanel: React.FC<CentralPanelProps> = ({
  language,
  activeView,
  setActiveView,
  setLanguage,
  onRequestLogout,
}) => {
  const isEs = language === 'ES';
  const {
    persona,
    athleteUser,
    users: authUsers,
    currentUser,
    createUser,
    updateUser,
    resetUserPassword,
    deleteUser,
    assignments: wlProgramAssignments,
    completions,
    wlAthletes,
    updateWlAthlete,
    deleteWlAthlete,
    reloadWlAthletesFromApi,
    canManageWlAthletes,
  } = useWolfAssign();
  const {
    athletes, programs,
    assignments, assignProgram, intakes,
    exerciseLibrary, updateExerciseLog, setSelectedExerciseId,
    userRole, customGroups, createCustomGroup, addToCustomGroup, addMasterExercise,
    addExerciseToProgramSession, selectedWeek, setSelectedWeek,
  } = useAppContext();
  const [currentTab, setCurrentTab] = useState<'micro' | 'session'>('micro');

  // Athlete View States
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [activeAthleteId, setActiveAthleteId] = useState<number | null>(1); // Erik Manzano â€” demo principal
  useEffect(() => {
    if (activeView === 'library' || activeView === 'wl-exercises') {
      setActiveView('exercise-intelligence');
    }
  }, [activeView, setActiveView]);

  useEffect(() => {
    if (activeView === 'onboarding') {
      setActiveView(persona === 'athlete' ? 'my-wl-plan' : 'dashboard');
    }
  }, [activeView, persona, setActiveView]);

  useEffect(() => {
    if (activeView === 'planning' || activeView === 'sessions') setActiveView('athletes');
  }, [activeView, setActiveView]);

  /** Compatibilidad: bookmarks y sessionStorage antiguos apuntaban a wolf-engine. */
  useEffect(() => {
    if (activeView === 'wolf-engine') setActiveView('programs');
  }, [activeView, setActiveView]);

  /** Atleta: no quedar en vistas exclusivas de coach (programas, atletas, planificaciÃ³n). */
  useEffect(() => {
    if (persona !== 'athlete') return;
    const coachOnly =
      activeView === 'programs' ||
      activeView === 'wolf-engine' ||
      activeView === 'praxiogram' ||
      activeView === 'exercise-intelligence' ||
      activeView === 'athletes' ||
      activeView === 'planning';
    if (coachOnly) setActiveView('my-wl-plan');
  }, [persona, activeView, setActiveView]);

  useEffect(() => {
    if (activeView === 'admin-users' && currentUser?.role !== 'super_admin') {
      setActiveView(persona === 'athlete' ? 'my-wl-plan' : 'programs');
    }
  }, [activeView, currentUser?.role, persona, setActiveView]);

  useEffect(() => {
    if (activeView === 'athletes') void reloadWlAthletesFromApi();
  }, [activeView, reloadWlAthletesFromApi]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdminAdd, setShowAdminAdd] = useState(false);
  const [showGroupBuilder, setShowGroupBuilder] = useState(false);
  const [newExData, setNewExData] = useState({ name: '', category: 'Olympic', desc: '' });
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [showGroupSelectorFor, setShowGroupSelectorFor] = useState<number | null>(null);
  const [isAthletePreview, setIsAthletePreview] = useState(false);
  const emptyAdminOneRm = () => ({
    snatch: 60,
    cleanJerk: 80,
    backSquat: 100,
    frontSquat: 85,
  });
  const [adminDraft, setAdminDraft] = useState({
    name: '',
    email: '',
    username: '',
    role: 'athlete' as 'athlete' | 'coach' | 'super_admin',
    password: 'wolf2026',
    coachId: 'user-coach-wl',
    level: 'intermediate' as AthleteLevel,
    bodyweight: 75,
    oneRM: emptyAdminOneRm(),
  });
  const [adminError, setAdminError] = useState('');
  const [wlProfileEditId, setWlProfileEditId] = useState<string | null>(null);
  const coachOptions = useMemo(
    () => authUsers.filter((u) => u.role === 'coach'),
    [authUsers],
  );

  // Calendar States
  const [calendarDate, setCalendarDate] = useState(new Date());

  const wlNameByProfileId = useMemo(
    () => Object.fromEntries(mockAthletes.map((a) => [a.id, a.name] as const)),
    [],
  );

  const dashboardData = useMemo(() => {
    const filterAppAthleteId =
      persona === 'athlete' && athleteUser?.linkedAthleteId
        ? appAthleteIdForWlProfile(athleteUser.linkedAthleteId)
        : undefined;

    const athletesScope =
      filterAppAthleteId != null ? athletes.filter((a) => a.id === filterAppAthleteId) : athletes;
    const assignmentsScope =
      filterAppAthleteId != null ? assignments.filter((a) => a.athleteId === filterAppAthleteId) : assignments;
    const intakesScope =
      filterAppAthleteId != null ? intakes.filter((i) => i.athleteId === filterAppAthleteId) : intakes;

    const wlScope =
      persona === 'athlete' && athleteUser?.linkedAthleteId
        ? wlProgramAssignments.filter((a) => a.athleteProfileId === athleteUser.linkedAthleteId)
        : wlProgramAssignments;

    const ref = new Date();
    const prsWeek = countPrsFromIntakesThisWeek(intakesScope, ref);
    const intakesWeek = countIntakesSubmittedThisWeek(intakesScope, ref);
    const tmplLog = aggregateTemplateLogging(assignmentsScope, programs);
    const wlAtt = aggregateWlAttendance(wlScope, completions);
    const attendancePct = mergedAttendancePct(
      { done: tmplLog.done, total: tmplLog.total },
      { done: wlAtt.done, total: wlAtt.total },
    );

    const appRows = buildAppAssignmentRows(athletesScope, assignmentsScope, programs);
    const wlRows = buildWlAssignmentRows(wlScope, completions, wlNameByProfileId);

    let alerts: DashboardAlert[] = [];
    if (persona !== 'athlete') {
      alerts = [
        ...buildAlertsAppCoach({
          athletes: athletesScope,
          assignments: assignmentsScope,
          programs,
          intakes: intakesScope,
          isEs,
        }),
        ...buildAlertsWl({ wlAssignments: wlScope, completions, isEs }),
      ];
    } else if (tmplLog.total > 0 && tmplLog.pct < 10) {
      alerts = [
        {
          id: 'self-low-log',
          severity: 'info',
          title: isEs ? 'Registra tus sesiones' : 'Log your sessions',
          description: isEs
            ? 'Pocos bloques tienen carga/reps registradas en tu plan plantilla.'
            : 'Few blocks have load/reps logged on your template plan.',
          actionLabel: isEs ? 'Mi plan WL' : 'My WL plan',
          targetView: 'my-wl-plan',
        },
      ];
    }
    alerts = sortAlerts(alerts).slice(0, 14);

    const assignedAthleteCount = new Set(assignmentsScope.map((a) => a.athleteId)).size;

    const latestIntake =
      intakesScope.length === 0
        ? null
        : [...intakesScope].sort(
            (a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id),
          )[0];
    const latestIntakeAthleteName =
      latestIntake?.athleteId != null
        ? athletesScope.find((x) => x.id === latestIntake.athleteId)?.name
        : undefined;
    const volumeSpark = volumeSparklineFromIntakes(intakesScope, 8);

    return {
      prsWeek,
      intakesWeek,
      intakesTotal: intakesScope.length,
      tmplLog,
      wlAtt,
      attendancePct,
      appRows,
      wlRows,
      alerts,
      assignedAthleteCount,
      rosterCount: athletesScope.length,
      wlPlanCount: wlScope.length,
      athleteViewRestricted: Boolean(
        persona === 'athlete' && Boolean(athleteUser?.linkedAthleteId) && filterAppAthleteId == null,
      ),
      latestIntake,
      latestIntakeAthleteName,
      volumeSpark,
    };
  }, [
    persona,
    athleteUser,
    athletes,
    assignments,
    programs,
    intakes,
    wlProgramAssignments,
    completions,
    isEs,
    wlNameByProfileId,
  ]);

  const handleDashboardNavigate = (alert: DashboardAlert) => {
    if (alert.athleteId != null) {
      setActiveAthleteId(alert.athleteId);
    }
    setActiveView(alert.targetView);
  };

  useEffect(() => {
    if (activeView === 'performance') setActiveView('dashboard');
  }, [activeView, setActiveView]);

  if (activeView === 'none') return null;

  // Exercise Management
  const handleAddExercise = (sessionId: number) => {
    console.log('Adding exercise to session:', sessionId);
    // This is a demo, so we'll just log it or we could update a local state if we had one for sessions
  };

  const renderAthletesView = () => {
    return (
      <WlAthletesSection
        isEs={isEs}
        onOpenCalendar={() => setActiveView('global-calendar')}
      />
    );
  };

  const renderBreadcrumbs = () => (
    <div className="breadcrumbs">
      <span>{isEs ? 'Macrociclo OlÃ­mpico 2026' : 'Olympic Macrocycle 2026'}</span>
      <ChevronRight size={14} className="crumb-icon" />
      <span>{isEs ? 'Mesociclo 1: AcumulaciÃ³n' : 'Mesocycle 1: Accumulation'}</span>
    </div>
  );

  const renderPeriodization = () => {
    const assignment = assignments.find(a => a.athleteId === activeAthleteId);
    const currentProgram = assignment?.personalizedProgram || programs[0];
    const displayWeeks = currentProgram?.weeks || [];
    const currentWeekData = displayWeeks.find(w => w.weekNumber === selectedWeek) || displayWeeks[0];
    const sessions = currentWeekData?.days || [];

    if (isAthletePreview || activeView === 'sessions') {
      const isFullScreen = activeView === 'sessions';
      return (
        <div className={isFullScreen ? "athlete-dashboard-fullscreen animate-in" : "athlete-preview-overlay"}>
          <div className={isFullScreen ? "athlete-dashboard-container" : "mobile-frame animate-in"}>
            <div className={isFullScreen ? "dashboard-header" : "mobile-header"}>
              <div className={isFullScreen ? "status-bar-hidden" : "status-bar"}>
                <span>9:41</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid currentColor' }}></div>
                  <div style={{ width: '12px', height: '6px', borderRadius: '3px', border: '1px solid currentColor' }}></div>
                </div>
              </div>
              <div className="header-content" style={{ padding: isFullScreen ? '24px 32px' : '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {!isFullScreen && <button className="back-btn" onClick={() => setIsAthletePreview(false)}><ArrowLeft size={20} /></button>}
                <h2 style={{ fontSize: isFullScreen ? '2rem' : '1.2rem', fontWeight: '800', background: 'var(--color-accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{isEs ? 'Mi Entrenamiento' : 'My Workout'}</h2>
                {!isFullScreen && <div style={{ width: '24px' }}></div>}
              </div>
            </div>

            <div className={isFullScreen ? "dashboard-content" : "mobile-content"}>
              <div className="day-selector-pills" style={{ display: 'flex', gap: '8px', padding: isFullScreen ? '0 32px' : '0 20px', overflowX: 'auto' }}>
                {sessions.map(d => (
                  <button
                    key={d.id}
                    className={`pill ${d.dayNumber === 1 ? 'active' : ''}`}
                  >
                    D{d.dayNumber}
                  </button>
                ))}
              </div>

              <div className="session-info-card glass" style={{ margin: isFullScreen ? '24px 32px' : '20px', padding: isFullScreen ? '32px' : '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ color: 'var(--color-accent)', fontSize: '1.2rem' }}>{currentProgram?.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {isEs ? `Semana ${selectedWeek} Â· SesiÃ³n Focalizada` : `Week ${selectedWeek} Â· Focused Session`}
                    </p>
                  </div>
                  <span className="badge" style={{ padding: '4px 12px' }}>W{selectedWeek}</span>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
                  <div className="mobile-stat">
                    <span className="label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.6 }}>{isEs ? 'Tonelaje' : 'Tonnage'}</span>
                    <span className="value" style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'block' }}>
                      {(currentWeekData?.days[0]?.exercises.reduce((acc, ex) => acc + (ex.tonnage || 0), 0) || 0).toLocaleString()} kg
                    </span>
                  </div>
                  <div className="mobile-stat">
                    <span className="label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.6 }}>{isEs ? 'Tiempo Est.' : 'Est. Time'}</span>
                    <span className="value" style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'block' }}>75m</span>
                  </div>
                </div>
              </div>

              <div className="exercise-stack" style={{ marginTop: '24px', display: 'flex', flexDirection: isFullScreen ? 'row' : 'column', gap: '16px', padding: isFullScreen ? '0 32px 32px' : '0 20px 20px', flexWrap: isFullScreen ? 'wrap' : 'nowrap' }}>
                {currentWeekData?.days[0]?.exercises.map((ex, idx) => (
                  <div key={ex.id} className="athlete-ex-card glass animate-in" style={{
                    animationDelay: `${idx * 0.1}s`,
                    padding: isFullScreen ? '24px' : '16px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    flex: isFullScreen ? '1 1 400px' : 'none',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div className="ex-info" style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{ex.name}</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        {ex.sets} sets x {ex.reps} reps @ <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{ex.load}</span>
                      </p>
                    </div>
                    <div className="ex-log-inputs" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div className="input-group" style={{ flex: 1, position: 'relative' }}>
                        <input
                          type="number"
                          placeholder="kg"
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', color: 'white' }}
                          defaultValue={ex.actualLoad}
                          onBlur={(e) => updateExerciseLog(activeAthleteId || 1, currentProgram?.id || 101, selectedWeek, 1, ex.id, e.target.value, ex.actualReps || '')}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', opacity: 0.5 }}>kg</span>
                      </div>
                      <div className="input-group" style={{ flex: 1, position: 'relative' }}>
                        <input
                          type="number"
                          placeholder="reps"
                          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', color: 'white' }}
                          defaultValue={ex.actualReps}
                          onBlur={(e) => updateExerciseLog(activeAthleteId || 1, currentProgram?.id || 101, selectedWeek, 1, ex.id, ex.actualLoad || '', e.target.value)}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', opacity: 0.5 }}>reps</span>
                      </div>
                    </div>
                    {ex.tonnage && ex.tonnage > 0 && (
                      <div className="tonnage-badge" style={{
                        marginTop: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: 'rgba(0,255,100,0.1)',
                        color: 'var(--color-success)',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {ex.tonnage.toLocaleString()} kg total
                        <TrendingUp size={12} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ padding: isFullScreen ? '0 32px 40px' : '0 20px 32px' }}>
                <button className="finish-btn btn-primary" style={{ width: isFullScreen ? 'auto' : '100%', minWidth: '300px', display: 'block', margin: '0 auto', padding: '18px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 'bold', background: 'var(--gradient-premium)', border: 'none', boxShadow: '0 10px 30px rgba(255,100,0,0.3)' }}>
                  {isEs ? 'Finalizar y Guardar' : 'Finish & Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <header className="panel-header">
          <div className="header-left">
            {renderBreadcrumbs()}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
              <h1 className="view-title" style={{ marginBottom: 0 }}>
                {isEs ? 'PlanificaciÃ³n de Entrenamiento' : 'Training Periodization'}
              </h1>
              <div style={{ marginLeft: '12px' }}>
                <select
                  className="edit-input"
                  style={{ width: '200px', borderBottom: '1px solid var(--color-accent)', background: 'transparent', color: 'inherit' }}
                  value={activeAthleteId || ''}
                  onChange={(e) => setActiveAthleteId(Number(e.target.value))}
                >
                  {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-secondary glass">
              <Share size={16} />
              <span>{isEs ? 'Compartir' : 'Share'}</span>
            </button>
            <button className="btn-primary">
              <Download size={16} />
              <span>{isEs ? 'Importar Programa' : 'Import Program'}</span>
            </button>
          </div>
        </header>

        <div className="toolbar">
          <div className="toolbar-tabs">
            <button
              className={`tab ${currentTab === 'micro' ? 'active' : ''}`}
              onClick={() => setCurrentTab('micro')}
            >
              {isEs ? 'Microciclos' : 'Microcycles'}
            </button>
            <button
              className={`tab ${currentTab === 'session' ? 'active' : ''}`}
              onClick={() => setCurrentTab('session')}
            >
              {isEs ? 'Sesiones' : 'Sessions'}
            </button>
            <button className="tab">{isEs ? 'AnÃ¡lisis de Carga' : 'Load Analysis'}</button>
            <button
              className={`tab ${isAthletePreview ? 'active-premium' : ''}`}
              onClick={() => setIsAthletePreview(!isAthletePreview)}
              style={{
                marginLeft: '20px',
                background: isAthletePreview ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
                color: isAthletePreview ? 'white' : 'var(--color-text-muted)',
                borderRadius: '20px',
                padding: '4px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              <MoveDiagonal size={14} />
              {isEs ? 'Vista Atleta' : 'Athlete View'}
            </button>
          </div>
          <div className="toolbar-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {currentTab === 'session' && (
              <div style={{ display: 'flex', background: 'var(--color-bg-hover)', borderRadius: '8px', padding: '4px' }}>
                <button
                  className="icon-btn-sm"
                  onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
                  style={{ padding: '4px 8px' }}
                >
                  &lt;
                </button>
                <div style={{ padding: '4px 12px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {isEs ? `Semana ${selectedWeek}` : `Week ${selectedWeek}`}
                </div>
                <button
                  className="icon-btn-sm"
                  onClick={() => setSelectedWeek(selectedWeek + 1)}
                  style={{ padding: '4px 8px' }}
                >
                  &gt;
                </button>
              </div>
            )}
            <button className="icon-btn"><Settings2 size={18} /></button>
            <button className="icon-btn"><SlidersHorizontal size={18} /></button>
          </div>
        </div>

        <div className="content-area">
          {currentTab === 'micro' ? (
            <div className="microcycle-grid">
              {displayWeeks.map((week) => (
                <div key={week.id} className="micro-card glass" style={{
                  borderLeft: week.weekNumber === selectedWeek ? '4px solid var(--color-accent)' : 'none',
                  opacity: week.weekNumber === selectedWeek ? 1 : 0.8
                }}>
                  <div className="micro-header">
                    <h3>{isEs ? `Semana ${week.weekNumber}` : `Week ${week.weekNumber}`}</h3>
                    <span className="badge" style={{ background: week.weekNumber === 12 ? 'var(--color-error)' : 'var(--color-success-bg)' }}>
                      {week.weekNumber === 12 ? (isEs ? 'Peaking' : 'Peaking') : (isEs ? 'ProgresiÃ³n' : 'Progression')}
                    </span>
                  </div>
                  <div className="micro-stats">
                    <div className="stat">
                      <span className="stat-label">{isEs ? 'Volumen' : 'Volume'}</span>
                      <span className="stat-value">{12000 - (week.weekNumber * 200)} kg</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">{isEs ? 'Intensidad' : 'Intensity'}</span>
                      <span className="stat-value">{70 + (week.weekNumber * 2)}%</span>
                    </div>
                  </div>
                  <div className="micro-footer">
                    <button className="btn-outline" onClick={() => {
                      setSelectedWeek(week.weekNumber);
                      setCurrentTab('session');
                    }}>
                      {isEs ? 'Entrenar' : 'Train'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map((day) => (
                <div key={day.id} className="session-card glass">
                  <div className="session-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {day.dayNumber}
                      </div>
                      <h3 style={{ fontSize: '1.2rem' }}>{isEs ? `DÃ­a ${day.dayNumber}` : `Day ${day.dayNumber}`}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>
                        <Plus size={12} style={{ marginRight: '4px' }} /> {isEs ? 'Cargar Grupo' : 'Load Group'}
                      </button>
                      <button className="icon-btn-sm" title="Settings"><Settings2 size={16} /></button>
                    </div>
                  </div>
                  <div className="table-container">
                    <table className="exercise-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>{isEs ? 'Ejercicio' : 'Exercise'}</th>
                          <th>{isEs ? 'Series' : 'Sets'}</th>
                          <th>{isEs ? 'Reps' : 'Reps'}</th>
                          <th>{isEs ? 'Carga Plan' : 'Planned'}</th>
                          <th>{isEs ? 'Carga Real (kg / reps)' : 'Actual (kg / reps)'}</th>
                          <th>{isEs ? 'Tonelaje' : 'Tonnage'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.exercises.map((ex) => (
                          <tr key={ex.id} className="exercise-row">
                            <td className="drag-handle"><GripVertical size={16} /></td>
                            <td>
                              <button
                                className="ex-name-btn"
                                style={{
                                  background: 'none', border: 'none', color: 'var(--color-text-primary)', textAlign: 'left',
                                  padding: '4px 8px', font: 'inherit', cursor: 'pointer', width: '100%',
                                  borderRadius: '4px', transition: 'background 0.2s', fontWeight: '600'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                onClick={() => {
                                  const libEx = exerciseLibrary.flatMap(c => c.exercises).find(e => e.name.toLowerCase() === ex.name.toLowerCase());
                                  if (libEx) setSelectedExerciseId(libEx.id);
                                }}
                              >
                                {ex.name}
                              </button>
                            </td>
                            <td>{ex.sets}</td>
                            <td>{ex.reps}</td>
                            <td style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{ex.load}</td>
                            <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="edit-input"
                                placeholder="kg"
                                style={{ width: '60px', borderBottom: '1px dashed var(--color-success)', color: 'var(--color-success)', background: 'transparent' }}
                                defaultValue={ex.actualLoad || ''}
                                onBlur={(e) => updateExerciseLog(activeAthleteId || 1, currentProgram?.id || 101, selectedWeek, day.dayNumber, ex.id, e.target.value, ex.actualReps || '')}
                              />
                              <span style={{ color: 'var(--color-text-muted)' }}>/</span>
                              <input
                                type="text"
                                className="edit-input"
                                placeholder="reps"
                                style={{ width: '40px', borderBottom: '1px dashed var(--color-success)', color: 'var(--color-success)', background: 'transparent' }}
                                defaultValue={ex.actualReps || ''}
                                onBlur={(e) => updateExerciseLog(activeAthleteId || 1, currentProgram?.id || 101, selectedWeek, day.dayNumber, ex.id, ex.actualLoad || '', e.target.value)}
                              />
                            </td>
                            <td style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{ex.tonnage ? `${ex.tonnage.toLocaleString()} kg` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="session-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <button className="add-exercise-btn" onClick={() => handleAddExercise(day.id)} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer' }}>
                      <Plus size={16} />
                      {isEs ? 'AÃ±adir Ejercicio' : 'Add Exercise'}
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                      {isEs ? 'Tonelaje Total SesiÃ³n:' : 'Total Session Tonnage:'} <strong style={{ color: 'var(--color-success)' }}>{(day.exercises.reduce((acc, ex) => acc + (ex.tonnage || 0), 0) || 0).toLocaleString()} kg</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderDashboard = () => {
    const d = dashboardData;
    const { tmplLog, wlAtt } = d;
    const attendanceSub =
      tmplLog.total > 0 && wlAtt.total > 0
        ? isEs
          ? `Plantilla ${tmplLog.pct}% Â· Motor WL ${wlAtt.pct}%`
          : `Template ${tmplLog.pct}% Â· WL engine ${wlAtt.pct}%`
        : tmplLog.total > 0
          ? isEs
            ? `Plantilla: ${tmplLog.done}/${tmplLog.total} bloques`
            : `Template: ${tmplLog.done}/${tmplLog.total} blocks`
          : wlAtt.total > 0
            ? isEs
              ? `Sesiones WL: ${wlAtt.done}/${wlAtt.total}`
              : `WL sessions: ${wlAtt.done}/${wlAtt.total}`
            : isEs
              ? 'Sin registros aÃºn'
              : 'No logs yet';

    const alertAccent = (s: DashboardAlert['severity']) =>
      s === 'danger' ? 'var(--color-danger)' : s === 'warning' ? 'var(--color-warning)' : 'var(--color-accent)';

    const tmplPct = tmplLog.total > 0 ? tmplLog.pct : 0;
    const wlPctRow = wlAtt.total > 0 ? wlAtt.pct : 0;
    const adherenceRows = [
      {
        key: 'tpl',
        label: isEs ? 'Plan plantilla (bloques registrados)' : 'Template plan (blocks logged)',
        pct: tmplPct,
        color: 'var(--color-accent)',
      },
      {
        key: 'wl',
        label: isEs ? 'Motor WL (sesiones completadas)' : 'WL engine (sessions completed)',
        pct: wlPctRow,
        color: 'var(--color-success)',
      },
    ];

    const lastIntake = d.latestIntake;

    return (
      <div className="mock-view super-dashboard">
        <header className="sd-hero" aria-labelledby="sd-main-title">
          <div className="sd-hero__inner">
            <div className="sd-hero__titles">
              <p className="sd-hero__eyebrow">{isEs ? 'Resumen operativo' : 'Operations overview'}</p>
              <h1 id="sd-main-title" className="sd-hero__title">
                {isEs ? 'Dashboard & rendimiento' : 'Dashboard & performance'}
              </h1>
              <p className="sd-hero__sub">
                {isEs
                  ? 'Asignaciones, adherencia, alertas e historial de Stats/PRs en un solo panel â€” optimizado para mÃ³vil y escritorio.'
                  : 'Assignments, adherence, alerts, and Stats/PR history in one panel â€” tuned for mobile and desktop.'}
              </p>
            </div>
            <div className="sd-hero__actions">
              <button type="button" className="sd-btn sd-btn--ghost" title={isEs ? 'PrÃ³ximamente' : 'Coming soon'} disabled>
                <Download size={16} aria-hidden />
                {isEs ? 'Exportar' : 'Export'}
              </button>
            </div>
          </div>
        </header>

        {d.athleteViewRestricted ? (
          <div className="sd-banner" role="status">
            {isEs
              ? 'Tu usuario atleta no estÃ¡ enlazado a un perfil de datos (Stats/plantilla). Contacta al coach.'
              : 'Your athlete account is not linked to a data profile. Ask your coach to link linkedAthleteId.'}
          </div>
        ) : null}

        <section className="sd-kpi-grid" aria-label={isEs ? 'Indicadores clave' : 'Key metrics'}>
          <article className="sd-kpi">
            <div className="sd-kpi__icon">
              <LayoutDashboard size={28} color="var(--color-accent)" aria-hidden />
            </div>
            <h3 className="sd-kpi__label">{isEs ? 'Atletas en roster' : 'Roster athletes'}</h3>
            <p className="sd-kpi__value">{d.rosterCount}</p>
            <p className="sd-kpi__hint">
              {isEs
                ? `${d.assignedAthleteCount} con programa plantilla`
                : `${d.assignedAthleteCount} with template program`}
            </p>
          </article>
          <article className="sd-kpi">
            <div className="sd-kpi__icon">
              <Award size={28} color="var(--color-success)" aria-hidden />
            </div>
            <h3 className="sd-kpi__label">{isEs ? 'PRs nuevos (semana)' : 'New PRs (week)'}</h3>
            <p className="sd-kpi__value">{d.prsWeek}</p>
            <p className="sd-kpi__hint">
              {isEs ? `${d.intakesWeek} envÃ­os Stats esta semana` : `${d.intakesWeek} Stats submissions this week`}
            </p>
          </article>
          <article className="sd-kpi">
            <div className="sd-kpi__icon">
              <Clock size={28} color="var(--color-warning)" aria-hidden />
            </div>
            <h3 className="sd-kpi__label">{isEs ? 'Asistencia / registro' : 'Attendance / logging'}</h3>
            <p className="sd-kpi__value">{d.attendancePct}%</p>
            <p className="sd-kpi__hint">{attendanceSub}</p>
          </article>
          <article className="sd-kpi">
            <div className="sd-kpi__icon">
              <BarChart3 size={28} color="var(--color-accent)" aria-hidden />
            </div>
            <h3 className="sd-kpi__label">{isEs ? 'Stats / planes WL' : 'Stats / WL plans'}</h3>
            <p className="sd-kpi__value">{d.intakesTotal}</p>
            <p className="sd-kpi__hint">
              {isEs ? `${d.wlPlanCount} planes motor` : `${d.wlPlanCount} WL engine plans`}
            </p>
          </article>
        </section>

        <section className="sd-section" aria-labelledby="sd-alerts-title">
          <div className="sd-section__head">
            <h2 id="sd-alerts-title" className="sd-section__title">
              {isEs ? 'Alertas' : 'Alerts'}
            </h2>
          </div>
          {d.alerts.length === 0 ? (
            <div className="sd-alert sd-alert--ok">
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                {isEs ? 'Sin alertas segÃºn los datos actuales.' : 'No alerts for the current data.'}
              </p>
            </div>
          ) : (
            <div className="sd-alert-list">
              {d.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="sd-alert"
                  style={{ borderLeft: `4px solid ${alertAccent(alert.severity)}` }}
                >
                  <div className="sd-alert__body">
                    <h4>{alert.title}</h4>
                    <p>{alert.description}</p>
                  </div>
                  <button type="button" className="btn-outline" onClick={() => handleDashboardNavigate(alert)}>
                    {alert.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="sd-performance" className="sd-section" aria-labelledby="sd-perf-title">
          <div className="sd-section__head">
            <div>
              <h2 id="sd-perf-title" className="sd-section__title">
                {isEs ? 'Rendimiento & evoluciÃ³n' : 'Performance & trends'}
              </h2>
              <p className="sd-section__desc">
                {isEs
                  ? 'Volumen relativo (Snatch + C&J por envÃ­o), adherencia por canal y detalle completo abajo.'
                  : 'Relative volume (Snatch + C&J per submission), adherence by channel, and full detail below.'}
              </p>
            </div>
          </div>

          <div className="sd-insights">
            <div className="sd-insight">
              <h3>
                <TrendingUp size={18} color="var(--color-success)" aria-hidden />
                {isEs ? 'Volumen relativo (Ãºltimos envÃ­os)' : 'Relative volume (recent submissions)'}
              </h3>
              {d.volumeSpark.length === 0 ? (
                <p className="sd-insight__hint" style={{ margin: 0 }}>
                  {isEs ? 'Sin envÃ­os Stats aÃºn.' : 'No Stats submissions yet.'}
                </p>
              ) : (
                <>
                  <div className="sd-spark" role="img" aria-label={isEs ? 'Mini grÃ¡fico de volumen' : 'Volume mini-chart'}>
                    {d.volumeSpark.map((b) => (
                      <div key={b.id} className="sd-spark__bar">
                        <div className="sd-spark__fill" style={{ height: `${Math.max(8, b.h)}%` }} title={`${b.label}`} />
                        <span className="sd-spark__label">{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="sd-insight__hint">
                    {isEs ? 'Altura âˆ Snatch + C&J (Ãºltimos 8 registros).' : 'Height âˆ Snatch + C&J (last 8 records).'}
                  </p>
                </>
              )}
            </div>

            <div className="sd-insight">
              <h3>
                <BarChart3 size={18} color="var(--color-warning)" aria-hidden />
                {isEs ? 'Adherencia por canal' : 'Adherence by channel'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {adherenceRows.map((row) => (
                  <div key={row.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      <span>{row.label}</span>
                      <span>{row.pct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${row.pct}%`, height: '100%', backgroundColor: row.color, maxWidth: '100%' }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="sd-insight__hint">
                {isEs ? 'Basado en bloques logueados y sesiones WL marcadas.' : 'Based on logged blocks and marked WL sessions.'}
              </p>
            </div>

            <div className="sd-insight">
              <h3>
                <Award size={18} color="var(--color-accent)" aria-hidden />
                {isEs ? 'Ãšltimo envÃ­o Stats' : 'Latest Stats entry'}
              </h3>
              {!lastIntake ? (
                <p className="sd-insight__hint" style={{ margin: 0 }}>
                  {isEs ? 'Sin datos.' : 'No data.'}
                </p>
              ) : (
                <div className="sd-pr-mini">
                  <div className="sd-pr-mini__cell">
                    <span>Snatch</span>
                    <p>{lastIntake.responses.snatch} kg</p>
                  </div>
                  <div className="sd-pr-mini__cell">
                    <span>C&J</span>
                    <p>{lastIntake.responses.cleanJerk} kg</p>
                  </div>
                  <p className="sd-pr-mini__meta">
                    {(d.latestIntakeAthleteName ? `${d.latestIntakeAthleteName} Â· ` : '') + lastIntake.date}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="sd-perf-embed">
            <PerformanceStatsHistory
              language={language}
              persona={persona}
              linkedWlAthleteId={athleteUser?.linkedAthleteId}
              intakes={intakes}
              appAthletes={athletes}
              embedded
            />
          </div>
        </section>

        <section className="sd-section" aria-labelledby="sd-tpl-title">
          <div className="sd-section__head">
            <h2 id="sd-tpl-title" className="sd-section__title">
              {isEs ? 'Programas plantilla' : 'Template programs'}
            </h2>
          </div>
          <div className="sd-table-shell">
            <div className="sd-table-scroll">
              <table className="sd-table exercise-table">
                <thead>
                  <tr>
                    <th>{isEs ? 'Atleta' : 'Athlete'}</th>
                    <th>{isEs ? 'Programa' : 'Program'}</th>
                    <th>{isEs ? 'Inicio' : 'Start'}</th>
                    <th>{isEs ? 'Adherencia' : 'Adherence'}</th>
                    <th className="sd-table__actions" />
                  </tr>
                </thead>
                <tbody>
                  {d.appRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ color: 'var(--color-text-muted)', padding: '16px' }}>
                        {isEs ? 'No hay asignaciones. Asigna desde Atletas.' : 'No assignments. Assign from Athletes.'}
                      </td>
                    </tr>
                  ) : (
                    d.appRows.map((row) => (
                      <tr key={`${row.athleteId}-${row.programId}`}>
                        <td style={{ fontWeight: 600 }}>{row.athleteName}</td>
                        <td>
                          {row.programName}
                          {row.hasPersonalizedCopy ? (
                            <span className="badge" style={{ marginLeft: '8px', fontSize: '0.65rem', background: 'var(--color-accent-glow)' }}>
                              PERS
                            </span>
                          ) : null}
                        </td>
                        <td>{row.startDate}</td>
                        <td>
                          {row.exerciseSlots > 0 ? `${row.completionPct}% (${row.exercisesLogged}/${row.exerciseSlots})` : 'â€”'}
                        </td>
                        <td className="sd-table__actions">
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => {
                              setActiveAthleteId(row.athleteId);
                              setActiveView('athletes');
                            }}
                          >
                            {isEs ? 'Atletas' : 'Athletes'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="sd-section" aria-labelledby="sd-wl-title">
          <div className="sd-section__head">
            <h2 id="sd-wl-title" className="sd-section__title">
              {isEs ? 'Planes motor (WL)' : 'WL engine plans'}
            </h2>
          </div>
          <div className="sd-table-shell">
            <div className="sd-table-scroll">
              <table className="sd-table exercise-table">
                <thead>
                  <tr>
                    <th>{isEs ? 'Atleta' : 'Athlete'}</th>
                    <th>{isEs ? 'Plan' : 'Plan'}</th>
                    <th>{isEs ? 'Asignado' : 'Assigned'}</th>
                    <th>{isEs ? 'Sesiones' : 'Sessions'}</th>
                    <th className="sd-table__actions" />
                  </tr>
                </thead>
                <tbody>
                  {d.wlRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ color: 'var(--color-text-muted)', padding: '16px' }}>
                        {isEs ? 'No hay planes WL asignados.' : 'No WL engine plans assigned.'}
                      </td>
                    </tr>
                  ) : (
                    d.wlRows.map((row) => (
                      <tr key={row.assignmentId}>
                        <td style={{ fontWeight: 600 }}>{row.athleteName}</td>
                        <td>{row.programName}</td>
                        <td>{row.assignedAt}</td>
                        <td>
                          {row.sessionSlots > 0
                            ? `${row.completionPct}% (${row.sessionsDone}/${row.sessionSlots})`
                            : 'â€”'}
                        </td>
                        <td className="sd-table__actions">
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => {
                              try {
                                const focusId = row.coachProgramId ?? row.assignmentId;
                                sessionStorage.setItem(WL_PROGRAMS_FOCUS_KEY, focusId);
                              } catch {
                                /* ignore */
                              }
                              setActiveView('programs');
                            }}
                          >
                            {isEs ? 'Programas' : 'Programs'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderPlaceholder = (title: string, icon: React.ReactNode) => (
    <div className="mock-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7 }}>
      {icon}
      <h2 style={{ marginTop: '24px', color: 'var(--color-text-secondary)' }}>{title}</h2>
      <p style={{ marginTop: '8px', color: 'var(--color-text-muted)' }}>
        {isEs ? 'MÃ³dulo en desarrollo para esta demo.' : 'Module in development for this demo.'}
      </p>
    </div>
  );

  const renderAdminUsersView = () => (
    <div className="mock-view">
      <header className="panel-header">
        <div className="header-left">
          <h1 className="view-title">{isEs ? 'Panel maestro' : 'Master panel'}</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '6px' }}>
            {isEs
              ? 'Solo tu cuenta propietario (super_admin) ve esta pantalla: altas, roles y bajas. El registro pÃºblico no puede crear super admins.'
              : 'Only your owner account (super_admin) sees this screen: create users, roles, and removals. Public signup cannot create super admins.'}
          </p>
        </div>
      </header>
      <div className="content-area" style={{ display: 'grid', gap: '18px' }}>
        <div className="micro-card glass" style={{ borderLeft: '3px solid var(--color-accent)' }}>
          <h3 style={{ marginBottom: '8px' }}>{isEs ? 'Tu rol' : 'Your role'}</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {isEs
              ? 'Iniciaste sesiÃ³n como propietario. Desde aquÃ­ das de alta coaches y atletas (usuario, contraseÃ±a y PRs). El coach solo consulta el roster en Â«AtletasÂ».'
              : 'You signed in as the app owner. Create coach and athlete accounts here (username, password, PRs). Coaches only view the roster under Â«AthletesÂ».'}
          </p>
        </div>
        <div className="micro-card glass">
          <h3 style={{ marginBottom: '10px' }}>{isEs ? 'Crear usuario' : 'Create user'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <input
              className="edit-input"
              placeholder={isEs ? 'Nombre' : 'Name'}
              value={adminDraft.name}
              onChange={(e) => setAdminDraft((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="edit-input"
              placeholder="Email"
              value={adminDraft.email}
              onChange={(e) => setAdminDraft((prev) => ({ ...prev, email: e.target.value }))}
            />
            <select
              className="edit-input"
              value={adminDraft.role}
              onChange={(e) => setAdminDraft((prev) => ({ ...prev, role: e.target.value as 'athlete' | 'coach' | 'super_admin' }))}
            >
              <option value="athlete">{isEs ? 'Atleta' : 'Athlete'}</option>
              <option value="coach">{isEs ? 'Coach' : 'Coach'}</option>
              <option value="super_admin">{isEs ? 'Super Admin' : 'Super Admin'}</option>
            </select>
            <input
              className="edit-input"
              type="password"
              placeholder={isEs ? 'ContraseÃ±a' : 'Password'}
              value={adminDraft.password}
              onChange={(e) => setAdminDraft((prev) => ({ ...prev, password: e.target.value }))}
            />
            {adminDraft.role === 'athlete' ? (
              <>
                <input
                  className="edit-input"
                  placeholder={isEs ? 'Usuario (login)' : 'Username (login)'}
                  value={adminDraft.username}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, username: e.target.value }))}
                />
                <select
                  className="edit-input"
                  value={adminDraft.coachId}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, coachId: e.target.value }))}
                >
                  {coachOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className="edit-input"
                  value={adminDraft.level}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, level: e.target.value as AthleteLevel }))}
                >
                  <option value="beginner">{isEs ? 'Principiante' : 'Beginner'}</option>
                  <option value="intermediate">{isEs ? 'Intermedio' : 'Intermediate'}</option>
                  <option value="advanced">{isEs ? 'Avanzado' : 'Advanced'}</option>
                </select>
                <input
                  className="edit-input"
                  type="number"
                  placeholder={isEs ? 'Peso corporal (kg)' : 'Bodyweight (kg)'}
                  value={adminDraft.bodyweight}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, bodyweight: Number(e.target.value) || 0 }))}
                />
                {(['snatch', 'cleanJerk', 'backSquat', 'frontSquat'] as const).map((key) => (
                  <input
                    key={key}
                    className="edit-input"
                    type="number"
                    placeholder={key}
                    value={adminDraft.oneRM[key]}
                    onChange={(e) =>
                      setAdminDraft((prev) => ({
                        ...prev,
                        oneRM: { ...prev.oneRM, [key]: Number(e.target.value) || 0 },
                      }))
                    }
                  />
                ))}
              </>
            ) : null}
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: '12px' }}
            onClick={() => {
              const wasAthlete = adminDraft.role === 'athlete';
              void createUser(adminDraft).then((err) => {
                if (err) {
                  setAdminError(err);
                  return;
                }
                setAdminError('');
                setAdminDraft({
                  name: '',
                  email: '',
                  username: '',
                  role: 'athlete',
                  password: 'wolf2026',
                  coachId: coachOptions[0]?.id ?? 'user-coach-wl',
                  level: 'intermediate',
                  bodyweight: 75,
                  oneRM: emptyAdminOneRm(),
                });
                if (wasAthlete) void reloadWlAthletesFromApi();
              });
            }}
          >
            {isEs ? 'Crear usuario' : 'Create user'}
          </button>
          {adminError ? <p style={{ marginTop: '8px', color: 'var(--color-error)' }}>{adminError}</p> : null}
        </div>

        <div className="micro-card glass">
          <h3 style={{ marginBottom: '12px' }}>{isEs ? 'Usuarios del sistema' : 'System users'}</h3>
          <div className="table-container">
            <table className="exercise-table">
              <thead>
                <tr>
                  <th>{isEs ? 'Nombre' : 'Name'}</th>
                  <th>Email</th>
                  <th>{isEs ? 'Rol' : 'Role'}</th>
                  <th>{isEs ? 'Acciones' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {authUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        className="edit-input"
                        value={user.role}
                        onChange={(e) => {
                          const nextRole = e.target.value as 'athlete' | 'coach' | 'super_admin';
                          void updateUser(user.id, { role: nextRole });
                        }}
                      >
                        <option value="athlete">{isEs ? 'Atleta' : 'Athlete'}</option>
                        <option value="coach">{isEs ? 'Coach' : 'Coach'}</option>
                        <option value="super_admin">{isEs ? 'Super Admin' : 'Super Admin'}</option>
                      </select>
                    </td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-outline"
                        onClick={() => {
                          const next = window.prompt(isEs ? 'Nuevo nombre:' : 'New name:', user.name);
                          if (!next || !next.trim()) return;
                          void updateUser(user.id, { name: next.trim() });
                        }}
                      >
                        {isEs ? 'Editar' : 'Edit'}
                      </button>
                      <button
                        className="btn-outline"
                        onClick={() => {
                          const next = window.prompt(
                            isEs ? `Nueva contraseÃ±a para ${user.name} (mÃ­n. 6):` : `New password for ${user.name} (min 6):`,
                          );
                          if (!next || next.trim().length < 6) return;
                          void resetUserPassword(user.id, next.trim()).then((err) => {
                            if (err) setAdminError(err);
                            else setAdminError('');
                          });
                        }}
                      >
                        {isEs ? 'ContraseÃ±a' : 'Password'}
                      </button>
                      <button
                        className="btn-outline"
                        style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                        disabled={currentUser?.id === user.id}
                        onClick={() => {
                          if (!window.confirm(isEs ? 'Eliminar usuario?' : 'Delete user?')) return;
                          void deleteUser(user.id);
                        }}
                      >
                        {isEs ? 'Eliminar' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {canManageWlAthletes ? (
          <div className="micro-card glass">
            <h3 style={{ marginBottom: '12px' }}>{isEs ? 'Perfiles WL (PRs)' : 'WL profiles (PRs)'}</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '12px', fontSize: '0.9rem' }}>
              {isEs
                ? 'Edita rÃ©cords y nivel del motor. Las altas de atleta con cuenta se hacen arriba; aquÃ­ puedes ajustar PRs.'
                : 'Edit engine level and PRs. Create athlete accounts above; adjust PRs here.'}
            </p>
            <div className="table-container">
              <table className="exercise-table">
                <thead>
                  <tr>
                    <th>{isEs ? 'Nombre' : 'Name'}</th>
                    <th>{isEs ? 'Nivel' : 'Level'}</th>
                    <th>SN / CJ / SQ</th>
                    <th>{isEs ? 'Acciones' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {wlAthletes.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{a.level}</td>
                      <td>
                        {a.oneRM.snatch} / {a.oneRM.cleanJerk} / {a.oneRM.backSquat}
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-outline"
                          onClick={() => setWlProfileEditId(a.id)}
                        >
                          {isEs ? 'Editar PRs' : 'Edit PRs'}
                        </button>
                        <button
                          className="btn-outline"
                          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                          onClick={() => {
                            if (!window.confirm(isEs ? 'Eliminar perfil WL?' : 'Delete WL profile?')) return;
                            void deleteWlAthlete(a.id).then(() => reloadWlAthletesFromApi());
                          }}
                        >
                          {isEs ? 'Eliminar' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {wlProfileEditId ? (() => {
              const profile = wlAthletes.find((a) => a.id === wlProfileEditId);
              if (!profile) return null;
              return (
                <div className="wl-mgmt-inline-form" style={{ marginTop: '16px' }}>
                  <h4 className="wl-mgmt-inline-form-title">{profile.name}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                    {(['snatch', 'cleanJerk', 'backSquat', 'frontSquat'] as const).map((key) => (
                      <label key={key} className="wolf-engine-field">
                        <span className="wolf-engine-field-label">{key}</span>
                        <input
                          type="number"
                          defaultValue={profile.oneRM[key]}
                          id={`wl-pr-${key}-${profile.id}`}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="wl-mgmt-inline-form-btns">
                    <button
                      className="btn-primary"
                      onClick={() => {
                        const oneRM = {
                          snatch: Number((document.getElementById(`wl-pr-snatch-${profile.id}`) as HTMLInputElement)?.value) || 0,
                          cleanJerk: Number((document.getElementById(`wl-pr-cleanJerk-${profile.id}`) as HTMLInputElement)?.value) || 0,
                          backSquat: Number((document.getElementById(`wl-pr-backSquat-${profile.id}`) as HTMLInputElement)?.value) || 0,
                          frontSquat: Number((document.getElementById(`wl-pr-frontSquat-${profile.id}`) as HTMLInputElement)?.value) || 0,
                        };
                        void updateWlAthlete(profile.id, { oneRM }).then(() => {
                          setWlProfileEditId(null);
                          void reloadWlAthletesFromApi();
                        });
                      }}
                    >
                      {isEs ? 'Guardar' : 'Save'}
                    </button>
                    <button className="btn-outline" onClick={() => setWlProfileEditId(null)}>
                      {isEs ? 'Cancelar' : 'Cancel'}
                    </button>
                  </div>
                </div>
              );
            })() : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderCalendarView = () => {
    // Basic traditional calendar logic
    const monthNames = isEs
      ? ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
      : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const daysArr = isEs ? ['Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b', 'Dom'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
    // Adjust for Monday start if needed, but let's keep it simple
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    const prevMonthDays = getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth() - 1);
    const currentMonthDays = getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth());

    for (let i = startOffset; i > 0; i--) days.push({ day: prevMonthDays - i + 1, current: false });
    for (let i = 1; i <= currentMonthDays; i++) days.push({ day: i, current: true });
    while (days.length < 42) days.push({ day: days.length - (currentMonthDays + startOffset) + 1, current: false });

    return (
      <div className="global-calendar-view">
        <header className="panel-header">
          <div className="header-left">
            <h1 className="view-title">
              {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
            </h1>
          </div>
          <div className="header-actions">
            <button className="btn-secondary glass" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}>
              {isEs ? 'Anterior' : 'Prev'}
            </button>
            <button className="btn-secondary glass" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}>
              {isEs ? 'Siguiente' : 'Next'}
            </button>
            <button className="btn-primary" onClick={() => setCalendarDate(new Date())}>
              {isEs ? 'Hoy' : 'Today'}
            </button>
          </div>
        </header>

        <div className="content-area">
          <div className="micro-card glass" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--color-bg-hover)', borderBottom: '1px solid var(--color-border)' }}>
              {daysArr.map(d => (
                <div key={d} style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, auto)' }}>
              {days.map((d, i) => (
                <div key={i} style={{
                  borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid var(--color-border)',
                  borderBottom: '1px solid var(--color-border)',
                  padding: '12px',
                  opacity: d.current ? 1 : 0.3,
                  backgroundColor: d.current ? 'transparent' : 'rgba(0,0,0,0.05)'
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: d.day === new Date().getDate() && d.current && calendarDate.getMonth() === new Date().getMonth() ? 'bold' : 'normal', color: d.day === new Date().getDate() && d.current && calendarDate.getMonth() === new Date().getMonth() ? 'var(--color-accent)' : 'inherit' }}>
                    {d.day}
                  </span>

                  {/* Mock events for visibility */}
                  {d.current && d.day % 7 === 0 && (
                    <div style={{ marginTop: '8px', padding: '4px 8px', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderLeft: '3px solid var(--color-accent)', borderRadius: '4px', fontSize: '0.7rem' }}>
                      {isEs ? 'EvaluaciÃ³n TÃ©cnica' : 'Technical Evaluation'}
                    </div>
                  )}
                  {d.current && d.day % 10 === 0 && (
                    <div style={{ marginTop: '4px', padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--color-error)', borderRadius: '4px', fontSize: '0.7rem' }}>
                      {isEs ? 'Inicio de Bloque: Erik Manzano' : 'Block Start: Erik Manzano'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPlanningView = () => (
    <div className="planning-view">
      <header className="panel-header">
        <h1 className="view-title">
          {isEs ? 'PlanificaciÃ³n del Equipo' : 'Team Training Planning'}
        </h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setIsAssigning(!isAssigning)}>
            <Users size={18} />
            {isEs ? 'Asignar Programa' : 'Assign Program'}
          </button>
        </div>
      </header>

      <div className="content-area">
        {isAssigning && (
          <div className="onboarding-card animate-in" style={{ marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--color-accent)' }}>{isEs ? 'Nueva AsignaciÃ³n' : 'New Assignment'}</h3>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label className="stat-label">{isEs ? 'Atleta' : 'Athlete'}</label>
                <select className="edit-input" value={selectedAthleteId || ''} onChange={e => setSelectedAthleteId(Number(e.target.value))}>
                  <option value="">{isEs ? 'Seleccionar Atleta' : 'Select Athlete'}</option>
                  {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="stat-label">{isEs ? 'Programa Template' : 'Template Program'}</label>
                <select className="edit-input" value={selectedProgramId || ''} onChange={e => setSelectedProgramId(Number(e.target.value))}>
                  <option value="">{isEs ? 'Seleccionar Programa' : 'Select Program'}</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {selectedAthleteId && selectedProgramId && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                  {isEs ? 'ðŸ’¡ Los pesos se calcularÃ¡n automÃ¡ticamente basados en el Onboarding del atleta.' : 'ðŸ’¡ Weights will be auto-calculated based on athlete Onboarding data.'}
                </p>
                <button className="btn-primary" onClick={() => {
                  assignProgram({
                    athleteId: selectedAthleteId,
                    programId: selectedProgramId,
                    startDate: new Date().toISOString().split('T')[0]
                  });
                  setIsAssigning(false);
                  alert(isEs ? 'Programa personalizado y asignado' : 'Program personalized and assigned');
                }}>
                  {isEs ? 'Confirmar y Personalizar' : 'Confirm & Personalize'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="micro-card glass">
          <h3 style={{ marginBottom: '20px' }}>{isEs ? 'Seguimiento del Equipo' : 'Team Status'}</h3>
          <div className="table-container">
            <table className="exercise-table">
              <thead>
                <tr>
                  <th>{isEs ? 'Atleta' : 'Athlete'}</th>
                  <th>{isEs ? 'Programa Actual' : 'Current Program'}</th>
                  <th>{isEs ? 'Estado' : 'Status'}</th>
                  <th>{isEs ? 'Sem. Restantes' : 'Rem. Weeks'}</th>
                  <th>{isEs ? 'Vencimiento' : 'End Date'}</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(ath => {
                  const assignment = assignments.find(a => a.athleteId === ath.id);
                  const program = programs.find(p => p.id === assignment?.programId);

                  let status = 'No Program';
                  let weeksLeft = '-';
                  let endDateStr = '-';
                  let color = 'var(--color-error)';

                  if (assignment && program) {
                    const start = new Date(assignment.startDate);
                    const now = new Date();
                    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    const totalWeeks = program.weeks.length;
                    const elapsedWeeks = Math.floor(diffDays / 7);
                    const remaining = totalWeeks - elapsedWeeks;

                    const endDate = new Date(start);
                    endDate.setDate(endDate.getDate() + (totalWeeks * 7));
                    endDateStr = endDate.toISOString().split('T')[0];

                    if (remaining <= 0) {
                      status = 'Finished';
                      weeksLeft = '0';
                    } else {
                      status = 'Active';
                      weeksLeft = Math.max(0, remaining).toString();
                      color = remaining <= 1 ? 'var(--color-warning)' : 'var(--color-success)';
                    }
                  }

                  return (
                    <tr key={ath.id} className="exercise-row">
                      <td style={{ fontWeight: 'bold' }}>{ath.name}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {program ? program.name : '-'}
                        {assignment?.personalizedProgram && (
                          <span className="badge" style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'var(--color-accent-glow)' }}>
                            {isEs ? 'ADAP' : 'ADAP'}
                          </span>
                        )}
                      </td>
                      <td><span className="badge" style={{ color, borderColor: color }}>{status}</span></td>
                      <td>{weeksLeft}</td>
                      <td>{endDateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExerciseLibrary = () => {
    const allCategories = ['All', ...exerciseLibrary.map(c => c.name)];
    const isAdmin = userRole === 'admin';
    const isCoach = userRole === 'coach';

    const filteredLibrary = exerciseLibrary.map(cat => ({
      ...cat,
      exercises: cat.exercises.filter(ex =>
        (selectedCategory === 'All' || cat.name === selectedCategory) &&
        (ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ex.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    })).filter(cat => cat.exercises.length > 0);

    const activeAssignment = assignments.find(a => a.athleteId === activeAthleteId);
    const currentWeek = activeAssignment?.personalizedProgram?.weeks[0]; // For demo, assume week 1

    return (
      <div className="library-view">
        <header className="panel-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <h1 className="view-title">
              {isEs ? 'Biblioteca Pro' : 'Pro Library'}
              {isAdmin && <span className="badge" style={{ marginLeft: '12px', background: 'var(--color-accent)' }}><ShieldCheck size={12} style={{ marginRight: '4px' }} /> Admin Mode</span>}
            </h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              {isAdmin && (
                <button className="btn-primary" onClick={() => setShowAdminAdd(!showAdminAdd)}>
                  <Plus size={16} /> {isEs ? 'AÃ±adir Maestro' : 'Add Master'}
                </button>
              )}
              {isCoach && (
                <button className="btn-secondary glass" onClick={() => setShowGroupBuilder(!showGroupBuilder)}>
                  <BookMarked size={16} /> {isEs ? 'Nuevo Grupo TÃ©cnico' : 'New Technical Group'}
                </button>
              )}
            </div>
          </div>

          {/* Admin and Coach Build forms remain the same... */}
          {/* ... */}

          {/* Admin Add Exercise Form */}
          {isAdmin && showAdminAdd && (
            <div className="micro-card glass" style={{ width: '100%', padding: '20px', border: '1px solid var(--color-accent)' }}>
              <h3 style={{ marginBottom: '16px' }}>{isEs ? 'Nuevo Ejercicio Maestro (Exclusivo Wolf AI)' : 'New Master Exercise (Wolf AI Exclusive)'}</h3>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <input className="edit-input" placeholder="Nombre" style={{ flex: 1 }} onChange={e => setNewExData({ ...newExData, name: e.target.value })} />
                <select className="edit-input" style={{ width: '150px' }} onChange={e => setNewExData({ ...newExData, category: e.target.value })}>
                  {exerciseLibrary.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <input className="edit-input" placeholder="DescripciÃ³n breve" style={{ flex: 2 }} onChange={e => setNewExData({ ...newExData, desc: e.target.value })} />
                <button className="btn-primary" onClick={() => {
                  addMasterExercise(newExData.category, { name: newExData.name, description: newExData.desc, category: newExData.category });
                  setShowAdminAdd(false);
                }}><Save size={16} /></button>
              </div>
            </div>
          )}

          {/* Coach Group Builder Form */}
          {isCoach && showGroupBuilder && (
            <div className="micro-card glass" style={{ width: '100%', padding: '20px', border: '1px solid var(--color-success)' }}>
              <h3 style={{ marginBottom: '16px' }}>{isEs ? 'Crear Grupo de ProgresiÃ³n TÃ©cnica' : 'Create Technical Progression Group'}</h3>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <input
                  className="edit-input"
                  placeholder={isEs ? "Ej: Halterofilia Nivel 1" : "Ex: Weightlifting Level 1"}
                  style={{ flex: 1 }}
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
                <button className="btn-primary" onClick={() => {
                  createCustomGroup(newGroupName);
                  setNewGroupName('');
                  setShowGroupBuilder(false);
                }}>{isEs ? 'Crear' : 'Create'}</button>
                <button className="icon-btn" onClick={() => setShowGroupBuilder(false)}><X /></button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', width: '100%', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={18} />
              <input
                type="text"
                placeholder={isEs ? "Buscar ejercicios..." : "Search exercises..."}
                className="edit-input"
                style={{ paddingLeft: '40px', background: 'rgba(255,255,255,0.05)', width: '100%' }}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', maxWidth: '100%' }}>
              {allCategories.map(catName => (
                <button
                  key={catName}
                  className={`btn-outline ${selectedCategory === catName ? 'active-tab' : ''}`}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '6px 16px',
                    fontSize: '0.85rem',
                    background: selectedCategory === catName ? 'var(--color-accent)' : 'transparent',
                    borderColor: selectedCategory === catName ? 'var(--color-accent)' : 'var(--color-border)'
                  }}
                  onClick={() => setSelectedCategory(catName)}
                >
                  {catName}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="content-area">
          {/* Custom Groups Section for Coaches */}
          {isCoach && customGroups.length > 0 && selectedCategory === 'All' && (
            <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(255,100,0,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,100,0,0.2)' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--color-accent)' }}>
                <Layers size={20} /> {isEs ? 'Tus Grupos Premium' : 'Your Premium Groups'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                {customGroups.map(group => {
                  const isExpanded = expandedGroups.includes(group.id);
                  const displayExercises = isExpanded ? group.exercises : group.exercises.slice(0, 10);
                  const hasMore = group.exercises.length > 10;

                  return (
                    <div key={group.id} className="micro-card glass" style={{ borderLeft: '4px solid var(--color-success)', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{group.name}</h3>
                          <span className="badge" style={{ fontSize: '0.75rem', marginTop: '4px' }}>{group.exercises.length} {isEs ? 'Ejercicios' : 'Exercises'}</span>
                        </div>
                        {hasMore && (
                          <button
                            className="btn-outline"
                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                            onClick={() => {
                              setExpandedGroups(prev =>
                                isExpanded ? prev.filter(id => id !== group.id) : [...prev, group.id]
                              );
                            }}
                          >
                            {isExpanded ? (isEs ? 'Ver menos' : 'See less') : (isEs ? 'Ver todos' : 'View all')}
                          </button>
                        )}
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '10px'
                      }}>
                        {displayExercises.map(exId => {
                          const ex = exerciseLibrary.flatMap(c => c.exercises).find(e => e.id === exId);
                          return ex ? (
                            <div
                              key={exId}
                              className="glass"
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                background: 'rgba(255,255,255,0.02)'
                              }}
                            >
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }}></div>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group Selector Tooltip/Modal Logic */}
          {showGroupSelectorFor && (
            <div className="modal-overlay" style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)'
            }}>
              <div className="glass" style={{
                padding: '32px', border: '1px solid var(--color-accent)', minWidth: '500px',
                borderRadius: '24px', boxShadow: '0 20px 80px rgba(0,0,0,0.5)', maxWidth: '80%'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{isEs ? 'AÃ±adir a...' : 'Add to...'}</h2>
                  <button className="icon-btn" onClick={() => setShowGroupSelectorFor(null)}><X /></button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                  {/* Column 1: Groups (Playlists) */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookMarked size={14} color="var(--color-success)" /> {isEs ? 'Grupos TÃ©cnicos' : 'Technical Groups'}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
                      {customGroups.map(g => (
                        <button
                          key={g.id}
                          className="btn-secondary glass" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '10px', fontSize: '0.85rem' }}
                          onClick={() => {
                            addToCustomGroup(g.id, showGroupSelectorFor);
                            setShowGroupSelectorFor(null);
                          }}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Active Sessions (Planning) */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CalendarIcon size={14} color="var(--color-accent)" /> {isEs ? 'PlanificaciÃ³n Activa' : 'Active Planning'}
                    </h4>
                    <p style={{ fontSize: '0.8rem', marginBottom: '12px', color: 'var(--color-text-secondary)' }}>
                      {isEs ? 'Atleta:' : 'Athlete:'} <strong>{athletes.find(a => a.id === activeAthleteId)?.name}</strong>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentWeek?.days.map(d => (
                        <button
                          key={d.id}
                          className="btn-primary glass" style={{ justifyContent: 'flex-start', padding: '10px', fontSize: '0.85rem' }}
                          onClick={() => {
                            const libEx = exerciseLibrary.flatMap(c => c.exercises).find(e => e.id === showGroupSelectorFor);
                            if (libEx) addExerciseToProgramSession(activeAthleteId || 1, currentWeek.weekNumber, d.dayNumber, libEx);
                            setShowGroupSelectorFor(null);
                          }}
                        >
                          {isEs ? `AÃ±adir a DÃ­a ${d.dayNumber}` : `Add to Day ${d.dayNumber}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Program Templates (Commercial) */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Dumbbell size={14} color="var(--color-warning)" /> {isEs ? 'Plantillas Maestras' : 'Master Templates'}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
                      {programs.map(p => (
                        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{p.name}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn-outline"
                              style={{ flex: 1, padding: '4px', fontSize: '0.7rem', borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
                              onClick={() => {
                                const libEx = exerciseLibrary.flatMap(c => c.exercises).find(e => e.id === showGroupSelectorFor);
                                // Simplified: add to day 1 of week 1 of template
                                if (libEx) {
                                  console.log('Adding to template:', p.name);
                                  setShowGroupSelectorFor(null);
                                }
                              }}
                            >
                              + {isEs ? 'DÃ­a 1' : 'Day 1'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                      <button className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', background: 'var(--gradient-premium)', border: 'none' }}>
                        <TrendingUp size={14} style={{ marginRight: '6px' }} /> {isEs ? 'Vender esta Rutina' : 'Sell this Routine'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="microcycle-grid" style={{ marginTop: '24px' }}>
            {filteredLibrary.map(cat => (
              <div key={cat.name} style={{ width: '100%', gridColumn: '1 / -1', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: 'var(--color-accent)', marginBottom: 0, fontSize: '1.2rem' }}>{cat.name}</h3>
                  <button
                    className="btn-outline"
                    style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                    onClick={() => {
                      cat.exercises.forEach(ex => {
                        addExerciseToProgramSession(activeAthleteId || 1, selectedWeek, 1, ex);
                      });
                    }}
                  >
                    <Plus size={12} style={{ marginRight: '4px' }} /> {isEs ? 'AÃ±adir Todo' : 'Add All'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {cat.exercises.map(ex => (
                    <div
                      key={ex.id}
                      className="micro-card glass library-item-card"
                      style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                      onClick={() => setSelectedExerciseId(ex.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{ex.name}</h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isCoach && (
                            <button
                              className="icon-btn-sm"
                              title={isEs ? "AÃ±adir a playlist" : "Add to playlist"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowGroupSelectorFor(ex.id);
                              }}
                            >
                              <BookMarked size={14} />
                            </button>
                          )}
                          <Info size={16} color="var(--color-accent)" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px', minHeight: '40px' }}>
                        {ex.description}
                      </p>
                      {ex.muscles && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px' }}>
                          {ex.muscles.map(m => <span key={m} className="badge" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{m}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="central-panel">
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'athletes' && renderAthletesView()}
      {activeView === 'planning' && renderPlanningView()}
      {(activeView === 'micros' || activeView === 'sessions' || activeView === 'macros' || activeView === 'mesos') && renderPeriodization()}
      {activeView === 'library' && renderExerciseLibrary()}
      {(activeView === 'programs' || activeView === 'wolf-engine') && (
        <WlProgramsPanel language={language} />
      )}
      {activeView === 'praxiogram' && <PraxiogramsPanel language={language} />}
      {(activeView === 'wl-exercises' || activeView === 'exercise-intelligence') && (
        <CoachExerciseLibrary language={language} />
      )}
      {activeView === 'my-wl-plan' && <AthleteTrainingView language={language} />}
      {activeView === 'admin-users' && renderAdminUsersView()}
      {activeView === 'global-calendar' && renderCalendarView()}
      {activeView === 'account' && (
        <WlAccountView
          isEs={isEs}
          language={language}
          setLanguage={setLanguage}
          onLogout={onRequestLogout}
          onNavigate={(view: AppViewId) => setActiveView(view)}
        />
      )}
      {activeView === 'aicoach' && renderPlaceholder(isEs ? 'InteractÃºa en el panel derecho' : 'Interact on the right panel', <Settings2 size={64} />)}
    </div>
  );
};

export default CentralPanel;
