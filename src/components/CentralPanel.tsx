import React, { useEffect, useState } from 'react';
import './CentralPanel.css';
import {
  ChevronRight, Settings2, SlidersHorizontal, Share, Download, GripVertical, Plus,
  LayoutDashboard, Dumbbell, Calendar as CalendarIcon, ArrowLeft, TrendingUp, Award,
  BarChart3, Clock, Users, BotMessageSquare as IntakeIcon, Search, Info, ShieldCheck, CheckCircle2,
  Save, X, BookMarked, Layers, MoveDiagonal, Pencil, Trash2, Undo2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { Athlete, IntakeData } from '../context/AppContext';
import OlympicEnginePanel from './OlympicEnginePanel';
import QuickSessionModule from './QuickSessionModule';
import ProTemplatesModule from './ProTemplatesModule';
import AthleteTrainingView from './AthleteTrainingView';
import PerformanceStatsHistory from './PerformanceStatsHistory';
import { useWolfAssign } from '../context/WolfAssignContext';
import { appAthleteIdForWlProfile } from '../utils/wlStatsBridge';
import { validateIntakeStep, validateFullIntake, firstIntakeStepWithErrors } from '../utils/intakeValidation';

interface CentralPanelProps {
  language: 'ES' | 'EN';
  activeView: string;
  setActiveView: (view: string) => void;
}


const CentralPanel: React.FC<CentralPanelProps> = ({ language, activeView, setActiveView }) => {
  const isEs = language === 'ES';
  const { persona, athleteUser } = useWolfAssign();
  const {
    athletes, archivedAthletes, addAthlete, updateAthlete, removeAthlete, restoreAthlete, programs,
    assignments, assignProgram, intakes, submitIntake,
    exerciseLibrary, updateExerciseLog, setSelectedExerciseId,
    userRole, customGroups, createCustomGroup, addToCustomGroup, addMasterExercise,
    addExerciseToProgramSession, selectedWeek, setSelectedWeek,
    loadDemoData
  } = useAppContext();
  const [currentTab, setCurrentTab] = useState<'micro' | 'session'>('micro');

  // Athlete View States
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState('');
  const [newAthleteLevel, setNewAthleteLevel] = useState('Beginner');
  const [editingAthleteId, setEditingAthleteId] = useState<number | null>(null);
  const [editingAthleteName, setEditingAthleteName] = useState('');
  const [editingAthleteLevel, setEditingAthleteLevel] = useState('Beginner');
  const [assigningTo, setAssigningTo] = useState<number | null>(null);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [athleteLevelFilter, setAthleteLevelFilter] = useState('All');
  const [athleteSortBy, setAthleteSortBy] = useState<'name' | 'level' | 'program'>('name');
  const [athleteSortDir, setAthleteSortDir] = useState<'asc' | 'desc'>('asc');
  const [athletePage, setAthletePage] = useState(1);

  // Intake Questionnaire States
  const [intakeStep, setIntakeStep] = useState(1);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [activeAthleteId, setActiveAthleteId] = useState<number | null>(1); // Erik Manzano — demo principal
  const [intakeFormData, setIntakeFormData] = useState<Omit<IntakeData, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    responses: {
      weight: '',
      height: '',
      bodyFat: '',
      snatch: '',
      cleanJerk: '',
      deadlift: '',
      backSquat: '',
      frontSquat: '',
      experience: '',
      goals: ''
    }
  });
  const [intakeFormErrors, setIntakeFormErrors] = useState<Record<string, string>>({});
  /** Tras guardar Stats/PRs: pantalla de “qué sigue” (primer contacto frecuente). */
  const [intakeSubmitSuccess, setIntakeSubmitSuccess] = useState(false);

  useEffect(() => {
    if (activeView !== 'onboarding') setIntakeSubmitSuccess(false);
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'planning' || activeView === 'sessions') setActiveView('athletes');
  }, [activeView, setActiveView]);

  /** Stats/PRs es vista de atleta; el coach no debe quedar en esta ruta. */
  useEffect(() => {
    if (persona === 'coach' && activeView === 'onboarding') {
      setActiveView('wolf-engine');
    }
  }, [persona, activeView, setActiveView]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdminAdd, setShowAdminAdd] = useState(false);
  const [showGroupBuilder, setShowGroupBuilder] = useState(false);
  const [newExData, setNewExData] = useState({ name: '', category: 'Olympic', desc: '' });
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [showGroupSelectorFor, setShowGroupSelectorFor] = useState<number | null>(null);
  const [isAthletePreview, setIsAthletePreview] = useState(false);

  // Calendar States
  const [calendarDate, setCalendarDate] = useState(new Date());

  if (activeView === 'none') return null;

  // Exercise Management
  const handleAddExercise = (sessionId: number) => {
    console.log('Adding exercise to session:', sessionId);
    // This is a demo, so we'll just log it or we could update a local state if we had one for sessions
  };

  // Athlete Management
  const handleAddAthlete = () => {
    const cleanName = newAthleteName.trim();
    if (!cleanName) return;
    addAthlete({ name: cleanName, level: newAthleteLevel });
    setNewAthleteName('');
    setNewAthleteLevel('Beginner');
    setShowAddAthlete(false);
  };

  const startEditAthlete = (ath: Athlete) => {
    setEditingAthleteId(ath.id);
    setEditingAthleteName(ath.name);
    setEditingAthleteLevel(ath.level);
  };

  const cancelEditAthlete = () => {
    setEditingAthleteId(null);
    setEditingAthleteName('');
    setEditingAthleteLevel('Beginner');
  };

  const saveEditAthlete = () => {
    if (editingAthleteId == null) return;
    const cleanName = editingAthleteName.trim();
    if (!cleanName) return;
    updateAthlete(editingAthleteId, { name: cleanName, level: editingAthleteLevel });
    if (selectedAthlete?.id === editingAthleteId) {
      setSelectedAthlete({ ...selectedAthlete, name: cleanName, level: editingAthleteLevel });
    }
    cancelEditAthlete();
  };

  useEffect(() => {
    setAthletePage(1);
  }, [athleteSearch, athleteLevelFilter, athleteSortBy, athleteSortDir]);

  const handleAssignProgram = (athleteId: number, programId: number) => {
    assignProgram({
      athleteId,
      programId,
      startDate: new Date().toISOString().split('T')[0]
    });
    setAssigningTo(null);
  };

  const getAthleteAssignment = (athleteId: number) => {
    const assignment = assignments.find(a => a.athleteId === athleteId);
    if (!assignment) return null;
    const program = programs.find(p => p.id === assignment.programId);
    return { ...assignment, program };
  };

  // Calendar Calculation
  const renderAthleteCalendar = (athlete: Athlete) => {
    const assignment = getAthleteAssignment(athlete.id);

    if (!assignment || !assignment.program) {
      return (
        <div className="mock-view" style={{ marginTop: '24px' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {isEs ? 'Este atleta no tiene un programa asignado.' : 'This athlete has no assigned program.'}
          </p>
        </div>
      );
    }

    const start = new Date(assignment.startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Assume 7 days a week for training blocks
    const durationWeeks = assignment.program.weeks.length;
    const currentWeek = Math.floor(diffDays / 7) + 1;
    const currentDay = (diffDays % 7) + 1;

    const isCompleted = currentWeek > durationWeeks;

    return (
      <div className="calendar-view" style={{ marginTop: '24px' }}>
        <div className="micro-card glass" style={{ backgroundColor: 'var(--color-bg-hover)' }}>
          <h3 style={{ color: 'var(--color-accent)' }}>{assignment.program.name}</h3>
          <p style={{ marginTop: '8px', color: 'var(--color-text-secondary)' }}>
            {isEs ? 'Iniciado:' : 'Started:'} {assignment.startDate}
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-main)', borderRadius: '8px', textAlign: 'center', minWidth: '120px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{isEs ? 'Semana Actual' : 'Current Week'}</span>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: isCompleted ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                {isCompleted ? 'Done' : `${currentWeek} / ${durationWeeks}`}
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-main)', borderRadius: '8px', textAlign: 'center', minWidth: '120px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{isEs ? 'Día de la semana' : 'Day of Week'}</span>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: isCompleted ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                {isCompleted ? '-' : currentDay}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginBottom: '12px', color: 'var(--color-text-secondary)' }}>{isEs ? 'Progreso' : 'Progress'}</h4>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: isCompleted ? '100%' : `${Math.min(100, (currentWeek / durationWeeks) * 100)}%`,
                backgroundColor: 'var(--color-accent)'
              }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAthletesView = () => {
    const filteredAthletes = athletes.filter((ath) => {
      const matchesSearch = ath.name.toLowerCase().includes(athleteSearch.trim().toLowerCase());
      const matchesLevel = athleteLevelFilter === 'All' || ath.level === athleteLevelFilter;
      return matchesSearch && matchesLevel;
    });
    const sortedAthletes = [...filteredAthletes].sort((a, b) => {
      const direction = athleteSortDir === 'asc' ? 1 : -1;
      if (athleteSortBy === 'name') return a.name.localeCompare(b.name) * direction;
      if (athleteSortBy === 'level') return a.level.localeCompare(b.level) * direction;
      const aProgram = getAthleteAssignment(a.id)?.program?.name ?? '';
      const bProgram = getAthleteAssignment(b.id)?.program?.name ?? '';
      return aProgram.localeCompare(bProgram) * direction;
    });
    const pageSize = 8;
    const totalPages = Math.max(1, Math.ceil(sortedAthletes.length / pageSize));
    const currentPage = Math.min(athletePage, totalPages);
    const pagedAthletes = sortedAthletes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const assignedCount = athletes.filter((ath) => Boolean(getAthleteAssignment(ath.id)?.program)).length;

    if (selectedAthlete) {
      return (
        <div className="athletes-view">
          <header className="panel-header">
            <div className="header-left">
              <button
                onClick={() => setSelectedAthlete(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', marginBottom: '16px' }}
              >
                <ArrowLeft size={16} /> {isEs ? 'Volver a la lista' : 'Back to list'}
              </button>
              <h1 className="view-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {selectedAthlete.name.charAt(0)}
                </div>
                {selectedAthlete.name}
              </h1>
              <span className="badge" style={{ marginTop: '8px', display: 'inline-block' }}>{selectedAthlete.level}</span>
            </div>
          </header>
          {renderAthleteCalendar(selectedAthlete)}
        </div>
      );
    }

    return (
      <div className="athletes-view">
        <header className="panel-header">
          <div className="header-left">
            <h1 className="view-title">
              {isEs ? 'Gestión de Atletas' : 'Athletes Management'}
            </h1>
          </div>
          <div className="header-actions">
            <button className="btn-primary" onClick={() => setShowAddAthlete(!showAddAthlete)}>
              <Plus size={16} />
              <span>{isEs ? 'Nuevo Atleta' : 'New Athlete'}</span>
            </button>
          </div>
        </header>

        {showAddAthlete && (
          <div className="micro-card glass" style={{ marginBottom: '24px', backgroundColor: 'var(--color-bg-hover)' }}>
            <h3 style={{ marginBottom: '16px' }}>{isEs ? 'Añadir Nuevo Atleta' : 'Add New Athlete'}</h3>
            <div className="athletes-add-grid">
              <input
                type="text"
                className="edit-input"
                style={{ border: '1px solid var(--color-border)' }}
                placeholder={isEs ? 'Nombre del Atleta' : 'Athlete Name'}
                value={newAthleteName}
                onChange={e => setNewAthleteName(e.target.value)}
              />
              <select
                className="edit-input"
                style={{ border: '1px solid var(--color-border)' }}
                value={newAthleteLevel}
                onChange={e => setNewAthleteLevel(e.target.value)}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Elite">Elite</option>
              </select>
              <button className="btn-primary" onClick={handleAddAthlete}>{isEs ? 'Guardar' : 'Save'}</button>
            </div>
          </div>
        )}

        <div className="athletes-kpis">
          <div className="athletes-kpi-card">
            <span>{isEs ? 'Total atletas' : 'Total athletes'}</span>
            <strong>{athletes.length}</strong>
          </div>
          <div className="athletes-kpi-card">
            <span>{isEs ? 'Con programa activo' : 'With active program'}</span>
            <strong>{assignedCount}</strong>
          </div>
          <div className="athletes-kpi-card">
            <span>{isEs ? 'En papelera' : 'In trash'}</span>
            <strong>{archivedAthletes.length}</strong>
          </div>
        </div>

        <div className="athletes-toolbar">
          <div className="athletes-search-wrap">
            <Search size={16} className="athletes-search-ico" />
            <input
              type="text"
              className="edit-input athletes-search-input"
              placeholder={isEs ? 'Buscar atleta...' : 'Search athlete...'}
              value={athleteSearch}
              onChange={(e) => setAthleteSearch(e.target.value)}
            />
          </div>
          <select
            className="edit-input athletes-level-filter"
            value={athleteLevelFilter}
            onChange={(e) => setAthleteLevelFilter(e.target.value)}
          >
            <option value="All">{isEs ? 'Todos los niveles' : 'All levels'}</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Elite">Elite</option>
          </select>
          <select
            className="edit-input athletes-level-filter"
            value={athleteSortBy}
            onChange={(e) => setAthleteSortBy(e.target.value as 'name' | 'level' | 'program')}
          >
            <option value="name">{isEs ? 'Ordenar: Nombre' : 'Sort: Name'}</option>
            <option value="level">{isEs ? 'Ordenar: Nivel' : 'Sort: Level'}</option>
            <option value="program">{isEs ? 'Ordenar: Programa' : 'Sort: Program'}</option>
          </select>
          <button
            type="button"
            className="btn-outline athletes-sort-dir"
            onClick={() => setAthleteSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          >
            {athleteSortDir === 'asc' ? (isEs ? 'Ascendente' : 'Ascending') : (isEs ? 'Descendente' : 'Descending')}
          </button>
        </div>

        <div className="table-container athletes-table-wrap" style={{ marginTop: '24px' }}>
          <table className="exercise-table">
            <thead>
              <tr>
                <th>{isEs ? 'Atleta' : 'Athlete'}</th>
                <th>{isEs ? 'Nivel' : 'Level'}</th>
                <th>{isEs ? 'Programa Actual' : 'Current Program'}</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagedAthletes.map(ath => {
                const assignment = getAthleteAssignment(ath.id);
                const isEditing = editingAthleteId === ath.id;
                return (
                  <tr key={ath.id} className="exercise-row">
                    <td style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          className="edit-input"
                          style={{ border: '1px solid var(--color-border)', width: '100%', maxWidth: '260px' }}
                          value={editingAthleteName}
                          onChange={(e) => setEditingAthleteName(e.target.value)}
                        />
                      ) : (
                        ath.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="edit-input"
                          style={{ border: '1px solid var(--color-border)', width: '160px' }}
                          value={editingAthleteLevel}
                          onChange={(e) => setEditingAthleteLevel(e.target.value)}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Elite">Elite</option>
                        </select>
                      ) : (
                        <span className="badge">{ath.level}</span>
                      )}
                    </td>
                    <td>
                      {assigningTo === ath.id ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            className="edit-input"
                            style={{ border: '1px solid var(--color-border)' }}
                            onChange={(e) => handleAssignProgram(ath.id, parseInt(e.target.value))}
                            defaultValue=""
                          >
                            <option value="" disabled>Select...</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <button className="icon-btn" onClick={() => setAssigningTo(null)}>✖</button>
                        </div>
                      ) : (
                        assignment?.program ? (
                          <span style={{ color: 'var(--color-accent)' }}>{assignment.program.name}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>{isEs ? 'Sin Asignar' : 'Unassigned'}</span>
                        )
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setSelectedAthlete(ath)}>
                          <CalendarIcon size={14} style={{ marginRight: '4px' }} /> {isEs ? 'Ver Calendario' : 'View Calendar'}
                        </button>
                        {!assigningTo && (
                          <button className="btn-secondary glass" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setAssigningTo(ath.id)}>
                            {isEs ? 'Asignar Prog.' : 'Assign Prog.'}
                          </button>
                        )}
                        {isEditing ? (
                          <>
                            <button
                              className="btn-primary"
                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              onClick={saveEditAthlete}
                            >
                              <Save size={14} style={{ marginRight: '4px' }} /> {isEs ? 'Guardar' : 'Save'}
                            </button>
                            <button
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              onClick={cancelEditAthlete}
                            >
                              <X size={14} style={{ marginRight: '4px' }} /> {isEs ? 'Cancelar' : 'Cancel'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              onClick={() => startEditAthlete(ath)}
                            >
                              <Pencil size={14} style={{ marginRight: '4px' }} /> {isEs ? 'Editar' : 'Edit'}
                            </button>
                            <button
                              className="btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--color-error)' }}
                              onClick={() => {
                                if (window.confirm(isEs ? `¿Eliminar a ${ath.name}? Podrás restaurarlo desde la papelera.` : `Delete ${ath.name}? You can restore from trash.`)) {
                                  removeAthlete(ath.id);
                                  if (editingAthleteId === ath.id) cancelEditAthlete();
                                }
                              }}
                            >
                              <Trash2 size={14} style={{ marginRight: '4px' }} /> {isEs ? 'Eliminar' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {pagedAthletes.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <p className="athletes-empty-message">
                      {isEs ? 'No hay atletas con esos filtros.' : 'No athletes match those filters.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sortedAthletes.length > 0 && (
          <div className="athletes-pagination">
            <button
              type="button"
              className="btn-outline"
              disabled={currentPage <= 1}
              onClick={() => setAthletePage((p) => Math.max(1, p - 1))}
            >
              {isEs ? 'Anterior' : 'Previous'}
            </button>
            <span className="athletes-page-indicator">
              {isEs ? 'Página' : 'Page'} {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn-outline"
              disabled={currentPage >= totalPages}
              onClick={() => setAthletePage((p) => Math.min(totalPages, p + 1))}
            >
              {isEs ? 'Siguiente' : 'Next'}
            </button>
          </div>
        )}

        <div className="micro-card glass" style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '10px' }}>{isEs ? 'Papelera de atletas' : 'Athlete trash'}</h3>
          {archivedAthletes.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              {isEs ? 'No hay atletas eliminados recientemente.' : 'No recently deleted athletes.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {archivedAthletes.map((ath) => (
                <div
                  key={ath.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <strong>{ath.name}</strong>
                    <span className="badge" style={{ marginLeft: '8px' }}>{ath.level}</span>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    onClick={() => restoreAthlete(ath.id)}
                  >
                    <Undo2 size={14} style={{ marginRight: '4px' }} /> {isEs ? 'Restaurar' : 'Restore'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPerformanceView = () => (
    <div className="performance-view">
      <header className="panel-header">
        <div className="header-left">
          <h1 className="view-title">
            {isEs ? 'Rendimiento' : 'Performance'}
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '40rem' }}>
            {isEs
              ? 'Historial de Stats y PRs (datos enviados por Erik o pedidos por Ivan). Las barras muestran la evolución entre envíos.'
              : 'Stats & PR history (entries from Erik or requests from Ivan). Bars show progress across submissions.'}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary glass">
            <Download size={16} />
            <span>{isEs ? 'Exportar Reporte' : 'Export Report'}</span>
          </button>
        </div>
      </header>

      <div className="content-area">
        <PerformanceStatsHistory
          language={language}
          persona={persona}
          linkedWlAthleteId={athleteUser?.linkedAthleteId}
          intakes={intakes}
          appAthletes={athletes}
          onGoToStats={() => setActiveView('onboarding')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '28px' }}>
          <div className="micro-card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="var(--color-success)" />
                {isEs ? 'Volumen (demo entreno)' : 'Volume (training demo)'}
              </h3>
            </div>
            <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '20px' }}>
              {[40, 65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                <div key={i} style={{ flex: 1, backgroundColor: 'var(--color-accent)', height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.6 + (h / 200) }}></div>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
              {isEs ? 'Placeholder hasta conectar tonelaje real por sesión.' : 'Placeholder until real per-session tonnage is wired.'}
            </p>
          </div>

          <div className="micro-card glass">
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="var(--color-warning)" />
              {isEs ? 'Distribución de intensidad (demo)' : 'Intensity split (demo)'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: '85%+', color: 'var(--color-error)', width: '25%' },
                { label: '70-85%', color: 'var(--color-warning)', width: '45%' },
                { label: isEs ? 'Bajo 70 %' : 'Under 70%', color: 'var(--color-success)', width: '30%' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                    <span>{item.label}</span>
                    <span>{item.width}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: item.width, height: '100%', backgroundColor: item.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="micro-card glass">
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--color-accent)" />
              {isEs ? 'Último PR registrado (Stats)' : 'Latest logged PRs (Stats)'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const last = [...intakes].filter((x) => x.athleteId === (appAthleteIdForWlProfile(athleteUser?.linkedAthleteId ?? 'ath-you') ?? 1)).sort((a, b) => b.date.localeCompare(a.date))[0];
                if (!last) {
                  return <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{isEs ? 'Sin datos.' : 'No data.'}</p>;
                }
                return (
                  <>
                    <div style={{ backgroundColor: 'var(--color-bg-main)', padding: '12px', borderRadius: '8px' }}>
                      <span className="stat-label">Snatch</span>
                      <p style={{ fontSize: '1.15rem', fontWeight: '700', margin: '4px 0 0' }}>{last.responses.snatch} kg</p>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-bg-main)', padding: '12px', borderRadius: '8px' }}>
                      <span className="stat-label">C&J</span>
                      <p style={{ fontSize: '1.15rem', fontWeight: '700', margin: '4px 0 0' }}>{last.responses.cleanJerk} kg</p>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>{last.date}</p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBreadcrumbs = () => (
    <div className="breadcrumbs">
      <span>{isEs ? 'Macrociclo Olímpico 2026' : 'Olympic Macrocycle 2026'}</span>
      <ChevronRight size={14} className="crumb-icon" />
      <span>{isEs ? 'Mesociclo 1: Acumulación' : 'Mesocycle 1: Accumulation'}</span>
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
                      {isEs ? `Semana ${selectedWeek} · Sesión Focalizada` : `Week ${selectedWeek} · Focused Session`}
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
                {isEs ? 'Planificación de Entrenamiento' : 'Training Periodization'}
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
            <button className="tab">{isEs ? 'Análisis de Carga' : 'Load Analysis'}</button>
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
                      {week.weekNumber === 12 ? (isEs ? 'Peaking' : 'Peaking') : (isEs ? 'Progresión' : 'Progression')}
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
                      <h3 style={{ fontSize: '1.2rem' }}>{isEs ? `Día ${day.dayNumber}` : `Day ${day.dayNumber}`}</h3>
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
                      {isEs ? 'Añadir Ejercicio' : 'Add Exercise'}
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                      {isEs ? 'Tonelaje Total Sesión:' : 'Total Session Tonnage:'} <strong style={{ color: 'var(--color-success)' }}>{(day.exercises.reduce((acc, ex) => acc + (ex.tonnage || 0), 0) || 0).toLocaleString()} kg</strong>
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

  const renderDashboardMock = () => (
    <div className="mock-view">
      <header className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="view-title">
          {isEs ? 'Panel Principal (Dashboard)' : 'Main Dashboard'}
        </h1>
        <button
          className="btn-accent"
          style={{ padding: '12px 24px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(var(--color-accent-rgb), 0.3)' }}
          onClick={() => {
            loadDemoData();
            setActiveView('wolf-engine');
          }}
        >
          <Plus size={20} />
          {isEs ? 'Iniciar Demo: Flujo Entrenador' : 'Start Demo: Coach Workflow'}
        </button>
      </header>
      <div className="content-area" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', paddingTop: '24px' }}>
        <div className="micro-card glass" style={{ flex: '1', minWidth: '300px' }}>
          <LayoutDashboard size={32} color="var(--color-accent)" />
          <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>{isEs ? 'Atletas Activos' : 'Active Athletes'}</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{athletes.length}</p>
        </div>
        <div className="micro-card glass" style={{ flex: '1', minWidth: '300px' }}>
          <Award size={32} color="var(--color-success)" />
          <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>{isEs ? 'Nuevos PRs esta semana' : 'New PRs this week'}</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>12</p>
        </div>
        <div className="micro-card glass" style={{ flex: '1', minWidth: '300px' }}>
          <Clock size={32} color="var(--color-warning)" />
          <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>{isEs ? 'Asistencia a Sesiones' : 'Session Attendance'}</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>94%</p>
        </div>
        <div className="micro-card glass" style={{ flex: '1', minWidth: '300px' }}>
          <IntakeIcon size={32} color="var(--color-accent)" />
          <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>{isEs ? 'Consultas Recibidas' : 'Intakes Received'}</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{intakes.length}</p>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h2 style={{ marginBottom: '16px' }}>{isEs ? 'Alertas de Atletas' : 'Athlete Alerts'}</h2>
        <div className="micro-card glass" style={{ borderLeft: '4px solid var(--color-error)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>{isEs ? 'Carga de Entrenamiento Crítica' : 'Critical Training Load'}</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                {isEs ? 'Juan Perez ha excedido su tonelaje planificado en un 25%.' : 'Juan Perez has exceeded planned tonnage by 25%.'}
              </p>
            </div>
            <button className="btn-outline" style={{ width: 'auto', padding: '4px 12px' }}>{isEs ? 'Ver Perfil' : 'View Profile'}</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlaceholder = (title: string, icon: React.ReactNode) => (
    <div className="mock-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7 }}>
      {icon}
      <h2 style={{ marginTop: '24px', color: 'var(--color-text-secondary)' }}>{title}</h2>
      <p style={{ marginTop: '8px', color: 'var(--color-text-muted)' }}>
        {isEs ? 'Módulo en desarrollo para esta demo.' : 'Module in development for this demo.'}
      </p>
    </div>
  );

  const renderIntakeView = () => {
    const steps = [
      { num: 1, title: isEs ? 'Biometría' : 'Biometrics' },
      { num: 2, title: isEs ? 'Levantamientos' : 'Weightlifting' },
      { num: 3, title: isEs ? 'Fuerza' : 'Strength' },
    ];

    const emptyIntakeResponses = {
      weight: '',
      height: '',
      bodyFat: '',
      snatch: '',
      cleanJerk: '',
      deadlift: '',
      backSquat: '',
      frontSquat: '',
      experience: '',
      goals: '',
    };

    const handleIntakeSubmit = () => {
      const { valid, errors } = validateFullIntake(intakeFormData.responses, language);
      if (!valid) {
        setIntakeFormErrors(errors);
        setIntakeStep(firstIntakeStepWithErrors(errors));
        return;
      }
      setIntakeFormErrors({});
      const wlId = athleteUser?.linkedAthleteId ?? 'ath-you';
      const appAthleteFromWl = appAthleteIdForWlProfile(wlId) ?? 1;
      const athleteIdForIntake = persona === 'athlete' ? appAthleteFromWl : selectedAthleteId ?? 1;
      submitIntake({
        ...intakeFormData,
        athleteId: athleteIdForIntake,
        date: new Date().toISOString().split('T')[0],
      });
      setIntakeStep(1);
      setIntakeFormData({
        date: new Date().toISOString().split('T')[0],
        responses: { ...emptyIntakeResponses },
      });
      setIntakeSubmitSuccess(true);
    };

    const fieldErr = (key: string) => intakeFormErrors[key];
    const clearIntakeErrors = () => setIntakeFormErrors({});
    const inputClass = (key: string) => `edit-input${fieldErr(key) ? ' edit-input--error' : ''}`;

    return (
      <div className="intake-view">
        <header className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IntakeIcon size={28} color="var(--color-accent)" />
            <h1 className="view-title">
              {isEs ? 'Stats, PRs y perfil' : 'Stats, PRs & profile'}
            </h1>
          </div>
          <div className="header-actions">
            {!intakeSubmitSuccess && (
              <span className="badge" style={{ padding: '8px 16px' }}>
                {isEs ? `Paso ${intakeStep} de 3` : `Step ${intakeStep} of 3`}
              </span>
            )}
          </div>
        </header>

        <div className="content-area">
          {intakeSubmitSuccess ? (
            <div
              className="micro-card glass"
              role="status"
              aria-live="polite"
              style={{
                maxWidth: '640px',
                margin: '0 auto',
                padding: '28px 24px',
                borderLeft: '4px solid var(--color-success)',
              }}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '18px' }}>
                <CheckCircle2 size={36} strokeWidth={2} color="var(--color-success)" aria-hidden style={{ flexShrink: 0 }} />
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: '1.35rem', color: 'var(--color-text-primary)' }}>
                    {isEs ? '¡Envío recibido!' : 'Submission received!'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>
                    {isEs
                      ? 'Has completado este registro de Stats y PRs. Suele ser el primer paso para que el equipo tenga datos al día.'
                      : 'You’ve completed this Stats & PRs entry. It’s often the first step so your team has up-to-date numbers.'}
                  </p>
                </div>
              </div>

              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-bg-main)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '18px',
                }}
              >
                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {isEs ? 'Qué pasa ahora' : 'What happens next'}
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>
                  <li style={{ marginBottom: '8px' }}>
                    {isEs
                      ? 'Tu coach puede tardar un poco en revisar el envío y aplicar cambios a cargas o planes. No tienes que hacer nada más de inmediato.'
                      : 'Your coach may take some time to review this entry and apply updates to loads or plans. You don’t need to do anything else right away.'}
                  </li>
                  <li>
                    {isEs
                      ? 'Si te pidieron una actualización concreta, los nuevos valores quedarán enlazados a tu perfil cuando el sistema los procese.'
                      : 'If you were asked for a specific update, new values will attach to your profile once they’re processed.'}
                  </li>
                </ul>
              </div>

              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: '12px',
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-main))',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 22%, var(--color-border))',
                  marginBottom: '22px',
                }}
              >
                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {isEs ? 'Dónde verás lo siguiente' : 'Where you’ll see what’s next'}
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>{isEs ? 'Rendimiento' : 'Performance'}</strong>
                    {isEs
                      ? ': historial de cada envío con fecha (evolución de PRs).'
                      : ': history of each submission with dates (PR progression).'}
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    <strong>{isEs ? 'Motor WL · Programas' : 'WL engine · Programs'}</strong>
                    {isEs
                      ? ': cuando tu coach genere o asigne un plan, puede usar tus últimos PRs de este formulario para las cargas.'
                      : ': when your coach builds or assigns a plan, they can use your latest PRs from here for loads.'}
                  </li>
                  <li>
                    <strong>{isEs ? 'Mi plan WL' : 'My WL plan'}</strong>
                    {isEs
                      ? ': verás el trabajo que te asignen cuando el coach publique el plan.'
                      : ': you’ll see assigned work once your coach publishes the plan.'}
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIntakeSubmitSuccess(false)}
                >
                  {isEs ? 'Entendido, volver al formulario' : 'Got it — back to the form'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIntakeSubmitSuccess(false);
                    setActiveView('performance');
                  }}
                >
                  {isEs ? 'Ir a Rendimiento' : 'Go to Performance'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setIntakeSubmitSuccess(false);
                    setActiveView('wolf-engine');
                  }}
                >
                  {isEs ? 'Ir al motor WL' : 'Go to WL engine'}
                </button>
              </div>
            </div>
          ) : (
          <div className="micro-card glass" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
              {steps.map(s => (
                <div key={s.num} style={{ textAlign: 'center', opacity: intakeStep === s.num ? 1 : 0.4 }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: intakeStep >= s.num ? 'var(--color-accent)' : 'var(--color-bg-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
                    fontWeight: 'bold', color: 'white'
                  }}>
                    {s.num}
                  </div>
                  <span style={{ fontSize: '0.7rem' }}>{s.title}</span>
                </div>
              ))}
            </div>

            {intakeStep === 1 && (
              <div className="animate-in">
                <h3 style={{ marginBottom: '20px', color: 'var(--color-accent)' }}>{isEs ? 'Tus Datos Antropométricos' : 'Biometric Data'}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="stat-label" htmlFor="intake-weight">{isEs ? 'Peso (kg)' : 'Weight (kg)'}</label>
                      <input
                        id="intake-weight"
                        type="text"
                        className={inputClass('weight')}
                        placeholder="0.0"
                        value={intakeFormData.responses.weight}
                        aria-invalid={!!fieldErr('weight')}
                        aria-describedby={fieldErr('weight') ? 'intake-weight-err' : undefined}
                        onChange={e => {
                          clearIntakeErrors();
                          setIntakeFormData({ ...intakeFormData, responses: { ...intakeFormData.responses, weight: e.target.value } });
                        }}
                      />
                      {fieldErr('weight') && <p id="intake-weight-err" className="intake-field-error">{fieldErr('weight')}</p>}
                    </div>
                    <div>
                      <label className="stat-label" htmlFor="intake-height">{isEs ? 'Estatura (cm)' : 'Height (cm)'}</label>
                      <input
                        id="intake-height"
                        type="text"
                        className={inputClass('height')}
                        placeholder="0"
                        value={intakeFormData.responses.height}
                        aria-invalid={!!fieldErr('height')}
                        aria-describedby={fieldErr('height') ? 'intake-height-err' : undefined}
                        onChange={e => {
                          clearIntakeErrors();
                          setIntakeFormData({ ...intakeFormData, responses: { ...intakeFormData.responses, height: e.target.value } });
                        }}
                      />
                      {fieldErr('height') && <p id="intake-height-err" className="intake-field-error">{fieldErr('height')}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="stat-label" htmlFor="intake-bodyfat">{isEs ? 'Porcentaje de Grasa (%)' : 'Body Fat (%)'}</label>
                    <input
                      id="intake-bodyfat"
                      type="text"
                      className={inputClass('bodyFat')}
                      placeholder="15%"
                      value={intakeFormData.responses.bodyFat}
                      aria-invalid={!!fieldErr('bodyFat')}
                      aria-describedby={fieldErr('bodyFat') ? 'intake-bodyfat-err' : undefined}
                      onChange={e => {
                        clearIntakeErrors();
                        setIntakeFormData({ ...intakeFormData, responses: { ...intakeFormData.responses, bodyFat: e.target.value } });
                      }}
                    />
                    {fieldErr('bodyFat') && <p id="intake-bodyfat-err" className="intake-field-error">{fieldErr('bodyFat')}</p>}
                  </div>
                </div>
              </div>
            )}

            {intakeStep === 2 && (
              <div className="animate-in">
                <h3 style={{ marginBottom: '20px', color: 'var(--color-accent)' }}>{isEs ? 'Levantamientos Olímpicos' : 'Olympic Lifts'}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="stat-label" htmlFor="intake-snatch">Snatch (kg)</label>
                      <input
                        id="intake-snatch"
                        type="text"
                        className={inputClass('snatch')}
                        placeholder="MAX"
                        value={intakeFormData.responses.snatch}
                        aria-invalid={!!fieldErr('snatch')}
                        aria-describedby={fieldErr('snatch') ? 'intake-snatch-err' : undefined}
                        onChange={e => {
                          clearIntakeErrors();
                          setIntakeFormData({ ...intakeFormData, responses: { ...intakeFormData.responses, snatch: e.target.value } });
                        }}
                      />
                      {fieldErr('snatch') && <p id="intake-snatch-err" className="intake-field-error">{fieldErr('snatch')}</p>}
                    </div>
                    <div>
                      <label className="stat-label" htmlFor="intake-cj">Clean & Jerk (kg)</label>
                      <input
                        id="intake-cj"
                        type="text"
                        className={inputClass('cleanJerk')}
                        placeholder="MAX"
                        value={intakeFormData.responses.cleanJerk}
                        aria-invalid={!!fieldErr('cleanJerk')}
                        aria-describedby={fieldErr('cleanJerk') ? 'intake-cj-err' : undefined}
                        onChange={e => {
                          clearIntakeErrors();
                          setIntakeFormData({ ...intakeFormData, responses: { ...intakeFormData.responses, cleanJerk: e.target.value } });
                        }}
                      />
                      {fieldErr('cleanJerk') && <p id="intake-cj-err" className="intake-field-error">{fieldErr('cleanJerk')}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {intakeStep === 3 && (
              <div className="animate-in">
                <h3 style={{ marginBottom: '12px', color: 'var(--color-accent)' }}>{isEs ? 'Fuerza de base' : 'Base strength'}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="stat-label" htmlFor="intake-bs">Back Squat (kg)</label>
                      <input
                        id="intake-bs"
                        type="text"
                        className={inputClass('backSquat')}
                        placeholder="MAX"
                        value={intakeFormData.responses.backSquat}
                        aria-invalid={!!fieldErr('backSquat')}
                        aria-describedby={fieldErr('backSquat') ? 'intake-bs-err' : undefined}
                        onChange={e => {
                          clearIntakeErrors();
                          setIntakeFormData({ ...intakeFormData, responses: { ...intakeFormData.responses, backSquat: e.target.value } });
                        }}
                      />
                      {fieldErr('backSquat') && <p id="intake-bs-err" className="intake-field-error">{fieldErr('backSquat')}</p>}
                    </div>
                    <div>
                      <label className="stat-label" htmlFor="intake-fs">Front Squat (kg)</label>
                      <input
                        id="intake-fs"
                        type="text"
                        className={inputClass('frontSquat')}
                        placeholder="MAX"
                        value={intakeFormData.responses.frontSquat}
                        aria-invalid={!!fieldErr('frontSquat')}
                        aria-describedby={fieldErr('frontSquat') ? 'intake-fs-err' : undefined}
                        onChange={e => {
                          clearIntakeErrors();
                          setIntakeFormData({ ...intakeFormData, responses: { ...intakeFormData.responses, frontSquat: e.target.value } });
                        }}
                      />
                      {fieldErr('frontSquat') && <p id="intake-fs-err" className="intake-field-error">{fieldErr('frontSquat')}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="stat-label" htmlFor="intake-dl">Deadlift (kg)</label>
                    <input
                      id="intake-dl"
                      type="text"
                      className={inputClass('deadlift')}
                      placeholder="MAX"
                      value={intakeFormData.responses.deadlift}
                      aria-invalid={!!fieldErr('deadlift')}
                      aria-describedby={fieldErr('deadlift') ? 'intake-dl-err' : undefined}
                      onChange={e => {
                        clearIntakeErrors();
                        setIntakeFormData({ ...intakeFormData, responses: { ...intakeFormData.responses, deadlift: e.target.value } });
                      }}
                    />
                    {fieldErr('deadlift') && <p id="intake-dl-err" className="intake-field-error">{fieldErr('deadlift')}</p>}
                  </div>
                </div>

              </div>
            )}

            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                className="btn-secondary"
                disabled={intakeStep === 1}
                onClick={() => {
                  clearIntakeErrors();
                  setIntakeStep(prev => prev - 1);
                }}
              >
                {isEs ? 'Anterior' : 'Previous'}
              </button>
              {intakeStep < 3 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const { valid, errors } = validateIntakeStep(intakeStep as 1 | 2 | 3, intakeFormData.responses, language);
                    if (!valid) {
                      setIntakeFormErrors(errors);
                      return;
                    }
                    setIntakeFormErrors({});
                    setIntakeStep(prev => prev + 1);
                  }}
                >
                  {isEs ? 'Siguiente' : 'Next'}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={handleIntakeSubmit}>
                  {isEs ? 'Guardar perfil' : 'Save profile'}
                </button>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    // Basic traditional calendar logic
    const monthNames = isEs
      ? ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
      : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const daysArr = isEs ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
                      {isEs ? 'Evaluación Técnica' : 'Technical Evaluation'}
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
          {isEs ? 'Planificación del Equipo' : 'Team Training Planning'}
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
            <h3 style={{ marginBottom: '20px', color: 'var(--color-accent)' }}>{isEs ? 'Nueva Asignación' : 'New Assignment'}</h3>
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
                  {isEs ? '💡 Los pesos se calcularán automáticamente basados en el Onboarding del atleta.' : '💡 Weights will be auto-calculated based on athlete Onboarding data.'}
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
                  <Plus size={16} /> {isEs ? 'Añadir Maestro' : 'Add Master'}
                </button>
              )}
              {isCoach && (
                <button className="btn-secondary glass" onClick={() => setShowGroupBuilder(!showGroupBuilder)}>
                  <BookMarked size={16} /> {isEs ? 'Nuevo Grupo Técnico' : 'New Technical Group'}
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
                <input className="edit-input" placeholder="Descripción breve" style={{ flex: 2 }} onChange={e => setNewExData({ ...newExData, desc: e.target.value })} />
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
              <h3 style={{ marginBottom: '16px' }}>{isEs ? 'Crear Grupo de Progresión Técnica' : 'Create Technical Progression Group'}</h3>
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
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{isEs ? 'Añadir a...' : 'Add to...'}</h2>
                  <button className="icon-btn" onClick={() => setShowGroupSelectorFor(null)}><X /></button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                  {/* Column 1: Groups (Playlists) */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookMarked size={14} color="var(--color-success)" /> {isEs ? 'Grupos Técnicos' : 'Technical Groups'}
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
                      <CalendarIcon size={14} color="var(--color-accent)" /> {isEs ? 'Planificación Activa' : 'Active Planning'}
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
                          {isEs ? `Añadir a Día ${d.dayNumber}` : `Add to Day ${d.dayNumber}`}
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
                              + {isEs ? 'Día 1' : 'Day 1'}
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
                    <Plus size={12} style={{ marginRight: '4px' }} /> {isEs ? 'Añadir Todo' : 'Add All'}
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
                              title={isEs ? "Añadir a playlist" : "Add to playlist"}
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
      {activeView === 'dashboard' && renderDashboardMock()}
      {activeView === 'athletes' && renderAthletesView()}
      {activeView === 'planning' && renderPlanningView()}
      {activeView === 'onboarding' && renderIntakeView()}
      {(activeView === 'micros' || activeView === 'sessions' || activeView === 'macros' || activeView === 'mesos') && renderPeriodization()}
      {activeView === 'performance' && renderPerformanceView()}
      {activeView === 'library' && renderExerciseLibrary()}
      {activeView === 'wolf-engine' && <OlympicEnginePanel language={language} />}
      {activeView === 'wl-quick' && <QuickSessionModule language={language} />}
      {activeView === 'wl-templates' && <ProTemplatesModule language={language} />}
      {activeView === 'my-wl-plan' && <AthleteTrainingView language={language} />}
      {activeView === 'global-calendar' && renderCalendarView()}
      {activeView === 'aicoach' && renderPlaceholder(isEs ? 'Interactúa en el panel derecho' : 'Interact on the right panel', <Settings2 size={64} />)}
    </div>
  );
};

export default CentralPanel;
