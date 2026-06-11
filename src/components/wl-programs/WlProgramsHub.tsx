import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import { useWolfAssign } from '../../context/WolfAssignContext';
import WlProgramAssignSheet from './WlProgramAssignSheet';
import '../wl-management/wl-management.css';

export const WL_PROGRAMS_FOCUS_KEY = 'wolf_programs_focus_id';

interface WlProgramsHubProps {
  isEs: boolean;
}

function structureLabel(p: CoachProgramRow, isEs: boolean): string {
  const w = p.program.totalWeeks ?? p.program.weeks?.length ?? 0;
  const d = p.program.daysPerWeek ?? p.program.weeks?.[0]?.days?.length ?? 0;
  return isEs ? `${w} sem × ${d} días` : `${w} wk × ${d} days`;
}

const WlProgramsHub: React.FC<WlProgramsHubProps> = ({ isEs }) => {
  const {
    coachPrograms,
    programsLoading,
    createCoachProgram,
    openProgramEditor,
    duplicateCoachProgram,
    deleteCoachProgram,
    assignments,
  } = useWolfAssign();

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignProgram, setAssignProgram] = useState<CoachProgramRow | null>(null);
  const [assignAthleteId, setAssignAthleteId] = useState<string | undefined>();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coachPrograms;
    return coachPrograms.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.enrolledAthletes.some((e) => e.athleteName.toLowerCase().includes(q)),
    );
  }, [coachPrograms, search]);

  const kpis = useMemo(() => {
    const withAthletes = coachPrograms.filter((p) => p.enrolledAthletes.length > 0).length;
    const totalEnrolled = coachPrograms.reduce((s, p) => s + p.enrolledAthletes.length, 0);
    return { total: coachPrograms.length, withAthletes, totalEnrolled };
  }, [coachPrograms]);

  useEffectFocusProgram(setExpandedId, assignments);

  const handleCreate = async () => {
    const name = window.prompt(isEs ? 'Nombre del programa:' : 'Program name:', isEs ? 'Nuevo mesociclo' : 'New mesocycle');
    if (!name?.trim()) return;
    const created = await createCoachProgram(name.trim());
    if (created) openProgramEditor(created.id);
  };

  const openAssign = (program: CoachProgramRow, athleteProfileId?: string) => {
    setAssignProgram(program);
    setAssignAthleteId(athleteProfileId);
  };

  const editInstance = (assignmentId: string) => {
    const asg = assignments.find((a) => a.id === assignmentId);
    if (!asg?.coachProgramId) return;
    openProgramEditor(asg.coachProgramId);
  };

  return (
    <div className="wl-programs-hub">
      <header className="panel-header">
        <div className="header-left">
          <h1 className="view-title">{isEs ? 'Programas' : 'Programs'}</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
            {isEs
              ? 'Gestiona mesociclos, asigna a uno o varios atletas y revisa adherencia.'
              : 'Manage mesocycles, assign to one or many athletes, and review adherence.'}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={() => void handleCreate()}>
            <Plus size={16} /> {isEs ? 'Nuevo programa' : 'New program'}
          </button>
        </div>
      </header>

      <div className="athletes-kpis">
        <div className="athletes-kpi-card">
          <span>{isEs ? 'Programas' : 'Programs'}</span>
          <strong>{kpis.total}</strong>
        </div>
        <div className="athletes-kpi-card">
          <span>{isEs ? 'Con atletas' : 'With athletes'}</span>
          <strong>{kpis.withAthletes}</strong>
        </div>
        <div className="athletes-kpi-card">
          <span>{isEs ? 'Inscripciones' : 'Enrollments'}</span>
          <strong>{kpis.totalEnrolled}</strong>
        </div>
      </div>

      <div className="wl-mgmt-crud-toolbar-row wl-mgmt-filters" style={{ marginTop: '16px' }}>
        <input
          type="search"
          className="edit-input"
          placeholder={isEs ? 'Buscar programa o atleta…' : 'Search program or athlete…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="wl-mgmt-table-wrap" style={{ marginTop: '12px' }}>
        {programsLoading ? (
          <p className="wl-mgmt-empty">{isEs ? 'Cargando programas…' : 'Loading programs…'}</p>
        ) : (
          <table className="wl-mgmt-crud-table">
            <thead>
              <tr>
                <th aria-hidden />
                <th>{isEs ? 'Programa' : 'Program'}</th>
                <th>{isEs ? 'Estructura' : 'Structure'}</th>
                <th>{isEs ? 'Atletas' : 'Athletes'}</th>
                <th>{isEs ? 'Adherencia' : 'Adherence'}</th>
                <th>{isEs ? 'Actualizado' : 'Updated'}</th>
                <th className="wl-mgmt-crud-table__actions">{isEs ? 'Acciones' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="btn-outline wl-mgmt-crud-btn"
                          aria-expanded={expanded}
                          onClick={() => setExpandedId(expanded ? null : row.id)}
                        >
                          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td>
                        <strong>{row.name}</strong>
                        <span
                          className={`wl-mgmt-status-badge wl-mgmt-status-badge--${row.status === 'published' ? 'active' : 'idle'}`}
                          style={{ marginLeft: '8px' }}
                        >
                          {row.status === 'published' ? (isEs ? 'Publicado' : 'Published') : isEs ? 'Borrador' : 'Draft'}
                        </span>
                      </td>
                      <td>{structureLabel(row, isEs)}</td>
                      <td>
                        {row.enrolledAthletes.length === 0 ? (
                          <span className="wl-mgmt-row-sub">{isEs ? 'Sin asignar' : 'Unassigned'}</span>
                        ) : (
                          row.enrolledAthletes.map((e) => (
                            <span key={e.assignmentId} className="wl-mgmt-status-badge wl-mgmt-status-badge--active" style={{ marginRight: '4px' }}>
                              {e.athleteName}
                            </span>
                          ))
                        )}
                      </td>
                      <td>{row.avgAdherencePct != null ? `${row.avgAdherencePct}%` : '—'}</td>
                      <td>{new Date(row.updatedAt).toLocaleDateString(isEs ? 'es' : 'en')}</td>
                      <td className="wl-mgmt-crud-table__actions">
                        <button type="button" className="btn-outline wl-mgmt-crud-btn" title={isEs ? 'Editar' : 'Edit'} onClick={() => openProgramEditor(row.id)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="btn-outline wl-mgmt-crud-btn" title={isEs ? 'Asignar' : 'Assign'} onClick={() => openAssign(row)}>
                          <UserPlus size={14} />
                        </button>
                        <button type="button" className="btn-outline wl-mgmt-crud-btn" title={isEs ? 'Duplicar' : 'Duplicate'} onClick={() => void duplicateCoachProgram(row.id)}>
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-outline wl-mgmt-crud-btn wl-mgmt-danger-btn"
                          title={isEs ? 'Eliminar' : 'Delete'}
                          onClick={() => {
                            if (!window.confirm(isEs ? '¿Eliminar programa?' : 'Delete program?')) return;
                            void deleteCoachProgram(row.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr>
                        <td colSpan={7} className="wl-program-enrollments-cell">
                          {row.enrolledAthletes.length === 0 ? (
                            <p className="wl-mgmt-row-sub">{isEs ? 'Nadie inscrito aún.' : 'No enrollments yet.'}</p>
                          ) : (
                            <ul className="wl-program-enrollments-list">
                              {row.enrolledAthletes.map((e) => (
                                <li key={e.assignmentId}>
                                  <strong>{e.athleteName}</strong>
                                  <span className="wl-mgmt-row-sub">
                                    {e.completionPct != null ? `${e.completionPct}%` : '—'} · {isEs ? 'Desde' : 'Since'}{' '}
                                    {new Date(e.assignedAt).toLocaleDateString(isEs ? 'es' : 'en')}
                                  </span>
                                  <button type="button" className="btn-outline wl-mgmt-crud-btn" onClick={() => editInstance(e.assignmentId)}>
                                    {isEs ? 'Editar instancia' : 'Edit instance'}
                                  </button>
                                  <button type="button" className="btn-outline wl-mgmt-crud-btn" onClick={() => openAssign(row, e.athleteProfileId)}>
                                    {isEs ? 'Reasignar' : 'Re-assign'}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="wl-mgmt-empty">
                    {isEs ? 'Sin programas. Crea el primero.' : 'No programs. Create your first one.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {assignProgram ? (
        <WlProgramAssignSheet
          isEs={isEs}
          program={assignProgram}
          preselectedAthleteId={assignAthleteId}
          onClose={() => {
            setAssignProgram(null);
            setAssignAthleteId(undefined);
          }}
        />
      ) : null}
    </div>
  );
};

function useEffectFocusProgram(
  setExpandedId: (id: string | null) => void,
  assignments: import('../../models/training').ProgramAssignment[],
) {
  React.useEffect(() => {
    try {
      const id = sessionStorage.getItem(WL_PROGRAMS_FOCUS_KEY);
      if (!id) return;
      sessionStorage.removeItem(WL_PROGRAMS_FOCUS_KEY);
      const asg = assignments.find((a) => a.id === id);
      setExpandedId(asg?.coachProgramId ?? id);
    } catch {
      /* ignore */
    }
  }, [setExpandedId, assignments]);
}

export default WlProgramsHub;
