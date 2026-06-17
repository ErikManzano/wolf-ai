import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  Search,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import type { AthleteLevel } from '../../models/training';
import { useWolfAssign } from '../../context/WolfAssignContext';
import {
  athleteInitials,
  buildProgramEnrollmentRows,
  filterEnrollmentRows,
  type EnrollmentFilterId,
} from './programEnrollmentsUtils';

function levelLabel(level: AthleteLevel, isEs: boolean): string {
  if (level === 'beginner') return isEs ? 'Principiante' : 'Beginner';
  if (level === 'advanced') return isEs ? 'Avanzado' : 'Advanced';
  return isEs ? 'Intermedio' : 'Intermediate';
}

const FILTER_LABELS: Record<EnrollmentFilterId, { es: string; en: string }> = {
  all: { es: 'Todos', en: 'All' },
  enrolled: { es: 'En este plan', en: 'On this plan' },
  not_enrolled: { es: 'Sin este plan', en: 'Not on plan' },
  parallel: { es: 'Con otros planes', en: 'Other plans' },
};

export type EnrollmentSheetFooterState = {
  selectedCount: number;
  assignableCount: number;
  saving: boolean;
  save: () => Promise<void>;
};

export interface ProgramEnrollmentsPanelProps {
  isEs: boolean;
  program: CoachProgramRow;
  variant?: 'inline' | 'sheet';
  defaultExpanded?: boolean;
  preselectedAthleteId?: string;
  onAssigned?: () => void;
  onSheetFooterChange?: (state: EnrollmentSheetFooterState) => void;
}

