import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookMarked,
  Check,
  Copy,
  Pencil,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { ProgramAssignment } from '../../models/training';
import { mockAthletes } from '../../data/loadMockData';
import { useWolfAssign } from '../../context/WolfAssignContext';
import {
  buildWlAssignmentRows,
  wlAssignmentStatus,
  wlLastCompletionDate,
  type WlAssignmentStatus,
} from '../../utils/dashboardStats';
import ConfirmationModal from '../ConfirmationModal';
import WlVersionTimeline from './WlVersionTimeline';

interface WlAssignmentDetailProps {
  assignment: ProgramAssignment;
  isEs: boolean;
  nameByProfileId: Record<string, string>;
  onBack: () => void;
  onEdit: (asg: ProgramAssignment) => void;
  onDeleted: () => void;
  onDuplicated?: (newAssignmentId: string) => void;
}

const statusLabel = (s: WlAssignmentStatus, isEs: boolean) => {
  if (s === 'complete') return isEs ? 'Completado' : 'Complete';
  if (s === 'active') return isEs ? 'En curso' : 'In progress';
  return isEs ? 'Sin actividad' : 'No activity';
};

const WlAssignmentDetail: React.FC<WlAssignmentDetailProps> = ({
  assignment,
  isEs,
  nameByProfileId,
  onBack,
  onEdit,
  onDeleted,
  onDuplicated,
}) => {
  const {
    completions,
    isSessionComplete,
    removeAssignment,
    restoreAssignmentVersion,
    duplicateAssignment,
    saveCoachTemplate,
  } = useWolfAssign();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dupAthleteId, setDupAthleteId] = useState(assignment.athleteProfileId);
  const [showDup, setShowDup] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);

  const row = useMemo(
    () => buildWlAssignmentRows([assignment], completions, nameByProfileId)[0],
    [assignment, completions, nameByProfileId],
  );

  const status = wlAssignmentStatus(assignment, completions);
  const lastDone = wlLastCompletionDate(assignment.id, completions);

  const weekDays = useMemo(() => {
    const w = assignment.program.weeks.find((x) => x.weekNumber === selectedWeek);
    return w?.days ?? [];
  }, [assignment.program.weeks, selectedWeek]);

  const handleSaveTemplate = () => {
    const name = window.prompt(
      isEs ? 'Nombre de la plantilla' : 'Template name',
      assignment.program.name,
    );
    if (name === null) return;
    saveCoachTemplate(name, assignment.program, assignment.id);
  };

  const handleDuplicate = () => {
    const id = duplicateAssignment(assignment.id, dupAthleteId);
    if (id) {
      setShowDup(false);
      onDuplicated?.(id);
    }
  };

  return (
    <div className="wl-mgmt-detail">
      <header className="wl-mgmt-detail-head">
        <button type="button" className="btn-outline wl-mgmt-back-btn" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden />
          {isEs ? 'Volver' : 'Back'}
        </button>
        <div className="wl-mgmt-detail-title-wrap">
          <h2 className="wl-mgmt-detail-title">{assignment.program.name}</h2>
          <p className="wl-mgmt-detail-sub">
            {nameByProfileId[assignment.athleteProfileId] ?? assignment.athleteProfileId} · v
            {assignment.version}
          </p>
        </div>
        <span className={`wl-mgmt-status-badge wl-mgmt-status-badge--${status}`}>
          {statusLabel(status, isEs)}
        </span>
      </header>

      <div className="wl-mgmt-detail-kpis">
        <div className="wl-mgmt-kpi">
          <span className="wl-mgmt-kpi-label">{isEs ? 'Adherencia' : 'Adherence'}</span>
          <strong>{row?.completionPct ?? 0}%</strong>
          <span className="wl-mgmt-kpi-sub">
            {row?.sessionsDone ?? 0}/{row?.sessionSlots ?? 0} {isEs ? 'sesiones' : 'sessions'}
          </span>
        </div>
        <div className="wl-mgmt-kpi">
          <span className="wl-mgmt-kpi-label">{isEs ? 'Bloque' : 'Block'}</span>
          <strong>
            {assignment.program.totalWeeks}w · {assignment.program.daysPerWeek}d/w
          </strong>
        </div>
        <div className="wl-mgmt-kpi">
          <span className="wl-mgmt-kpi-label">{isEs ? 'Última sesión' : 'Last session'}</span>
          <strong>{lastDone ? new Date(lastDone).toLocaleDateString(isEs ? 'es' : 'en') : '—'}</strong>
        </div>
      </div>

      <div className="wl-mgmt-progress-bar" aria-hidden>
        <div className="wl-mgmt-progress-fill" style={{ width: `${row?.completionPct ?? 0}%` }} />
      </div>

      <section className="wl-mgmt-grid-section" aria-labelledby="wl-mgmt-grid-title">
        <h3 id="wl-mgmt-grid-title" className="wl-mgmt-section-title">
          {isEs ? 'Progreso por sesión' : 'Session progress'}
        </h3>
        <div className="wolf-program-nav wl-mgmt-session-nav">
          <div className="wolf-week-strip wolf-week-strip-scroll">
            {assignment.program.weeks.map((w) => (
              <button
                key={w.weekNumber}
                type="button"
                className={`wolf-week-pill ${selectedWeek === w.weekNumber ? 'active' : ''}`}
                onClick={() => setSelectedWeek(w.weekNumber)}
              >
                W{w.weekNumber}
              </button>
            ))}
          </div>
          <div className="wl-mgmt-day-grid">
            {weekDays.map((d) => {
              const done = isSessionComplete(assignment.id, selectedWeek, d.dayNumber);
              return (
                <div
                  key={d.dayNumber}
                  className={`wl-mgmt-day-cell ${done ? 'wl-mgmt-day-cell--done' : ''}`}
                  title={d.label}
                >
                  <span className="wl-mgmt-day-label">{d.label}</span>
                  {done ? <Check size={14} aria-hidden /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <WlVersionTimeline
        assignment={assignment}
        isEs={isEs}
        onRestore={(v) => restoreAssignmentVersion(assignment.id, v)}
      />

      <div className="wl-mgmt-detail-actions">
        <button type="button" className="btn-primary" onClick={() => onEdit(assignment)}>
          <Pencil size={16} aria-hidden />
          {isEs ? 'Editar en motor' : 'Edit in engine'}
        </button>
        <button type="button" className="btn-secondary" onClick={handleSaveTemplate}>
          <BookMarked size={16} aria-hidden />
          {isEs ? 'Guardar plantilla' : 'Save template'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setShowDup(true)}>
          <Copy size={16} aria-hidden />
          {isEs ? 'Duplicar atleta' : 'Duplicate athlete'}
        </button>
        <button type="button" className="btn-outline wl-mgmt-danger-btn" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={16} aria-hidden />
          {isEs ? 'Eliminar' : 'Remove'}
        </button>
      </div>

      {showDup && (
        <div className="wl-mgmt-inline-form">
          <label className="wolf-engine-field">
            <span>{isEs ? 'Atleta destino' : 'Target athlete'}</span>
            <select value={dupAthleteId} onChange={(e) => setDupAthleteId(e.target.value)}>
              {mockAthletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary" onClick={handleDuplicate}>
            <UserPlus size={16} aria-hidden />
            {isEs ? 'Asignar copia' : 'Assign copy'}
          </button>
          <button type="button" className="btn-outline" onClick={() => setShowDup(false)}>
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
        </div>
      )}

      <ConfirmationModal
        open={deleteOpen}
        title={isEs ? 'Eliminar asignación' : 'Remove assignment'}
        message={
          isEs
            ? `¿Eliminar «${assignment.program.name}»? El atleta dejará de ver este plan.`
            : `Remove “${assignment.program.name}”? The athlete will no longer see this plan.`
        }
        confirmLabel={isEs ? 'Eliminar' : 'Remove'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          removeAssignment(assignment.id);
          setDeleteOpen(false);
          onDeleted();
        }}
      />
    </div>
  );
};

export default WlAssignmentDetail;
