import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, RefreshCw, UserPlus, Users, X } from 'lucide-react';
import type { CoachProgramRow, ProgramEnrollment } from '../../models/coach-architecture';
import type { Athlete, AthleteLevel } from '../../models/training';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { athleteHasOtherActiveProgram, getActiveAssignmentForProfile } from '../../utils/wlAssignmentRules';

interface WlProgramAssignSheetProps {
  isEs: boolean;
  program: CoachProgramRow;
  preselectedAthleteId?: string;
  onClose: () => void;
  onAssigned?: () => void;
}

function athleteInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function levelLabel(level: AthleteLevel, isEs: boolean): string {
  if (level === 'beginner') return isEs ? 'Principiante' : 'Beginner';
  if (level === 'advanced') return isEs ? 'Avanzado' : 'Advanced';
  return isEs ? 'Intermedio' : 'Intermediate';
}

const WlProgramAssignSheet: React.FC<WlProgramAssignSheetProps> = ({
  isEs,
  program,
  preselectedAthleteId,
  onClose,
  onAssigned,
}) => {
  const {
    rosterForCoach,
    currentUser,
    assignCoachProgramToAthletes,
    assignments,
    athletesLoading,
    reloadWlAthletesFromApi,
  } = useWolfAssign();

  const roster = useMemo(() => rosterForCoach(currentUser), [rosterForCoach, currentUser]);

  const enrolledByProfileId = useMemo(() => {
    const map = new Map<string, ProgramEnrollment>();
    for (const e of program.enrolledAthletes) map.set(e.athleteProfileId, e);
    return map;
  }, [program.enrolledAthletes]);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselectedAthleteId ? [preselectedAthleteId] : []),
  );
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void reloadWlAthletesFromApi();
  }, [reloadWlAthletesFromApi]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const rows = useMemo(() => {
    return roster.map((athlete) => {
      const enrollment = enrolledByProfileId.get(athlete.id);
      const activeAssignment = getActiveAssignmentForProfile(assignments, athlete.id);
      const otherActive = athleteHasOtherActiveProgram(program.id, athlete.id, assignments);
      return {
        athlete,
        enrollment,
        activeAssignment,
        onOtherProgram: Boolean(otherActive),
        otherProgramName: otherActive?.program?.name,
      };
    });
  }, [roster, enrolledByProfileId, assignments, program.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      ({ athlete, enrollment }) =>
        athlete.name.toLowerCase().includes(q) ||
        athlete.level.toLowerCase().includes(q) ||
        enrollment?.athleteName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.athlete.id)),
    [rows, selected],
  );

  const newCount = selectedRows.filter((r) => !r.activeAssignment).length;
  const transferCount = selectedRows.filter((r) => r.onOtherProgram).length;
  const alreadyOnProgramCount = selectedRows.filter((r) => r.enrollment).length;

  const structureLabel = program.program.weeks?.length
    ? `${program.program.totalWeeks ?? program.program.weeks.length} ${isEs ? 'sem' : 'wk'} × ${program.program.daysPerWeek ?? program.program.weeks[0]?.days?.length ?? 0} ${isEs ? 'días' : 'days'}`
    : isEs
      ? 'Sin estructura'
      : 'No structure';

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const { athlete } of filtered) next.add(athlete.id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleAssign = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await assignCoachProgramToAthletes(program.id, [...selected]);
      onAssigned?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="wl-program-assign-overlay" role="presentation" onClick={onClose}>
      <div
        className="wl-program-assign-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wl-program-assign-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wl-program-assign-sheet-handle" aria-hidden />
        <div className="wl-program-assign-head">
          <div className="wl-program-assign-head__content">
            <p className="wl-program-assign-kicker">{isEs ? 'Asignar programa' : 'Assign program'}</p>
            <h2 id="wl-program-assign-title" className="wl-program-assign-title">
              {program.name}
            </h2>
            <p className="wl-program-assign-meta">
              {structureLabel}
              <span className="wl-program-assign-meta__sep" aria-hidden>
                ·
              </span>
              {program.enrolledAthletes.length} {isEs ? 'inscritos' : 'enrolled'}
            </p>
          </div>
          <button
            type="button"
            className="btn-outline wl-mgmt-crud-btn wl-program-assign-close"
            onClick={onClose}
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>

        <div className="wl-program-assign-body">
          <p className="wl-program-assign-lead">
            {isEs
              ? 'Cada atleta solo puede tener un plan WL activo. Al asignar aquí, sustituye cualquier otro programa que tuviera.'
              : 'Each athlete can only have one active WL plan. Assigning here replaces any other program they had.'}
          </p>

          <div className="wl-program-assign-toolbar">
            <input
              type="search"
              className="edit-input wl-program-assign-search"
              placeholder={isEs ? 'Buscar atleta…' : 'Search athlete…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="wl-program-assign-toolbar-actions">
              <button type="button" className="btn-outline wl-mgmt-crud-btn" onClick={selectAllFiltered}>
                {isEs ? 'Todos' : 'All'}
              </button>
              <button type="button" className="btn-outline wl-mgmt-crud-btn" onClick={clearSelection}>
                {isEs ? 'Ninguno' : 'None'}
              </button>
            </div>
          </div>

          <div className="wl-program-assign-summary" aria-live="polite">
            <Users size={15} aria-hidden className="wl-program-assign-summary-icon" />
            {selected.size === 0 ? (
              <span>{isEs ? 'Selecciona uno o más atletas' : 'Select one or more athletes'}</span>
            ) : (
              <div className="wl-program-assign-summary-stats">
                <span className="wl-program-assign-summary-stat">
                  {selected.size} {isEs ? 'seleccionados' : 'selected'}
                </span>
                <span className="wl-program-assign-summary-stat">
                  {newCount} {isEs ? 'nuevos' : 'new'}
                </span>
                <span className="wl-program-assign-summary-stat">
                  {transferCount} {isEs ? 'cambios' : 'transfers'}
                </span>
                <span className="wl-program-assign-summary-stat">
                  {alreadyOnProgramCount} {isEs ? 'ya aquí' : 'already here'}
                </span>
              </div>
            )}
          </div>

          <div className="wl-program-assign-list">
            {athletesLoading ? (
              <p className="wl-mgmt-empty wl-program-assign-loading">
                <RefreshCw size={16} className="wl-program-assign-spin" aria-hidden />
                {isEs ? 'Cargando roster…' : 'Loading roster…'}
              </p>
            ) : filtered.length === 0 ? (
              <p className="wl-mgmt-empty">
                {roster.length === 0
                  ? isEs
                    ? 'Sin atletas en tu roster.'
                    : 'No athletes in your roster.'
                  : isEs
                    ? 'Sin coincidencias.'
                    : 'No matches.'}
              </p>
            ) : (
              filtered.map(({ athlete, enrollment, onOtherProgram, otherProgramName }) => (
                <AthleteAssignRow
                  key={athlete.id}
                  athlete={athlete}
                  isEs={isEs}
                  checked={selected.has(athlete.id)}
                  enrollment={enrollment}
                  onOtherProgram={onOtherProgram}
                  otherProgramName={otherProgramName}
                  onToggle={() => toggle(athlete.id)}
                />
              ))
            )}
          </div>

          {transferCount > 0 ? (
            <p className="wl-program-assign-warn">
              <AlertCircle size={14} aria-hidden />
              {isEs
                ? `${transferCount} atleta(s) cambiarán de otro programa a este.`
                : `${transferCount} athlete(s) will move from another program to this one.`}
            </p>
          ) : null}

          {alreadyOnProgramCount > 0 ? (
            <p className="wl-program-assign-warn wl-program-assign-warn--muted">
              <CheckCircle2 size={14} aria-hidden />
              {isEs
                ? `${alreadyOnProgramCount} ya están en este programa y se omitirán al asignar.`
                : `${alreadyOnProgramCount} are already on this program and will be skipped.`}
            </p>
          ) : null}
        </div>

        <footer className="wl-program-assign-footer">
          <button type="button" className="btn-outline" disabled={saving} onClick={onClose}>
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving || selected.size === 0 || athletesLoading}
            onClick={() => void handleAssign()}
          >
            <UserPlus size={16} aria-hidden />
            {saving
              ? isEs
                ? 'Asignando…'
                : 'Assigning…'
              : isEs
                ? `Asignar (${selected.size})`
                : `Assign (${selected.size})`}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

function AthleteAssignRow({
  athlete,
  isEs,
  checked,
  enrollment,
  onOtherProgram,
  otherProgramName,
  onToggle,
}: {
  athlete: Athlete;
  isEs: boolean;
  checked: boolean;
  enrollment?: ProgramEnrollment;
  onOtherProgram: boolean;
  otherProgramName?: string;
  onToggle: () => void;
}) {
  return (
    <label className={`wl-program-assign-row${checked ? ' wl-program-assign-row--selected' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="wl-program-assign-avatar" aria-hidden>
        {athleteInitials(athlete.name)}
      </span>
      <span className="wl-program-assign-row-body">
        <span className="wl-program-assign-row-top">
          <strong>{athlete.name}</strong>
          <span className="wl-program-assign-level">{levelLabel(athlete.level, isEs)}</span>
        </span>
        <span className="wl-program-assign-row-meta">
          {enrollment ? (
            <span className="wl-program-assign-badge wl-program-assign-badge--enrolled">
              <CheckCircle2 size={12} aria-hidden />
              {isEs ? 'Inscrito' : 'Enrolled'}
              {enrollment.completionPct != null ? ` · ${enrollment.completionPct}%` : ''}
            </span>
          ) : onOtherProgram ? (
            <span className="wl-program-assign-badge wl-program-assign-badge--other">
              {isEs ? 'Otro plan activo' : 'Other active plan'}
              {otherProgramName ? `: ${otherProgramName}` : ''}
            </span>
          ) : (
            <span className="wl-program-assign-badge wl-program-assign-badge--free">
              {isEs ? 'Sin plan WL' : 'No WL plan'}
            </span>
          )}
        </span>
      </span>
    </label>
  );
}

export default WlProgramAssignSheet;