const ProgramEnrollmentsPanel: React.FC<ProgramEnrollmentsPanelProps> = ({
  isEs,
  program,
  variant = 'inline',
  defaultExpanded = true,
  preselectedAthleteId,
  onAssigned,
  onSheetFooterChange,
}) => {
  const {
    rosterForCoach,
    currentUser,
    assignCoachProgramToAthletes,
    removeAssignment,
    assignments,
    athletesLoading,
    reloadWlAthletesFromApi,
  } = useWolfAssign();

  const roster = useMemo(() => rosterForCoach(currentUser), [rosterForCoach, currentUser]);
  const enrolledByProfileId = useMemo(() => {
    const map = new Map<string, (typeof program.enrolledAthletes)[number]>();
    for (const e of program.enrolledAthletes) map.set(e.athleteProfileId, e);
    return map;
  }, [program.enrolledAthletes]);

  const rows = useMemo(
    () => buildProgramEnrollmentRows(roster, program.id, enrolledByProfileId, assignments),
    [roster, program.id, enrolledByProfileId, assignments],
  );

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [filter, setFilter] = useState<EnrollmentFilterId>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselectedAthleteId ? [preselectedAthleteId] : []),
  );
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    void reloadWlAthletesFromApi();
  }, [reloadWlAthletesFromApi]);

  const filtered = useMemo(
    () => filterEnrollmentRows(rows, filter, search),
    [rows, filter, search],
  );

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.athlete.id)),
    [rows, selected],
  );

  const assignableSelected = useMemo(
    () => selectedRows.filter((r) => !r.enrollment).map((r) => r.athlete.id),
    [selectedRows],
  );

  const parallelCount = selectedRows.filter((r) => r.otherPrograms.length > 0 && !r.enrollment).length;
  const alreadyOnProgramCount = selectedRows.filter((r) => r.enrollment).length;

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

  const isInline = variant === 'inline';

  const handleAssign = useCallback(async () => {
    if (assignableSelected.length === 0) return;
    setSaving(true);
    try {
      await assignCoachProgramToAthletes(program.id, assignableSelected);
      setSelected(new Set());
      onAssigned?.();
    } finally {
      setSaving(false);
    }
  }, [assignableSelected, assignCoachProgramToAthletes, program.id, onAssigned]);

  useEffect(() => {
    if (isInline || !onSheetFooterChange) return;
    onSheetFooterChange({
      selectedCount: selected.size,
      assignableCount: assignableSelected.length,
      saving,
      save: handleAssign,
    });
  }, [
    isInline,
    onSheetFooterChange,
    selected.size,
    assignableSelected.length,
    saving,
    handleAssign,
  ]);

  const handleRemove = async (assignmentId: string, athleteName: string, athleteProfileId: string) => {
    const ok = window.confirm(
      isEs
        ? `¿Quitar a ${athleteName} de «${program.name}»? El atleta dejará de ver este plan.`
        : `Remove ${athleteName} from “${program.name}”? They will no longer see this plan.`,
    );
    if (!ok) return;
    setRemovingId(assignmentId);
    try {
      const removed = await removeAssignment(assignmentId);
      if (removed) {
        setSelected((prev) => {
          if (!prev.has(athleteProfileId)) return prev;
          const next = new Set(prev);
          next.delete(athleteProfileId);
          return next;
        });
      }
    } finally {
      setRemovingId(null);
    }
  };

  const enrolledCount = program.enrolledAthletes.length;
  const sheetFilters = (Object.keys(FILTER_LABELS) as EnrollmentFilterId[]).filter(
    (id) => id !== 'parallel',
  );

  const listContent = (
    <>
      {isInline ? null : (
        <p className="wl-program-enrollments-lead wl-program-enrollments-lead--sheet">
          <Info size={14} aria-hidden />
          <span>
            {isEs
              ? 'Marca atletas para añadirlos. Los inscritos se quitan con el botón − a la derecha.'
              : 'Check athletes to add them. Remove enrolled athletes with the − button on the right.'}
          </span>
        </p>
      )}

      <div className="wl-program-enrollments-toolbar">
        <label className="wl-program-enrollments-search-wrap">
          <Search size={16} className="wl-program-enrollments-search-icon" aria-hidden />
          <input
            type="search"
            className="edit-input wl-program-enrollments-search"
            placeholder={isEs ? 'Buscar atleta por nombre…' : 'Search athlete by name…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {isInline ? (
          <div className="wl-program-enrollments-toolbar-actions">
            <button type="button" className="btn-outline wl-mgmt-crud-btn" onClick={selectAllFiltered}>
              {isEs ? 'Todos' : 'All'}
            </button>
            <button type="button" className="btn-outline wl-mgmt-crud-btn" onClick={clearSelection}>
              {isEs ? 'Ninguno' : 'None'}
            </button>
          </div>
        ) : null}
      </div>

      <div className="wl-program-enrollments-filters" role="tablist" aria-label={isEs ? 'Filtrar inscritos' : 'Filter enrollments'}>
        {(isInline ? Object.keys(FILTER_LABELS) : sheetFilters).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`wl-program-enrollments-filter${filter === id ? ' is-active' : ''}`}
            onClick={() => setFilter(id as EnrollmentFilterId)}
          >
            {isEs ? FILTER_LABELS[id as EnrollmentFilterId].es : FILTER_LABELS[id as EnrollmentFilterId].en}
          </button>
        ))}
      </div>

      {isInline ? (
        <div className="wl-program-enrollments-summary" aria-live="polite">
          <Users size={15} aria-hidden />
          {selected.size === 0 ? (
            <span>{isEs ? `${enrolledCount} inscritos · selecciona para añadir` : `${enrolledCount} enrolled · select to add`}</span>
          ) : (
            <div className="wl-program-enrollments-summary-stats">
              <span>{selected.size} {isEs ? 'sel.' : 'sel.'}</span>
              <span>{assignableSelected.length} {isEs ? 'nuevos' : 'new'}</span>
              {parallelCount > 0 ? <span>{parallelCount} {isEs ? 'paralelo' : 'parallel'}</span> : null}
              {alreadyOnProgramCount > 0 ? <span>{alreadyOnProgramCount} {isEs ? 'ya aquí' : 'here'}</span> : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="wl-program-enrollments-list">
        {athletesLoading ? (
          <p className="wl-mgmt-empty wl-program-enrollments-loading">
            <RefreshCw size={16} className="wl-program-assign-spin" aria-hidden />
            {isEs ? 'Cargando roster…' : 'Loading roster…'}
          </p>
        ) : filtered.length === 0 ? (
          <p className="wl-mgmt-empty">
            {roster.length === 0
              ? isEs ? 'Sin atletas en tu roster.' : 'No athletes in your roster.'
              : isEs ? 'Sin coincidencias.' : 'No matches.'}
          </p>
        ) : (
          filtered.map(({ athlete, enrollment, otherProgramNames }) => (
            <EnrollmentRow
              key={athlete.id}
              athlete={athlete}
              isEs={isEs}
              sheetLayout={!isInline}
              checked={selected.has(athlete.id)}
              enrollment={enrollment}
              otherProgramNames={otherProgramNames}
              removing={enrollment ? removingId === enrollment.assignmentId : false}
              onToggle={() => toggle(athlete.id)}
              onRemove={
                enrollment
                  ? () => void handleRemove(enrollment.assignmentId, athlete.name, athlete.id)
                  : undefined
              }
            />
          ))
        )}
      </div>

      {isInline && parallelCount > 0 ? (
        <p className="wl-program-enrollments-warn">
          <AlertCircle size={14} aria-hidden />
          {isEs
            ? `${parallelCount} recibirán este plan además de los que ya tienen.`
            : `${parallelCount} will get this plan in addition to current ones.`}
        </p>
      ) : null}

      {isInline && assignableSelected.length > 0 ? (
        <div className="wl-program-enrollments-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={saving || athletesLoading}
            onClick={() => void handleAssign()}
          >
            <UserPlus size={16} aria-hidden />
            {saving
              ? isEs ? 'Asignando…' : 'Assigning…'
              : isEs
                ? `Añadir al plan (${assignableSelected.length})`
                : `Add to plan (${assignableSelected.length})`}
          </button>
        </div>
      ) : null}
    </>
  );

  if (!isInline) {
    return <div className="wl-program-enrollments-panel wl-program-enrollments-panel--sheet">{listContent}</div>;
  }

  return (
    <section className="wl-program-enrollments-panel wl-program-enrollments-panel--inline" aria-label={isEs ? 'Inscritos en este plan' : 'Enrolled in this plan'}>
      <button
        type="button"
        className="wl-program-enrollments-panel__toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="wl-program-enrollments-panel__toggle-main">
          <Users size={16} aria-hidden />
          <strong>{isEs ? 'Inscritos en este plan' : 'Enrolled in this plan'}</strong>
          <span className="wl-program-enrollments-panel__count">{enrolledCount}</span>
        </span>
        {expanded ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
      </button>
      {expanded ? <div className="wl-program-enrollments-panel__body">{listContent}</div> : null}
    </section>
  );
};

function EnrollmentRow({
  athlete,
  isEs,
  sheetLayout,
  checked,
  enrollment,
  otherProgramNames,
  removing,
  onToggle,
  onRemove,
}: {
  athlete: { id: string; name: string; level: AthleteLevel };
  isEs: boolean;
  sheetLayout?: boolean;
  checked: boolean;
  enrollment?: { assignmentId: string; completionPct?: number };
  otherProgramNames: string[];
  removing: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  const statusBadge = enrollment ? (
    <span className="wl-program-enrollments-chip wl-program-enrollments-chip--enrolled wl-program-enrollments-chip--sheet-status">
      <CheckCircle2 size={12} aria-hidden />
      {isEs ? 'Inscrito' : 'Enrolled'}
      {enrollment.completionPct != null ? ` · ${enrollment.completionPct}%` : ''}
    </span>
  ) : (
    <span className="wl-program-enrollments-chip wl-program-enrollments-chip--free wl-program-enrollments-chip--sheet-status">
      {isEs ? 'No inscrito' : 'Not enrolled'}
    </span>
  );

  if (sheetLayout) {
    return (
      <div className={`wl-program-enrollments-row wl-program-enrollments-row--sheet${checked ? ' wl-program-enrollments-row--selected' : ''}`}>
        <input
          type="checkbox"
          className="wl-program-enrollments-row__checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={athlete.name}
        />
        <span className="wl-program-enrollments-row__avatar" aria-hidden>
          {athleteInitials(athlete.name)}
        </span>
        <div className="wl-program-enrollments-row__body wl-program-enrollments-row__body--sheet">
          <strong>{athlete.name}</strong>
          <span className="wl-program-enrollments-row__level">{levelLabel(athlete.level, isEs)}</span>
        </div>
        <div className="wl-program-enrollments-row__status">{statusBadge}</div>
        {enrollment && onRemove ? (
          <button
            type="button"
            className="btn-outline wl-program-enrollments-row__remove wl-program-enrollments-row__remove--sheet"
            disabled={removing}
            aria-label={isEs ? `Quitar a ${athlete.name}` : `Remove ${athlete.name}`}
            onClick={onRemove}
          >
            <UserMinus size={14} aria-hidden />
          </button>
        ) : (
          <span className="wl-program-enrollments-row__remove-spacer" aria-hidden />
        )}
      </div>
    );
  }

  return (
    <div className={`wl-program-enrollments-row${checked ? ' wl-program-enrollments-row--selected' : ''}`}>
      <label className="wl-program-enrollments-row__select">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="wl-program-enrollments-row__avatar" aria-hidden>
          {athleteInitials(athlete.name)}
        </span>
        <span className="wl-program-enrollments-row__body">
          <span className="wl-program-enrollments-row__top">
            <strong>{athlete.name}</strong>
            <span className="wl-program-enrollments-row__level">{levelLabel(athlete.level, isEs)}</span>
          </span>
          <span className="wl-program-enrollments-row__meta">
            {enrollment ? (
              <span className="wl-program-enrollments-chip wl-program-enrollments-chip--enrolled">
                <CheckCircle2 size={11} aria-hidden />
                {isEs ? 'Inscrito' : 'Enrolled'}
                {enrollment.completionPct != null ? ` · ${enrollment.completionPct}%` : ''}
              </span>
            ) : (
              <span className="wl-program-enrollments-chip wl-program-enrollments-chip--free">
                {isEs ? 'No inscrito' : 'Not enrolled'}
              </span>
            )}
            {!enrollment && otherProgramNames.length > 0 ? (
              <span className="wl-program-enrollments-chip wl-program-enrollments-chip--other">
                + {otherProgramNames.slice(0, 2).join(', ')}
                {otherProgramNames.length > 2 ? ` +${otherProgramNames.length - 2}` : ''}
              </span>
            ) : null}
          </span>
        </span>
      </label>
      {enrollment && onRemove ? (
        <button
          type="button"
          className="btn-outline wl-program-enrollments-row__remove"
          disabled={removing}
          aria-label={isEs ? `Quitar a ${athlete.name}` : `Remove ${athlete.name}`}
          onClick={onRemove}
        >
          <UserMinus size={14} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export default ProgramEnrollmentsPanel;
