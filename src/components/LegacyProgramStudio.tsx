import React, { useState } from 'react';
import {
  ArrowLeft,
  BookMarked,
  ChevronRight,
  Copy,
  Dumbbell,
  GripVertical,
  Layers,
  MoveDiagonal,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { Exercise, Program, TrainingDay, TrainingWeek } from '../context/AppContext';

interface LegacyProgramStudioProps {
  language: 'ES' | 'EN';
}

/**
 * Editor “Pro” heredado (programas AppContext: semanas/días/ejercicios genéricos).
 * Vive bajo el Motor WL como pestaña «Plantillas» para no duplicar navegación.
 */
const LegacyProgramStudio: React.FC<LegacyProgramStudioProps> = ({ language }) => {
  const isEs = language === 'ES';
  const {
    programs,
    addProgram,
    updateProgramStructure,
    exerciseLibrary,
    customGroups,
    addWeekToProgram,
    addDayToWeek,
    removeDayFromWeek,
  } = useAppContext();

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [editingWeekIdx, setEditingWeekIdx] = useState(0);
  const [editingDayIdx, setEditingDayIdx] = useState(0);
  const [builderStep, setBuilderStep] = useState<'info' | 'structure'>('info');
  const [newProgramName, setNewProgramName] = useState('');
  const [numWeeks, setNumWeeks] = useState(4);
  const [numDaysPerWeek, setNumDaysPerWeek] = useState(3);
  const [numExercisesPerDay] = useState(4);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [editorSearchQuery, setEditorSearchQuery] = useState('');

  const handleCreateProgram = () => {
    if (!newProgramName) return;

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
            load: 'Bar',
          });
        }
        days.push({ id: Date.now() + w * 10 + d, dayNumber: d, exercises });
      }
      weeks.push({ id: Date.now() + w, weekNumber: w, days });
    }

    addProgram({
      name: newProgramName,
      difficulty: 'Intermediate',
      weeks,
      groupIds: selectedGroupIds,
    });

    setNewProgramName('');
    setSelectedGroupIds([]);
    setShowCreateProgram(false);
    setBuilderStep('info');
  };

  if (selectedProgram) {
    const currentWeek = selectedProgram.weeks[editingWeekIdx];
    const currentDay = currentWeek?.days[editingDayIdx];

    return (
      <div className="programs-view-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header className="panel-header" style={{ flexShrink: 0 }}>
          <div className="header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="icon-btn-sm"
                onClick={() => setSelectedProgram(null)}
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="view-title" style={{ margin: 0 }}>
                {selectedProgram.name}
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', marginLeft: '36px' }}>
              <span className="badge" style={{ background: 'rgba(255,100,0,0.1)', color: 'var(--color-accent)' }}>
                {selectedProgram.difficulty}
              </span>
              <span className="badge">{isEs ? `${selectedProgram.weeks.length} Semanas` : `${selectedProgram.weeks.length} Weeks`}</span>
            </div>
          </div>
          <div className="header-actions">
            <button type="button" className="btn-primary" onClick={() => setSelectedProgram(null)}>
              <Save size={16} />
              <span>{isEs ? 'Guardar' : 'Save'}</span>
            </button>
          </div>
        </header>

        <div className="editor-3-col-layout">
          <aside className={`editor-nav-col glass ${editingDayIdx !== null ? 'hide-on-mobile' : ''}`}>
            <div className="sidebar-section">
              <h4
                className="section-title"
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--color-text-muted)',
                  marginBottom: '16px',
                }}
              >
                {isEs ? 'Estructura' : 'Structure'}
              </h4>
              <div className="week-selector-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedProgram.weeks.map((w, i) => (
                  <div key={w.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div
                      className={`week-item-new ${editingWeekIdx === i ? 'active' : ''}`}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: editingWeekIdx === i ? 'rgba(255,100,0,0.1)' : 'transparent',
                        color: editingWeekIdx === i ? 'var(--color-accent)' : 'inherit',
                        fontSize: '0.9rem',
                        fontWeight: editingWeekIdx === i ? 'bold' : 'normal',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => {
                        setEditingWeekIdx(i);
                        setEditingDayIdx(0);
                      }}
                    >
                      <span>{isEs ? `Semana ${w.weekNumber}` : `Week ${w.weekNumber}`}</span>
                      {editingWeekIdx === i && <ChevronRight size={14} />}
                    </div>

                    {editingWeekIdx === i && (
                      <div className="day-sub-list" style={{ padding: '4px 0 8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {w.days.map((d, di) => (
                          <div
                            key={d.id}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              color: editingDayIdx === di ? 'white' : 'var(--color-text-muted)',
                              backgroundColor: editingDayIdx === di ? 'var(--color-accent)' : 'transparent',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                            onClick={() => setEditingDayIdx(di)}
                          >
                            {isEs ? `Día ${d.dayNumber}` : `Day ${d.dayNumber}`}
                          </div>
                        ))}
                        <button
                          type="button"
                          className="add-day-btn-tiny"
                          style={{
                            marginTop: '4px',
                            background: 'none',
                            border: '1px dashed var(--color-border)',
                            borderRadius: '6px',
                            padding: '4px',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                          onClick={() => addDayToWeek(selectedProgram.id, editingWeekIdx + 1)}
                        >
                          + {isEs ? 'Día' : 'Day'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-outline"
                  style={{ marginTop: '12px', width: '100%', fontSize: '0.8rem', padding: '8px' }}
                  onClick={() => addWeekToProgram(selectedProgram.id)}
                >
                  <Plus size={14} style={{ marginRight: '6px' }} /> {isEs ? 'Añadir Semana' : 'Add Week'}
                </button>
              </div>
            </div>
          </aside>

          <main className="editor-main-col">
            <div className="session-header-premium" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {isEs
                    ? `Programación: Semana ${editingWeekIdx + 1} - Día ${editingDayIdx + 1}`
                    : `Programming: Week ${editingWeekIdx + 1} - Day ${editingDayIdx + 1}`}
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                  {isEs ? 'Edita los ejercicios, series y cargas de esta sesión.' : 'Edit exercises, sets, and loads for this session.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="icon-btn-sm" title="Duplicate Day">
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn-sm"
                  title="Delete Day"
                  style={{ color: 'var(--color-error)' }}
                  onClick={() => {
                    if (confirm(isEs ? '¿Eliminar día?' : 'Delete day?')) {
                      removeDayFromWeek(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1);
                      setEditingDayIdx(0);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="exercise-list-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!currentDay || currentDay.exercises.length === 0 ? (
                <div className="empty-state-card glass" style={{ padding: '60px', textAlign: 'center', opacity: 0.6 }}>
                  <Dumbbell size={48} style={{ margin: '0 auto 16px', color: 'var(--color-accent)' }} />
                  <p>{isEs ? 'No hay ejercicios aún.' : 'No exercises yet.'}</p>
                  <p style={{ fontSize: '0.85rem' }}>
                    {isEs ? 'Selecciona ejercicios de la biblioteca a la derecha.' : 'Select exercises from the library on the right.'}
                  </p>
                </div>
              ) : (
                currentDay.exercises.map((ex, exIdx) => (
                  <div
                    key={ex.id}
                    className="exercise-pro-card-new glass"
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      background: 'rgba(255,255,255,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div className="drag-handle" style={{ cursor: 'grab', color: 'var(--color-text-muted)', paddingTop: '4px' }}>
                        <GripVertical size={18} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <input
                            className="transparent-input"
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: 'bold',
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              borderBottom: '1px solid transparent',
                              padding: '4px 0',
                              color: 'white',
                            }}
                            value={ex.name}
                            onChange={(e) => {
                              const newExs = [...currentDay.exercises];
                              newExs[exIdx] = { ...ex, name: e.target.value };
                              updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                            }}
                            onFocus={(e) => {
                              e.target.style.borderBottomColor = 'var(--color-accent)';
                              setActiveDropdownId(ex.id);
                            }}
                            onBlur={(e) => {
                              e.target.style.borderBottomColor = 'transparent';
                              setTimeout(() => setActiveDropdownId(null), 200);
                            }}
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              className={`icon-btn-sm ${ex.seriesRows ? 'active' : ''}`}
                              style={{ padding: '4px', color: ex.seriesRows ? 'var(--color-accent)' : 'inherit' }}
                              onClick={() => {
                                const newExs = [...currentDay.exercises];
                                if (ex.seriesRows) {
                                  newExs[exIdx] = { ...ex, seriesRows: undefined, sets: 3, reps: '10', load: '70%' };
                                } else {
                                  newExs[exIdx] = {
                                    ...ex,
                                    seriesRows: [{ id: Date.now(), load: '60%', reps: '3', repeat: 1 }],
                                    sets: '',
                                    reps: '',
                                    load: '',
                                  };
                                }
                                updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                              }}
                              title="Sub-series"
                            >
                              <Layers size={14} />
                            </button>
                            <button
                              type="button"
                              className={`icon-btn-sm ${ex.isComplex ? 'active' : ''}`}
                              style={{ padding: '4px', color: ex.isComplex ? 'var(--color-accent)' : 'inherit' }}
                              onClick={() => {
                                const newExs = [...currentDay.exercises];
                                if (ex.isComplex) {
                                  newExs[exIdx] = { ...ex, isComplex: false, complexParts: undefined };
                                } else {
                                  newExs[exIdx] = { ...ex, isComplex: true, complexParts: ex.complexParts || ['Clean', 'Front Squat', 'Jerk'] };
                                }
                                updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                              }}
                              title="Complex"
                            >
                              <MoveDiagonal size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn-sm"
                              style={{ padding: '4px' }}
                              onClick={() => {
                                const newExs = [...currentDay.exercises];
                                const dup = { ...JSON.parse(JSON.stringify(ex)), id: Date.now() };
                                newExs.splice(exIdx + 1, 0, dup);
                                updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                              }}
                              title="Duplicate"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn-sm"
                              style={{ padding: '4px', color: 'var(--color-error)' }}
                              onClick={() => {
                                const newExs = currentDay.exercises.filter((_, i) => i !== exIdx);
                                updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                              }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {activeDropdownId === ex.id && (
                          <div
                            className="inline-library-dropdown glass"
                            style={{
                              position: 'absolute',
                              zIndex: 100,
                              top: '50px',
                              left: '50px',
                              width: '250px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              background: 'var(--color-bg-panel)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                            }}
                          >
                            {exerciseLibrary
                              .flatMap((cat) => cat.exercises)
                              .filter((libEx) => (ex.name ? libEx.name.toLowerCase().includes(ex.name.toLowerCase()) : true))
                              .slice(0, 10)
                              .map((libEx) => (
                                <div
                                  key={libEx.id}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  }}
                                  onClick={() => {
                                    const newExs = [...currentDay.exercises];
                                    newExs[exIdx] = { ...ex, name: libEx.name };
                                    updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                    setActiveDropdownId(null);
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255,100,0,0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  {libEx.name}
                                </div>
                              ))}
                          </div>
                        )}

                        {ex.isComplex && ex.complexParts && (
                          <div className="complex-parts-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            {ex.complexParts.map((part, pIdx) => (
                              <div
                                key={pIdx}
                                className="complex-part-pill glass"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.75rem',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  background: 'rgba(255,255,255,0.05)',
                                }}
                              >
                                <span style={{ opacity: 0.5 }}>{pIdx + 1}</span>
                                <input
                                  className="transparent-input"
                                  style={{ background: 'none', border: 'none', color: 'white', width: '80px', fontSize: '0.75rem' }}
                                  value={part}
                                  onChange={(e) => {
                                    const newExs = [...currentDay.exercises];
                                    const newParts = [...(ex.complexParts || [])];
                                    newParts[pIdx] = e.target.value;
                                    newExs[exIdx] = { ...ex, complexParts: newParts };
                                    updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newExs = [...currentDay.exercises];
                                    const newParts = (ex.complexParts || []).filter((_, i) => i !== pIdx);
                                    newExs[exIdx] = {
                                      ...ex,
                                      complexParts: newParts.length > 0 ? newParts : undefined,
                                      isComplex: newParts.length > 0,
                                    };
                                    updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                  }}
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newExs = [...currentDay.exercises];
                                newExs[exIdx] = {
                                  ...ex,
                                  complexParts: [...(ex.complexParts || []), `Mov ${(ex.complexParts?.length || 0) + 1}`],
                                };
                                updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                              }}
                              style={{ padding: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        )}

                        {ex.seriesRows && ex.seriesRows.length > 0 ? (
                          <div
                            className="sub-series-container-new"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              background: 'rgba(0,0,0,0.3)',
                              padding: '12px',
                              borderRadius: '12px',
                            }}
                          >
                            {ex.seriesRows.map((sr, srIdx) => (
                              <div
                                key={sr.id}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '20px 1fr 1fr 1fr 20px',
                                  gap: '12px',
                                  alignItems: 'center',
                                }}
                              >
                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{srIdx + 1}</span>
                                <input
                                  className="small-input"
                                  style={{ width: '100%', background: 'none', border: 'none', color: 'var(--color-accent)', fontWeight: 'bold' }}
                                  value={sr.load}
                                  onChange={(e) => {
                                    const newExs = [...currentDay.exercises];
                                    const newRows = [...(ex.seriesRows || [])];
                                    newRows[srIdx] = { ...sr, load: e.target.value };
                                    newExs[exIdx] = { ...ex, seriesRows: newRows };
                                    updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                  }}
                                />
                                <input
                                  className="small-input"
                                  style={{ width: '100%', background: 'none', border: 'none', color: 'white' }}
                                  value={sr.reps}
                                  onChange={(e) => {
                                    const newExs = [...currentDay.exercises];
                                    const newRows = [...(ex.seriesRows || [])];
                                    newRows[srIdx] = { ...sr, reps: e.target.value };
                                    newExs[exIdx] = { ...ex, seriesRows: newRows };
                                    updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>×</span>
                                  <input
                                    className="small-input"
                                    type="number"
                                    style={{ width: '40px', background: 'none', border: 'none', color: 'white' }}
                                    value={sr.repeat}
                                    onChange={(e) => {
                                      const newExs = [...currentDay.exercises];
                                      const newRows = [...(ex.seriesRows || [])];
                                      newRows[srIdx] = { ...sr, repeat: parseInt(e.target.value, 10) || 1 };
                                      newExs[exIdx] = { ...ex, seriesRows: newRows };
                                      updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                    }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newExs = [...currentDay.exercises];
                                    const newRows = (ex.seriesRows || []).filter((_, i) => i !== srIdx);
                                    newExs[exIdx] = { ...ex, seriesRows: newRows.length > 0 ? newRows : undefined };
                                    updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                  }}
                                >
                                  <X size={12} color="var(--color-error)" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newExs = [...currentDay.exercises];
                                const newRow = { id: Date.now(), load: '75%', reps: '3', repeat: 1 };
                                newExs[exIdx] = { ...ex, seriesRows: [...(ex.seriesRows || []), newRow] };
                                updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                              }}
                              style={{ fontSize: '0.75rem', color: 'var(--color-accent)', width: 'fit-content', marginTop: '4px' }}
                            >
                              + {isEs ? 'Serie' : 'Set'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{isEs ? 'Series' : 'Sets'}</span>
                              <input
                                className="small-input"
                                style={{
                                  width: '60px',
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '1.1rem',
                                  fontWeight: 'bold',
                                  color: 'var(--color-accent)',
                                }}
                                value={ex.sets}
                                onChange={(e) => {
                                  const newExs = [...currentDay.exercises];
                                  newExs[exIdx] = { ...ex, sets: e.target.value };
                                  updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Reps</span>
                              <input
                                className="small-input"
                                style={{
                                  width: '60px',
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '1.1rem',
                                  fontWeight: 'bold',
                                  color: 'var(--color-accent)',
                                }}
                                value={ex.reps}
                                onChange={(e) => {
                                  const newExs = [...currentDay.exercises];
                                  newExs[exIdx] = { ...ex, reps: e.target.value };
                                  updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{isEs ? 'Carga' : 'Load'}</span>
                              <input
                                className="small-input"
                                style={{
                                  width: '90px',
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '1.1rem',
                                  fontWeight: 'bold',
                                  color: 'var(--color-accent)',
                                }}
                                value={ex.load}
                                onChange={(e) => {
                                  const newExs = [...currentDay.exercises];
                                  newExs[exIdx] = { ...ex, load: e.target.value };
                                  updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, newExs);
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                className="btn-outline"
                style={{ padding: '16px', borderStyle: 'dashed', width: '100%', borderRadius: '16px' }}
                onClick={() => {
                  const newEx = { id: Date.now(), name: isEs ? 'Nuevo Ejercicio' : 'New Exercise', sets: 3, reps: '10', load: '60%' };
                  updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, [...(currentDay?.exercises || []), newEx]);
                }}
              >
                <Plus size={20} style={{ marginRight: '8px' }} />
                {isEs ? 'Agregar Ejercicio Manual' : 'Add Manual Exercise'}
              </button>
            </div>
          </main>

          <aside className="editor-library-col glass">
            <h4
              className="section-title"
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-text-muted)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <BookMarked size={14} color="var(--color-accent)" />
              {isEs ? 'Biblioteca de Ejercicios' : 'Exercise Library'}
            </h4>

            <div className="search-box-embedded" style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="text"
                placeholder={isEs ? 'Buscar...' : 'Search...'}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border)',
                  color: 'white',
                  fontSize: '0.85rem',
                }}
                value={editorSearchQuery}
                onChange={(e) => setEditorSearchQuery(e.target.value)}
              />
            </div>

            <div className="lib-categories-internal" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {exerciseLibrary.map((cat) => {
                const filteredExs = cat.exercises.filter((ex) => ex.name.toLowerCase().includes(editorSearchQuery.toLowerCase()));
                if (filteredExs.length === 0 && editorSearchQuery) return null;

                return (
                  <div key={cat.name} className="lib-cat-section">
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: 'var(--color-accent)',
                        marginBottom: '8px',
                        padding: '4px 8px',
                        backgroundColor: 'rgba(255,100,0,0.05)',
                        borderRadius: '4px',
                      }}
                    >
                      {cat.name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {filteredExs.map((libEx) => (
                        <div
                          key={libEx.id}
                          className="lib-item-mini glass"
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid transparent',
                          }}
                          onClick={() => {
                            if (!currentWeek || !currentDay) return;
                            const newEx = { id: Date.now(), name: libEx.name, sets: 3, reps: '10', load: '60%' };
                            updateProgramStructure(selectedProgram.id, editingWeekIdx + 1, editingDayIdx + 1, [...currentDay.exercises, newEx]);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-accent)';
                            e.currentTarget.style.background = 'rgba(255,100,0,0.03)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          }}
                        >
                          <span>{libEx.name}</span>
                          <Plus size={12} color="var(--color-text-muted)" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="programs-view wolf-legacy-programs">
      <header className="panel-header">
        <div className="header-left">
          <h1 className="view-title">{isEs ? 'Biblioteca de Programas (plantillas)' : 'Program library (templates)'}</h1>
          <p className="wolf-coach-sub" style={{ marginTop: 8, maxWidth: '52rem' }}>
            {isEs
              ? 'Plantillas genéricas (series/reps/carga libre). Para mesociclos halterofilia con K-value y asignación al atleta WL, usa la pestaña «Programa (mesociclos)».'
              : 'Generic templates (free-form sets/reps/load). For WL mesocycles with K-value and athlete assignment, use the “Program (mesocycles)” tab.'}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => setShowCreateProgram(!showCreateProgram)}>
            <Plus size={16} />
            <span>{isEs ? 'Crear Programa' : 'Create Program'}</span>
          </button>
        </div>
      </header>

      {showCreateProgram && (
        <div className="micro-card glass" style={{ marginBottom: '24px', backgroundColor: 'var(--color-bg-hover)' }}>
          <h3 style={{ marginBottom: '16px' }}>{isEs ? 'Nuevo Programa Maestro' : 'New Master Program'}</h3>

          {builderStep === 'info' ? (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="edit-input"
                style={{ border: '1px solid var(--color-border)', flex: '2', minWidth: '200px' }}
                placeholder={isEs ? 'Nombre del Programa' : 'Program Name'}
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
              />
              <button type="button" className="btn-primary" onClick={() => setBuilderStep('structure')}>
                {isEs ? 'Siguiente' : 'Next'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div className="stat">
                  <span className="stat-label">{isEs ? 'Semanas' : 'Weeks'}</span>
                  <input type="number" className="edit-input" value={numWeeks} onChange={(e) => setNumWeeks(parseInt(e.target.value, 10))} />
                </div>
                <div className="stat">
                  <span className="stat-label">{isEs ? 'Días/Semana' : 'Days/Week'}</span>
                  <input type="number" className="edit-input" value={numDaysPerWeek} onChange={(e) => setNumDaysPerWeek(parseInt(e.target.value, 10))} />
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                  {isEs ? 'Vincular Grupos Técnicos (Opcional)' : 'Link Technical Groups (Optional)'}
                </h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {customGroups.map((group) => (
                    <label
                      key={group.id}
                      className="glass"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: selectedGroupIds.includes(group.id) ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                        background: selectedGroupIds.includes(group.id) ? 'rgba(255,100,0,0.1)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{ marginRight: '8px' }}
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={() => {
                          setSelectedGroupIds((prev) =>
                            prev.includes(group.id) ? prev.filter((id) => id !== group.id) : [...prev, group.id],
                          );
                        }}
                      />
                      <span style={{ fontSize: '0.85rem' }}>{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setBuilderStep('info')}>
                  {isEs ? 'Atrás' : 'Back'}
                </button>
                <button type="button" className="btn-primary" onClick={handleCreateProgram}>
                  {isEs ? 'Crear Programa' : 'Create Program'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="microcycle-grid" style={{ marginTop: '24px' }}>
        {programs.map((prog) => (
          <div key={prog.id} className="micro-card glass" style={{ cursor: 'pointer' }} onClick={() => setSelectedProgram(prog)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Dumbbell size={20} color="var(--color-accent)" />
              </div>
              <span className="badge">{prog.weeks.length} Wks</span>
            </div>
            <h3 style={{ marginBottom: '8px' }}>{prog.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              {isEs
                ? 'Plan de entrenamiento especializado con bloques de intensidad controlada.'
                : 'Specialized training plan with controlled intensity blocks.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <div className="stat">
                <span className="stat-label">{isEs ? 'Nivel' : 'Level'}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Advanced</span>
              </div>
              <div className="stat">
                <span className="stat-label">Tipo</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Strength</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LegacyProgramStudio;
