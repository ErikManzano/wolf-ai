import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Eye, Library, Search, UserPlus, X } from 'lucide-react';
import type { GeneratedProgram, ProgramAssignment } from '../../models/training';
import { mockAthletes } from '../../data/loadMockData';
import { useWlAssignments } from '../../modules/assignments';
import { useWolfAssign } from '../../context/WolfAssignContext';
import {
  aggregateWlAttendance,
  buildWlAssignmentRows,
  wlAssignmentStatus,
  type WlAssignmentStatus,
} from '../../utils/dashboardStats';
import WlAssignmentDetail from './WlAssignmentDetail';
import WlCoachProgramLibrary from './WlCoachProgramLibrary';
import WlViewModeToggle, { useWlListViewMode } from './WlViewModeToggle';
import { MobileAssignmentCard } from '../mobile-wl/cards/MobileAssignmentCard';
import { AssignmentDetailSheet } from '../mobile-wl/sheets/AssignmentDetailSheet';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import '../OlympicEnginePanel.css';
import './wl-management.css';
import '../../styles/interactive.css';

export const WL_MANAGE_FOCUS_KEY = 'wolf_manage_focus_assignment_id';

type ManageTab = 'assignments' | 'library';

interface WlAssignmentManagementProps {
  language: 'ES' | 'EN';
  program: GeneratedProgram | null;
  athleteId: string;
  athleteName: string;
  editingAssignmentId: string | null;
  onAssignDraft: () => void;
  onCustomizeDraft: () => void;
  onDiscardDraft: () => void;
  onEditAssignment: (asg: ProgramAssignment) => void;
  onOpenProgramInEngine: (program: GeneratedProgram, athleteProfileId?: string) => void;
}

const statusLabel = (s: WlAssignmentStatus, isEs: boolean) => {
  if (s === 'complete') return isEs ? 'Completado' : 'Complete';
  if (s === 'active') return isEs ? 'En curso' : 'In progress';
  return isEs ? 'Sin actividad' : 'No activity';
};

