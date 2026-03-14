import React, { useState } from 'react';
import './CentralPanel.css';
import { 
  ChevronRight, Settings2, SlidersHorizontal, Share, Download, GripVertical, Plus, 
  LayoutDashboard, Dumbbell, Calendar as CalendarIcon, ArrowLeft, TrendingUp, Award, 
  BarChart3, Clock, Users, BotMessageSquare as IntakeIcon
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { Athlete, Program, TrainingWeek, TrainingDay, Exercise, IntakeData } from '../context/AppContext';

interface CentralPanelProps {
  language: 'ES' | 'EN';
  activeView: string;
}


const CentralPanel: React.FC<CentralPanelProps> = ({ language, activeView }) => {
  const isEs = language === 'ES';
  const { 
    athletes, addAthlete, programs, addProgram, 
    assignments, assignProgram, intakes, submitIntake 
  } = useAppContext();
  const [currentTab, setCurrentTab] = useState<'micro' | 'session'>('micro');
  
  // Athlete View States
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState('');
  const [newAthleteLevel, setNewAthleteLevel] = useState('Beginner');
  const [assigningTo, setAssigningTo] = useState<number | null>(null);

  // Programs View States
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [builderStep, setBuilderStep] = useState<'info' | 'structure'>('info');
  const [newProgramName, setNewProgramName] = useState('');
  const [numWeeks, setNumWeeks] = useState(4);
  const [numDaysPerWeek, setNumDaysPerWeek] = useState(3);
  const [numExercisesPerDay, setNumExercisesPerDay] = useState(4);

  // Intake Questionnaire States
  const [intakeStep, setIntakeStep] = useState(1);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [activeAthleteId, setActiveAthleteId] = useState<number | null>(1); // Default to Alex for demo
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
    if (!newAthleteName) return;
    addAthlete({ name: newAthleteName, level: newAthleteLevel });
    setNewAthleteName('');
    setNewAthleteLevel('Beginner');
    setShowAddAthlete(false);
  };

  const handleCreateProgram = () => {
    if (!newProgramName) return;
    
    // Generate structure N x M x K
    const weeks: TrainingWeek[] = [];
    for (let w = 1; w <= numWeeks; w++) {
      const days: TrainingDay[] = [];
      for (let d = 1; d <= numDaysPerWeek; d++) {
        const exercises: Exercise[] = [];
        for (let e = 1; e <= numExercisesPerDay; e++) {
          exercises.push({
            id: Date.now() + w * 100 + d * 10 + e,
            name: `Exercise ${e}`,
            sets: 3,
            reps: '10',
            load: 'Bar'
          });
        }
        days.push({ id: Date.now() + w * 10 + d, dayNumber: d, exercises });
      }
      weeks.push({ id: Date.now() + w, weekNumber: w, days });
    }

    addProgram({
      name: newProgramName,
      difficulty: 'Intermediate',
      weeks
    });

    setNewProgramName('');
    setShowCreateProgram(false);
    setBuilderStep('info');
  };

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
        <div className="mock-view" style={{marginTop: '24px'}}>
          <p style={{color: 'var(--color-text-muted)'}}>
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
      <div className="calendar-view" style={{marginTop: '24px'}}>
        <div className="micro-card glass" style={{backgroundColor: 'var(--color-bg-hover)'}}>
          <h3 style={{color: 'var(--color-accent)'}}>{assignment.program.name}</h3>
          <p style={{marginTop: '8px', color: 'var(--color-text-secondary)'}}>
            {isEs ? 'Iniciado:' : 'Started:'} {assignment.startDate}
          </p>
          <div style={{marginTop: '20px', display: 'flex', gap: '20px', alignItems: 'center'}}>
             <div style={{padding: '16px', backgroundColor: 'var(--color-bg-main)', borderRadius: '8px', textAlign: 'center', minWidth: '120px'}}>
                <span style={{fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase'}}>{isEs ? 'Semana Actual' : 'Current Week'}</span>
                <p style={{fontSize: '2rem', fontWeight: 'bold', color: isCompleted ? 'var(--color-success)' : 'var(--color-text-primary)'}}>
                   {isCompleted ? 'Done' : `${currentWeek} / ${durationWeeks}`}
                </p>
             </div>
             <div style={{padding: '16px', backgroundColor: 'var(--color-bg-main)', borderRadius: '8px', textAlign: 'center', minWidth: '120px'}}>
                <span style={{fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase'}}>{isEs ? 'Día de la semana' : 'Day of Week'}</span>
                <p style={{fontSize: '2rem', fontWeight: 'bold', color: isCompleted ? 'var(--color-success)' : 'var(--color-text-primary)'}}>
                   {isCompleted ? '-' : currentDay}
                </p>
             </div>
          </div>
          
          <div style={{marginTop: '24px'}}>
             <h4 style={{marginBottom: '12px', color: 'var(--color-text-secondary)'}}>{isEs ? 'Progreso' : 'Progress'}</h4>
             <div style={{width: '100%', height: '8px', backgroundColor: 'var(--color-bg-main)', borderRadius: '4px', overflow: 'hidden'}}>
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
    if (selectedAthlete) {
      return (
        <div className="athletes-view">
          <header className="panel-header">
            <div className="header-left">
              <button 
                onClick={() => setSelectedAthlete(null)}
                style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', marginBottom: '16px'}}
              >
                <ArrowLeft size={16} /> {isEs ? 'Volver a la lista' : 'Back to list'}
              </button>
              <h1 className="view-title" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', fontWeight: 'bold'}}>
                  {selectedAthlete.name.charAt(0)}
                </div>
                {selectedAthlete.name}
              </h1>
              <span className="badge" style={{marginTop: '8px', display: 'inline-block'}}>{selectedAthlete.level}</span>
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
           <div className="micro-card glass" style={{marginBottom: '24px', backgroundColor: 'var(--color-bg-hover)'}}>
             <h3 style={{marginBottom: '16px'}}>{isEs ? 'Añadir Nuevo Atleta' : 'Add New Athlete'}</h3>
             <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                <input 
                  type="text" 
                  className="edit-input" 
                  style={{border: '1px solid var(--color-border)', flex: 1}} 
                  placeholder={isEs ? 'Nombre del Atleta' : 'Athlete Name'}
                  value={newAthleteName}
                  onChange={e => setNewAthleteName(e.target.value)}
                />
                <select 
                  className="edit-input" 
                  style={{border: '1px solid var(--color-border)', width: '200px'}}
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

         <div className="table-container" style={{marginTop: '24px'}}>
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
                {athletes.map(ath => {
                  const assignment = getAthleteAssignment(ath.id);
                  return (
                    <tr key={ath.id} className="exercise-row">
                      <td style={{fontWeight: 'bold', color: 'var(--color-text-primary)'}}>{ath.name}</td>
                      <td><span className="badge">{ath.level}</span></td>
                      <td>
                        {assigningTo === ath.id ? (
                          <div style={{display: 'flex', gap: '8px'}}>
                            <select 
                              className="edit-input" 
                              style={{border: '1px solid var(--color-border)'}}
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
                            <span style={{color: 'var(--color-accent)'}}>{assignment.program.name}</span>
                          ) : (
                            <span style={{color: 'var(--color-text-muted)'}}>{isEs ? 'Sin Asignar' : 'Unassigned'}</span>
                          )
                        )}
                      </td>
                      <td>
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button className="btn-outline" style={{padding: '4px 8px', fontSize: '0.8rem'}} onClick={() => setSelectedAthlete(ath)}>
                             <CalendarIcon size={14} style={{marginRight: '4px'}}/> {isEs ? 'Ver Calendario' : 'View Calendar'}
                          </button>
                          {!assigningTo && (
                            <button className="btn-secondary glass" style={{padding: '4px 8px', fontSize: '0.8rem'}} onClick={() => setAssigningTo(ath.id)}>
                               {isEs ? 'Asignar Prog.' : 'Assign Prog.'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
         </div>
      </div>
    );
  };

  const renderProgramsView = () => {
    if (selectedProgram) {
      return (
        <div className="programs-view">
          <header className="panel-header">
            <div className="header-left">
              <button 
                onClick={() => setSelectedProgram(null)}
                style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', marginBottom: '16px'}}
              >
                <ArrowLeft size={16} /> {isEs ? 'Todos los programas' : 'All Programs'}
              </button>
              <h1 className="view-title">
                {selectedProgram.name}
              </h1>
              <p style={{color: 'var(--color-text-muted)', marginTop: '8px'}}>
                {isEs ? `Duración: ${selectedProgram.weeks.length} Semanas` : `Duration: ${selectedProgram.weeks.length} Weeks`}
              </p>
            </div>
            <div className="header-actions">
              <button className="btn-primary">
                <Settings2 size={16} />
                <span>{isEs ? 'Editar Estructura' : 'Edit Structure'}</span>
              </button>
            </div>
          </header>
          
          <div className="content-area">
             <div className="microcycle-grid">
               {[1, 2, 3, 4].map(w => (
                 <div key={w} className="micro-card glass" style={{borderTop: '4px solid var(--color-accent)'}}>
                    <h3 style={{marginBottom: '12px'}}>{isEs ? `Semana ${w}` : `Week ${w}`}</h3>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                       <div className="stat" style={{backgroundColor: 'var(--color-bg-main)', padding: '8px', borderRadius: '4px'}}>
                          <span className="stat-label">Enfoque</span>
                          <span style={{fontSize: '0.9rem'}}>{w === 4 ? (isEs ? 'Descarga' : 'Deload') : (isEs ? 'Acumulación' : 'Accumulation')}</span>
                       </div>
                       <div className="stat" style={{backgroundColor: 'var(--color-bg-main)', padding: '8px', borderRadius: '4px'}}>
                          <span className="stat-label">Intensidad</span>
                          <span style={{fontSize: '0.9rem'}}>{70 + (w * 5)}% AVG</span>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      );
    }

    return (
      <div className="programs-view">
        <header className="panel-header">
          <div className="header-left">
            <h1 className="view-title">
              {isEs ? 'Biblioteca de Programas' : 'Program Library'}
            </h1>
          </div>
          <div className="header-actions">
            <button className="btn-primary" onClick={() => setShowCreateProgram(!showCreateProgram)}>
               <Plus size={16} />
               <span>{isEs ? 'Crear Programa' : 'Create Program'}</span>
            </button>
          </div>
        </header>

        {showCreateProgram && (
           <div className="micro-card glass" style={{marginBottom: '24px', backgroundColor: 'var(--color-bg-hover)'}}>
             <h3 style={{marginBottom: '16px'}}>{isEs ? 'Nuevo Programa Maestro' : 'New Master Program'}</h3>
             
             {builderStep === 'info' ? (
               <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
                  <input 
                    type="text" 
                    className="edit-input" 
                    style={{border: '1px solid var(--color-border)', flex: '2', minWidth: '200px'}} 
                    placeholder={isEs ? 'Nombre del Programa' : 'Program Name'}
                    value={newProgramName}
                    onChange={e => setNewProgramName(e.target.value)}
                  />
                  <button className="btn-primary" onClick={() => setBuilderStep('structure')}>
                    {isEs ? 'Siguiente' : 'Next'}
                  </button>
               </div>
             ) : (
               <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px'}}>
                     <div className="stat">
                        <span className="stat-label">{isEs ? 'Semanas' : 'Weeks'}</span>
                        <input type="number" className="edit-input" value={numWeeks} onChange={e => setNumWeeks(parseInt(e.target.value))} />
                     </div>
                     <div className="stat">
                        <span className="stat-label">{isEs ? 'Días/Semana' : 'Days/Week'}</span>
                        <input type="number" className="edit-input" value={numDaysPerWeek} onChange={e => setNumDaysPerWeek(parseInt(e.target.value))} />
                     </div>
                     <div className="stat">
                        <span className="stat-label">{isEs ? 'Ejercicios/Día' : 'Ex/Day'}</span>
                        <input type="number" className="edit-input" value={numExercisesPerDay} onChange={e => setNumExercisesPerDay(parseInt(e.target.value))} />
                     </div>
                  </div>
                  <div style={{display: 'flex', gap: '12px'}}>
                    <button className="btn-secondary" onClick={() => setBuilderStep('info')}>{isEs ? 'Atrás' : 'Back'}</button>
                    <button className="btn-primary" onClick={handleCreateProgram}>{isEs ? 'Generar Estructura' : 'Generate Structure'}</button>
                  </div>
               </div>
             )}
           </div>
        )}

        <div className="microcycle-grid" style={{marginTop: '24px'}}>
           {programs.map(prog => (
             <div key={prog.id} className="micro-card glass" style={{cursor: 'pointer'}} onClick={() => setSelectedProgram(prog)}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px'}}>
                   <div style={{width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <Dumbbell size={20} color="var(--color-accent)"/>
                   </div>
                   <span className="badge">{prog.weeks.length} Wks</span>
                </div>
                <h3 style={{marginBottom: '8px'}}>{prog.name}</h3>
                <p style={{fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px'}}>
                   {isEs ? 'Plan de entrenamiento especializado con bloques de intensidad controlada.' : 'Specialized training plan with controlled intensity blocks.'}
                </p>
                <div style={{display: 'flex', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px'}}>
                   <div className="stat">
                      <span className="stat-label">{isEs ? 'Nivel' : 'Level'}</span>
                      <span style={{fontSize: '0.8rem', fontWeight: '600'}}>Advanced</span>
                   </div>
                   <div className="stat">
                      <span className="stat-label">Tipo</span>
                      <span style={{fontSize: '0.8rem', fontWeight: '600'}}>Strength</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  };

  const renderPerformanceView = () => (
    <div className="performance-view">
      <header className="panel-header">
        <div className="header-left">
          <h1 className="view-title">
            {isEs ? 'Análisis de Rendimiento Pro' : 'Pro Performance Analytics'}
          </h1>
        </div>
        <div className="header-actions">
           <button className="btn-secondary glass">
              <Download size={16} />
              <span>{isEs ? 'Exportar Reporte' : 'Export Report'}</span>
           </button>
        </div>
      </header>

      <div className="content-area">
         <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px'}}>
            {/* Tonnage Chart Simulation */}
            <div className="micro-card glass">
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                  <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                     <TrendingUp size={18} color="var(--color-success)"/>
                     {isEs ? 'Volumen Total (Tonelaje)' : 'Total Volume (Tonnage)'}
                  </h3>
               </div>
               <div style={{height: '150px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '20px'}}>
                  {[40, 65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                    <div key={i} style={{flex: 1, backgroundColor: 'var(--color-accent)', height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.6 + (h/200)}}></div>
                  ))}
               </div>
               <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '12px'}}>
                  <div className="stat"><span className="stat-label">MAX</span><span style={{fontSize: '1rem', fontWeight: 'bold'}}>12,450 kg</span></div>
                  <div className="stat"><span className="stat-label">AVG</span><span style={{fontSize: '1rem', fontWeight: 'bold'}}>8,200 kg</span></div>
               </div>
            </div>

            {/* Intensity Distribution */}
            <div className="micro-card glass">
               <h3 style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <BarChart3 size={18} color="var(--color-warning)"/>
                  {isEs ? 'Distribución de Intensidad' : 'Intensity Distribution'}
               </h3>
               <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {[
                    { label: '85%+', color: 'var(--color-error)', width: '25%' },
                    { label: '70-85%', color: 'var(--color-warning)', width: '45%' },
                    { label: 'Less than 70%', color: 'var(--color-success)', width: '30%' }
                  ].map((item, i) => (
                    <div key={i}>
                       <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem'}}>
                          <span>{item.label}</span>
                          <span>{item.width}</span>
                       </div>
                       <div style={{width: '100%', height: '8px', backgroundColor: 'var(--color-bg-main)', borderRadius: '4px', overflow: 'hidden'}}>
                          <div style={{width: item.width, height: '100%', backgroundColor: item.color}}></div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* PR Progress Tracker */}
            <div className="micro-card glass">
               <h3 style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Award size={18} color="var(--color-accent)"/>
                  {isEs ? 'Récords Personales (PR)' : 'Personal Records (PR)'}
               </h3>
               <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div style={{backgroundColor: 'var(--color-bg-main)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                     <div>
                        <span className="stat-label">Snatch</span>
                        <p style={{fontSize: '1.25rem', fontWeight: '700'}}>115 kg</p>
                     </div>
                     <span style={{color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 'bold'}}>+5 kg</span>
                  </div>
                  <div style={{backgroundColor: 'var(--color-bg-main)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                     <div>
                        <span className="stat-label">Clean & Jerk</span>
                        <p style={{fontSize: '1.25rem', fontWeight: '700'}}>145 kg</p>
                     </div>
                     <span style={{color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 'bold'}}>+7.5 kg</span>
                  </div>
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

  const renderPeriodization = () => (
    <>
      <header className="panel-header">
        <div className="header-left">
          {renderBreadcrumbs()}
          <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px'}}>
            <h1 className="view-title" style={{marginBottom: 0}}>
              {isEs ? 'Planificación de Entrenamiento' : 'Training Periodization'}
            </h1>
            <div style={{marginLeft: '12px'}}>
              <select 
                className="edit-input" 
                style={{width: '200px', borderBottom: '1px solid var(--color-accent)'}}
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
            {isEs ? 'Sesiones Diarias' : 'Daily Sessions'}
          </button>
          <button className="tab">{isEs ? 'Análisis de Carga' : 'Load Analysis'}</button>
        </div>
        <div className="toolbar-filters">
          <button className="icon-btn"><Settings2 size={18} /></button>
          <button className="icon-btn"><SlidersHorizontal size={18} /></button>
        </div>
      </div>

      <div className="content-area">
        {(() => {
          const assignment = assignments.find(a => a.athleteId === activeAthleteId);
          const currentProgram = assignment?.personalizedProgram || programs[0];
          const displayWeeks = currentProgram?.weeks || [];
          const firstWeekSessions = displayWeeks[0]?.days || [];

          if (currentTab === 'micro') {
            return (
              <div className="microcycle-grid">
                {displayWeeks.map((week) => (
                  <div key={week.id} className="micro-card glass">
                    <div className="micro-header">
                      <h3>{isEs ? `Semana ${week.weekNumber}` : `Week ${week.weekNumber}`}</h3>
                      <span className="badge">{isEs ? 'Carga Adaptada' : 'Adapted Load'}</span>
                    </div>
                    <div className="micro-stats">
                      <div className="stat">
                        <span className="stat-label">{isEs ? 'Días' : 'Days'}</span>
                        <span className="stat-value">{week.days.length}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">{isEs ? 'Ejercicios' : 'Exercises'}</span>
                        <span className="stat-value">{week.days.reduce((acc, d) => acc + d.exercises.length, 0)}</span>
                      </div>
                    </div>
                    <div className="micro-footer">
                      <button className="btn-outline" onClick={() => setCurrentTab('session')}>
                        {isEs ? 'Ver Sesiones' : 'View Sessions'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          } else {
            return (
              <div className="sessions-list">
                {firstWeekSessions.map((day) => (
                  <div key={day.id} className="session-card glass">
                    <div className="session-header">
                      <h3>{isEs ? `Día ${day.dayNumber}: ${day.exercises[0]?.name || 'Entrenamiento'}` : `Day ${day.dayNumber}: ${day.exercises[0]?.name || 'Training'}`}</h3>
                      <button className="icon-btn"><Settings2 size={16} /></button>
                    </div>
                    <div className="table-container">
                      <table className="exercise-table">
                        <thead>
                          <tr>
                            <th></th>
                            <th>{isEs ? 'Ejercicio' : 'Exercise'}</th>
                            <th>{isEs ? 'Series' : 'Sets'}</th>
                            <th>{isEs ? 'Reps' : 'Reps'}</th>
                            <th>{isEs ? 'Carga (Auto)' : 'Load (Auto)'}</th>
                            <th>RPE</th>
                            <th>{isEs ? 'Descanso' : 'Rest'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.exercises.map((ex) => (
                            <tr key={ex.id} className="exercise-row">
                              <td className="drag-handle"><GripVertical size={16} /></td>
                              <td><input type="text" className="edit-input ex-name" defaultValue={ex.name} /></td>
                              <td><input type="number" className="edit-input num" defaultValue={ex.sets} /></td>
                              <td><input type="text" className="edit-input" defaultValue={ex.reps} /></td>
                              <td><input type="text" className="edit-input" defaultValue={ex.load} style={{color: ex.load.includes('(') ? 'var(--color-accent)' : 'inherit', fontWeight: ex.load.includes('(') ? 'bold' : 'normal'}} /></td>
                              <td><input type="text" className="edit-input" defaultValue={'8'} /></td>
                              <td><input type="text" className="edit-input" defaultValue={'2-3min'} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="session-footer">
                      <button className="add-exercise-btn" onClick={() => handleAddExercise(day.id)}>
                        <Plus size={16} />
                        {isEs ? 'Añadir Ejercicio' : 'Add Exercise'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          }
        })()}
      </div>
    </>
  );

  const renderDashboardMock = () => (
    <div className="mock-view">
       <header className="panel-header">
          <h1 className="view-title">
            {isEs ? 'Panel Principal (Dashboard)' : 'Main Dashboard'}
          </h1>
       </header>
       <div className="content-area" style={{display: 'flex', gap: '24px', flexWrap: 'wrap', paddingTop: '24px'}}>
         <div className="micro-card glass" style={{flex: '1', minWidth: '300px'}}>
            <LayoutDashboard size={32} color="var(--color-accent)"/>
            <h3 style={{marginTop: '16px', marginBottom: '8px'}}>{isEs ? 'Atletas Activos' : 'Active Athletes'}</h3>
            <p style={{fontSize: '2rem', fontWeight: 'bold'}}>{athletes.length}</p>
         </div>
         <div className="micro-card glass" style={{flex: '1', minWidth: '300px'}}>
            <Award size={32} color="var(--color-success)"/>
            <h3 style={{marginTop: '16px', marginBottom: '8px'}}>{isEs ? 'Nuevos PRs esta semana' : 'New PRs this week'}</h3>
            <p style={{fontSize: '2rem', fontWeight: 'bold'}}>12</p>
         </div>
         <div className="micro-card glass" style={{flex: '1', minWidth: '300px'}}>
            <Clock size={32} color="var(--color-warning)"/>
            <h3 style={{marginTop: '16px', marginBottom: '8px'}}>{isEs ? 'Asistencia a Sesiones' : 'Session Attendance'}</h3>
            <p style={{fontSize: '2rem', fontWeight: 'bold'}}>94%</p>
         </div>
         <div className="micro-card glass" style={{flex: '1', minWidth: '300px'}}>
            <IntakeIcon size={32} color="var(--color-accent)"/>
            <h3 style={{marginTop: '16px', marginBottom: '8px'}}>{isEs ? 'Consultas Recibidas' : 'Intakes Received'}</h3>
            <p style={{fontSize: '2rem', fontWeight: 'bold'}}>{intakes.length}</p>
         </div>
       </div>

       <div style={{marginTop: '32px'}}>
          <h2 style={{marginBottom: '16px'}}>{isEs ? 'Alertas de Atletas' : 'Athlete Alerts'}</h2>
          <div className="micro-card glass" style={{borderLeft: '4px solid var(--color-error)'}}>
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h4 style={{color: 'var(--color-error)', fontWeight: 'bold'}}>{isEs ? 'Carga de Entrenamiento Crítica' : 'Critical Training Load'}</h4>
                  <p style={{fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px'}}>
                     {isEs ? 'Juan Perez ha excedido su tonelaje planificado en un 25%.' : 'Juan Perez has exceeded planned tonnage by 25%.'}
                  </p>
                </div>
                <button className="btn-outline" style={{width: 'auto', padding: '4px 12px'}}>{isEs ? 'Ver Perfil' : 'View Profile'}</button>
             </div>
          </div>
       </div>
    </div>
  );

  const renderPlaceholder = (title: string, icon: React.ReactNode) => (
    <div className="mock-view" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7}}>
      {icon}
      <h2 style={{marginTop: '24px', color: 'var(--color-text-secondary)'}}>{title}</h2>
      <p style={{marginTop: '8px', color: 'var(--color-text-muted)'}}>
        {isEs ? 'Módulo en desarrollo para esta demo.' : 'Module in development for this demo.'}
      </p>
    </div>
  );

  const renderIntakeView = () => {
    const steps = [
      { num: 1, title: isEs ? 'Biometría' : 'Biometrics' },
      { num: 2, title: isEs ? 'Levantamientos' : 'Weightlifting' },
      { num: 3, title: isEs ? 'Fuerza Base' : 'Base Strength' },
      { num: 4, title: isEs ? 'Experiencia' : 'Experience' }
    ];

    const handleIntakeSubmit = () => {
      submitIntake(intakeFormData);
      setIntakeStep(1);
      alert(isEs ? 'Perfil de rendimiento actualizado' : 'Performance profile updated');
    };

    return (
      <div className="intake-view">
        <header className="panel-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <IntakeIcon size={28} color="var(--color-accent)" />
            <h1 className="view-title">
              {isEs ? 'Onboarding de Rendimiento' : 'Performance Onboarding'}
            </h1>
          </div>
          <div className="header-actions">
            <span className="badge" style={{padding: '8px 16px'}}>
              {isEs ? `Paso ${intakeStep} de 4` : `Step ${intakeStep} of 4`}
            </span>
          </div>
        </header>

        <div className="content-area">
          <div className="micro-card glass" style={{maxWidth: '600px', margin: '0 auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '32px'}}>
              {steps.map(s => (
                <div key={s.num} style={{textAlign: 'center', opacity: intakeStep === s.num ? 1 : 0.4}}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', 
                    backgroundColor: intakeStep >= s.num ? 'var(--color-accent)' : 'var(--color-bg-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
                    fontWeight: 'bold', color: 'white'
                  }}>
                    {s.num}
                  </div>
                  <span style={{fontSize: '0.7rem'}}>{s.title}</span>
                </div>
              ))}
            </div>

            {intakeStep === 1 && (
              <div className="animate-in">
                <h3 style={{marginBottom: '20px', color: 'var(--color-accent)'}}>{isEs ? 'Tus Datos Antropométricos' : 'Biometric Data'}</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                    <div>
                      <label className="stat-label">{isEs ? 'Peso (kg)' : 'Weight (kg)'}</label>
                      <input type="text" className="edit-input" placeholder="0.0" value={intakeFormData.responses.weight} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, weight: e.target.value}})} />
                    </div>
                    <div>
                      <label className="stat-label">{isEs ? 'Estatura (cm)' : 'Height (cm)'}</label>
                      <input type="text" className="edit-input" placeholder="0" value={intakeFormData.responses.height} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, height: e.target.value}})} />
                    </div>
                  </div>
                  <div>
                    <label className="stat-label">{isEs ? 'Porcentaje de Grasa (%)' : 'Body Fat (%)'}</label>
                    <input type="text" className="edit-input" placeholder="15%" value={intakeFormData.responses.bodyFat} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, bodyFat: e.target.value}})} />
                  </div>
                </div>
              </div>
            )}

            {intakeStep === 2 && (
              <div className="animate-in">
                <h3 style={{marginBottom: '20px', color: 'var(--color-accent)'}}>{isEs ? 'Levantamientos Olímpicos' : 'Olympic Lifts'}</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                    <div>
                      <label className="stat-label">Snatch (kg)</label>
                      <input type="text" className="edit-input" placeholder="MAX" value={intakeFormData.responses.snatch} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, snatch: e.target.value}})} />
                    </div>
                    <div>
                      <label className="stat-label">Clean & Jerk (kg)</label>
                      <input type="text" className="edit-input" placeholder="MAX" value={intakeFormData.responses.cleanJerk} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, cleanJerk: e.target.value}})} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {intakeStep === 3 && (
              <div className="animate-in">
                <h3 style={{marginBottom: '20px', color: 'var(--color-accent)'}}>{isEs ? 'Fuerza de Base' : 'Powerlifting Bases'}</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                    <div>
                      <label className="stat-label">Back Squat (kg)</label>
                      <input type="text" className="edit-input" placeholder="MAX" value={intakeFormData.responses.backSquat} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, backSquat: e.target.value}})} />
                    </div>
                    <div>
                      <label className="stat-label">Front Squat (kg)</label>
                      <input type="text" className="edit-input" placeholder="MAX" value={intakeFormData.responses.frontSquat} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, frontSquat: e.target.value}})} />
                    </div>
                  </div>
                  <div>
                    <label className="stat-label">Deadlift (kg)</label>
                    <input type="text" className="edit-input" placeholder="MAX" value={intakeFormData.responses.deadlift} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, deadlift: e.target.value}})} />
                  </div>
                </div>
              </div>
            )}

            {intakeStep === 4 && (
              <div className="animate-in">
                <h3 style={{marginBottom: '20px', color: 'var(--color-accent)'}}>{isEs ? 'Experiencia y Objetivos' : 'Experience & Goals'}</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  <div>
                    <label className="stat-label">{isEs ? '¿Años compitiendo / entrenando?' : 'Years competing / training?'}</label>
                    <input type="text" className="edit-input" value={intakeFormData.responses.experience} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, experience: e.target.value}})} />
                  </div>
                  <div>
                    <label className="stat-label">{isEs ? 'Objetivo Principal' : 'Primary Goal'}</label>
                    <textarea className="edit-input" style={{height: '80px', padding: '12px'}} value={intakeFormData.responses.goals} onChange={e => setIntakeFormData({...intakeFormData, responses: {...intakeFormData.responses, goals: e.target.value}})} />
                  </div>
                </div>
              </div>
            )}

            <div style={{marginTop: '40px', display: 'flex', justifyContent: 'space-between'}}>
              <button 
                className="btn-secondary" 
                disabled={intakeStep === 1}
                onClick={() => setIntakeStep(prev => prev - 1)}
              >
                {isEs ? 'Anterior' : 'Previous'}
              </button>
              {intakeStep < 4 ? (
                <button className="btn-primary" onClick={() => setIntakeStep(prev => prev + 1)}>
                  {isEs ? 'Siguiente' : 'Next'}
                </button>
              ) : (
                <button className="btn-primary" onClick={handleIntakeSubmit}>
                  {isEs ? 'Programar Consulta' : 'Submit Intake'}
                </button>
              )}
            </div>
          </div>
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
          <div className="micro-card glass" style={{padding: '0', overflow: 'hidden'}}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--color-bg-hover)', borderBottom: '1px solid var(--color-border)'}}>
               {daysArr.map(d => (
                 <div key={d} style={{padding: '12px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-muted)'}}>{d}</div>
               ))}
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, auto)'}}>
               {days.map((d, i) => (
                 <div key={i} style={{
                   borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid var(--color-border)',
                   borderBottom: '1px solid var(--color-border)',
                   padding: '12px',
                   opacity: d.current ? 1 : 0.3,
                   backgroundColor: d.current ? 'transparent' : 'rgba(0,0,0,0.05)'
                 }}>
                   <span style={{fontSize: '0.9rem', fontWeight: d.day === new Date().getDate() && d.current && calendarDate.getMonth() === new Date().getMonth() ? 'bold' : 'normal', color: d.day === new Date().getDate() && d.current && calendarDate.getMonth() === new Date().getMonth() ? 'var(--color-accent)' : 'inherit'}}>
                     {d.day}
                   </span>
                   
                   {/* Mock events for visibility */}
                   {d.current && d.day % 7 === 0 && (
                     <div style={{marginTop: '8px', padding: '4px 8px', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderLeft: '3px solid var(--color-accent)', borderRadius: '4px', fontSize: '0.7rem'}}>
                        {isEs ? 'Evaluación Técnica' : 'Technical Evaluation'}
                     </div>
                   )}
                   {d.current && d.day % 10 === 0 && (
                     <div style={{marginTop: '4px', padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--color-error)', borderRadius: '4px', fontSize: '0.7rem'}}>
                        {isEs ? 'Inicio de Bloque: Alex' : 'Block Start: Alex'}
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
          <div className="onboarding-card animate-in" style={{marginBottom: '32px'}}>
            <h3 style={{marginBottom: '20px', color: 'var(--color-accent)'}}>{isEs ? 'Nueva Asignación' : 'New Assignment'}</h3>
            <div style={{display: 'flex', gap: '16px', marginBottom: '20px'}}>
              <div style={{flex: 1}}>
                <label className="stat-label">{isEs ? 'Atleta' : 'Athlete'}</label>
                <select className="edit-input" value={selectedAthleteId || ''} onChange={e => setSelectedAthleteId(Number(e.target.value))}>
                  <option value="">{isEs ? 'Seleccionar Atleta' : 'Select Athlete'}</option>
                  {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div style={{flex: 1}}>
                <label className="stat-label">{isEs ? 'Programa Template' : 'Template Program'}</label>
                <select className="edit-input" value={selectedProgramId || ''} onChange={e => setSelectedProgramId(Number(e.target.value))}>
                  <option value="">{isEs ? 'Seleccionar Programa' : 'Select Program'}</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {selectedAthleteId && selectedProgramId && (
              <div style={{background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px'}}>
                <p style={{fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '12px'}}>
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
          <h3 style={{marginBottom: '20px'}}>{isEs ? 'Seguimiento del Equipo' : 'Team Status'}</h3>
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
                      <td style={{fontWeight: 'bold'}}>{ath.name}</td>
                      <td style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        {program ? program.name : '-'}
                        {assignment?.personalizedProgram && (
                          <span className="badge" style={{fontSize: '0.6rem', padding: '2px 6px', background: 'var(--color-accent-glow)'}}>
                            {isEs ? 'ADAP' : 'ADAP'}
                          </span>
                        )}
                      </td>
                      <td><span className="badge" style={{color, borderColor: color}}>{status}</span></td>
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

  return (
    <div className="central-panel">
      {activeView === 'dashboard' && renderDashboardMock()}
      {activeView === 'athletes' && renderAthletesView()}
      {activeView === 'programs' && renderProgramsView()}
      {activeView === 'planning' && renderPlanningView()}
      {activeView === 'onboarding' && renderIntakeView()}
      {activeView === 'global-calendar' && renderCalendarView()}
      {(activeView === 'micros' || activeView === 'sessions' || activeView === 'macros' || activeView === 'mesos') && renderPeriodization()}
      {activeView === 'performance' && renderPerformanceView()}
      {activeView === 'aicoach' && renderPlaceholder(isEs ? 'Interactúa en el panel derecho' : 'Interact on the right panel', <Settings2 size={64} />)}
    </div>
  );
};

export default CentralPanel;