const WlAssignmentManagement: React.FC<WlAssignmentManagementProps> = ({
  language,
  program,
  athleteId,
  athleteName,
  editingAssignmentId,
  onAssignDraft,
  onCustomizeDraft,
  onDiscardDraft,
  onEditAssignment,
  onOpenProgramInEngine,
}) => {
  const isEs = language === 'ES';
  const { assignments, completions } = useWlAssignments();
  const { currentUser } = useWolfAssign();

  const [tab, setTab] = useState<ManageTab>('assignments');
  const [search, setSearch] = useState('');
  const [filterAthleteId, setFilterAthleteId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useWlListViewMode('assignments');
  const isMobile = useMediaQuery('(max-width: 768px)');
  const effectiveViewMode = isMobile ? 'cards' : viewMode;

  const nameByProfileId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of mockAthletes) m[a.id] = a.name;
    return m;
  }, []);

  const coachScoped = useMemo(() => {
    const uid = currentUser?.id;
    const role = currentUser?.role;
    if (!uid) return assignments;
    if (role === 'super_admin') return assignments;
    return assignments.filter((a) => a.coachId === uid);
  }, [assignments, currentUser?.id, currentUser?.role]);

  const rows = useMemo(
    () => buildWlAssignmentRows(coachScoped, completions, nameByProfileId),
    [coachScoped, completions, nameByProfileId],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterAthleteId && r.athleteProfileId !== filterAthleteId) return false;
      if (!q) return true;
      return (
        r.programName.toLowerCase().includes(q) ||
        r.athleteName.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterAthleteId]);

  const attendance = useMemo(
    () => aggregateWlAttendance(coachScoped, completions),
    [coachScoped, completions],
  );

  const selectedAssignment = useMemo(
    () => coachScoped.find((a) => a.id === selectedId) ?? null,
    [coachScoped, selectedId],
  );

  const showDraftBanner = Boolean(program) && !editingAssignmentId;

  useEffect(() => {
    try {
      const focusId = sessionStorage.getItem(WL_MANAGE_FOCUS_KEY);
      if (focusId && coachScoped.some((a) => a.id === focusId)) {
        setSelectedId(focusId);
        setTab('assignments');
        sessionStorage.removeItem(WL_MANAGE_FOCUS_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [coachScoped]);

  const handleAssignedFromLibrary = (assignmentId: string) => {
    setSelectedId(assignmentId);
    setTab('assignments');
  };

  if (selectedAssignment && !isMobile) {
    return (
      <WlAssignmentDetail
        assignment={selectedAssignment}
        isEs={isEs}
        nameByProfileId={nameByProfileId}
        onBack={() => setSelectedId(null)}
        onEdit={onEditAssignment}
        onDeleted={() => setSelectedId(null)}
        onDuplicated={(id) => setSelectedId(id)}
      />
    );
  }

  return (
    <div className="wl-mgmt-hub">
      <header className="wl-mgmt-hub-head">
        <h2 className="wolf-program-meso-title">
          {isEs ? 'Gestión de asignaciones' : 'Assignment management'}
        </h2>
        <p className="wolf-program-meso-sub">
          {isEs
            ? 'Controla planes activos, adherencia, versiones y biblioteca de mesociclos.'
            : 'Manage active plans, adherence, versions, and your mesocycle library.'}
        </p>
      </header>

      {showDraftBanner && program && (
        <div className="wl-mgmt-draft-banner" role="status">
          <p>
            {isEs
              ? `Tienes un programa listo para asignar a ${athleteName}.`
              : `You have a program ready to assign to ${athleteName}.`}
            <span className="wl-mgmt-draft-meta">
              {program.name} · {program.totalWeeks}w · {program.daysPerWeek}d/w
            </span>
          </p>
          <div className="wl-mgmt-draft-actions">
            <button type="button" className="btn-primary" onClick={onAssignDraft}>
              <UserPlus size={16} aria-hidden />
              {isEs ? 'Asignar' : 'Assign'}
            </button>
            <button type="button" className="btn-secondary" onClick={onCustomizeDraft}>
              {isEs ? 'Personalizar' : 'Customize'}
            </button>
            <button type="button" className="btn-outline" onClick={onDiscardDraft} aria-label={isEs ? 'Descartar' : 'Discard'}>
              <X size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}

      <div className="wl-mgmt-kpi-row">
        <div className="wl-mgmt-kpi wl-mgmt-kpi--card">
          <span className="wl-mgmt-kpi-label">{isEs ? 'Planes activos' : 'Active plans'}</span>
          <strong>{coachScoped.length}</strong>
        </div>
        <div className="wl-mgmt-kpi wl-mgmt-kpi--card">
          <span className="wl-mgmt-kpi-label">{isEs ? 'Adherencia media' : 'Avg adherence'}</span>
          <strong>{attendance.pct}%</strong>
          <span className="wl-mgmt-kpi-sub">
            {attendance.done}/{attendance.total}
          </span>
        </div>
        <div className="wl-mgmt-kpi wl-mgmt-kpi--card">
          <span className="wl-mgmt-kpi-label">{isEs ? 'Atletas con plan' : 'Athletes with plan'}</span>
          <strong>{new Set(coachScoped.map((a) => a.athleteProfileId)).size}</strong>
        </div>
      </div>

      <div className="wl-mgmt-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'assignments'}
          className={`wolf-week-pill wl-mgmt-tab ${tab === 'assignments' ? 'active' : ''}`}
          onClick={() => setTab('assignments')}
        >
          <ClipboardList size={14} aria-hidden />
          {isEs ? 'Asignaciones' : 'Assignments'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'library'}
          className={`wolf-week-pill wl-mgmt-tab ${tab === 'library' ? 'active' : ''}`}
          onClick={() => setTab('library')}
        >
          <Library size={14} aria-hidden />
          {isEs ? 'Biblioteca' : 'Library'}
        </button>
      </div>

      {tab === 'library' ? (
        <WlCoachProgramLibrary
          isEs={isEs}
          coachId={currentUser?.id}
          onAssigned={handleAssignedFromLibrary}
          onOpenInEngine={(p) => onOpenProgramInEngine(p, athleteId)}
        />
      ) : (
        <div className="wl-mgmt-crud-panel">
          <div className="wl-mgmt-crud-toolbar-row wolf-program-nav wl-mgmt-filters">
            <label className="wl-mgmt-search">
              <Search size={16} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isEs ? 'Buscar plan o atleta…' : 'Search plan or athlete…'}
              />
            </label>
            <label className="wolf-engine-field wl-mgmt-filter-athlete">
              <span>{isEs ? 'Atleta' : 'Athlete'}</span>
              <select value={filterAthleteId} onChange={(e) => setFilterAthleteId(e.target.value)}>
                <option value="">{isEs ? 'Todos' : 'All'}</option>
                {mockAthletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            {!isMobile && (
              <WlViewModeToggle storageKey="assignments" isEs={isEs} value={viewMode} onChange={setViewMode} />
            )}
          </div>

          {filteredRows.length === 0 ? (
            <p className="wl-mgmt-empty">
              {isEs
                ? 'No hay asignaciones. Crea un mesociclo y asígnalo al atleta.'
                : 'No assignments yet. Build a mesocycle and assign it to an athlete.'}
            </p>
          ) : effectiveViewMode === 'table' ? (
            <div className="wl-mgmt-table-wrap">
              <table className="wl-mgmt-crud-table">
                <thead>
                  <tr>
                    <th>{isEs ? 'Plan' : 'Plan'}</th>
                    <th>{isEs ? 'Atleta' : 'Athlete'}</th>
                    <th>{isEs ? 'Estado' : 'Status'}</th>
                    <th>v</th>
                    <th>{isEs ? 'Asignado' : 'Assigned'}</th>
                    <th>{isEs ? 'Progreso' : 'Progress'}</th>
                    <th className="wl-mgmt-crud-table__actions">{isEs ? 'Acciones' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const asg = coachScoped.find((a) => a.id === row.assignmentId);
                    if (!asg) return null;
                    const st = wlAssignmentStatus(asg, completions);
                    return (
                      <tr key={row.assignmentId}>
                        <td data-label={isEs ? 'Plan' : 'Plan'}>
                          <strong className="wl-mgmt-table-plan">{row.programName}</strong>
                        </td>
                        <td data-label={isEs ? 'Atleta' : 'Athlete'}>{row.athleteName}</td>
                        <td data-label={isEs ? 'Estado' : 'Status'}>
                          <span className={`wl-mgmt-status-badge wl-mgmt-status-badge--${st}`}>
                            {statusLabel(st, isEs)}
                          </span>
                        </td>
                        <td data-label="v">{asg.version}</td>
                        <td data-label={isEs ? 'Asignado' : 'Assigned'}>{row.assignedAt}</td>
                        <td data-label={isEs ? 'Progreso' : 'Progress'}>
                          <div className="wl-mgmt-table-progress">
                            <div className="wl-mgmt-progress-bar">
                              <div className="wl-mgmt-progress-fill" style={{ width: `${row.completionPct}%` }} />
                            </div>
                            <span>
                              {row.completionPct}% ({row.sessionsDone}/{row.sessionSlots})
                            </span>
                          </div>
                        </td>
                        <td data-label={isEs ? 'Acciones' : 'Actions'}>
                          <button
                            type="button"
                            className="btn-secondary wl-mgmt-crud-btn"
                            onClick={() => setSelectedId(row.assignmentId)}
                          >
                            <Eye size={14} aria-hidden />
                            {isEs ? 'Ver' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="wl-mgmt-assignment-grid">
              {filteredRows.map((row) => {
                const asg = coachScoped.find((a) => a.id === row.assignmentId);
                if (!asg) return null;
                const st = wlAssignmentStatus(asg, completions);
                if (isMobile) {
                  return (
                    <li key={row.assignmentId}>
                      <MobileAssignmentCard
                        programName={row.programName}
                        athleteName={row.athleteName}
                        status={st}
                        statusLabel={statusLabel(st, isEs)}
                        version={asg.version}
                        assignedAt={row.assignedAt}
                        completionPct={row.completionPct}
                        sessionsDone={row.sessionsDone}
                        sessionSlots={row.sessionSlots}
                        isEs={isEs}
                        onView={() => setSelectedId(row.assignmentId)}
                        onEdit={() => onEditAssignment(asg)}
                      />
                    </li>
                  );
                }
                return (
                  <li key={row.assignmentId}>
                    <button
                      type="button"
                      className="wl-mgmt-assignment-card"
                      onClick={() => setSelectedId(row.assignmentId)}
                    >
                      <div className="wl-mgmt-assignment-card-top">
                        <strong>{row.programName}</strong>
                        <span className={`wl-mgmt-status-badge wl-mgmt-status-badge--${st}`}>
                          {statusLabel(st, isEs)}
                        </span>
                      </div>
                      <span className="wl-mgmt-assignment-card-athlete">{row.athleteName}</span>
                      <span className="wl-mgmt-assignment-card-meta">
                        v{asg.version} · {row.assignedAt}
                      </span>
                      <div className="wl-mgmt-card-progress">
                        <div className="wl-mgmt-progress-bar">
                          <div className="wl-mgmt-progress-fill" style={{ width: `${row.completionPct}%` }} />
                        </div>
                        <span>{row.completionPct}% · {row.sessionsDone}/{row.sessionSlots}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <AssignmentDetailSheet
        open={isMobile && Boolean(selectedAssignment)}
        assignment={selectedAssignment}
        isEs={isEs}
        nameByProfileId={nameByProfileId}
        onClose={() => setSelectedId(null)}
        onEdit={onEditAssignment}
        onDeleted={() => setSelectedId(null)}
        onDuplicated={(id) => setSelectedId(id)}
      />
    </div>
  );
};

export default WlAssignmentManagement;
