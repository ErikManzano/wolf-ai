import React, { useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { GeneratedProgram, ProgramWeek } from '../../models/training';
import { PROGRAM_STRUCTURE_LIMITS } from '../../services/programStructureMutations';

export interface ProgramWeekDayNavProps {
  program: GeneratedProgram;
  selectedWeek: number;
  selectedDay: number;
  selectedWeekData: ProgramWeek | undefined;
  editingDayLabel: string;
  isEs: boolean;
  canAddWeek: boolean;
  canRemoveWeek: boolean;
  canAddDay: boolean;
  canRemoveDay: boolean;
  labels: {
    weekDayNav: string;
    weeksRow: string;
    daysRow: string;
    addWeek: string;
    addDay: string;
    removeWeek: string;
    removeDay: string;
    dayLabelAria: string;
    maxWeeks: string;
    maxDays: string;
  };
  onSelectWeek: (weekNumber: number) => void;
  onSelectDay: (dayNumber: number) => void;
  onDayLabelChange: (label: string) => void;
  onDayLabelCommit: (weekNumber: number, dayNumber: number, label: string) => void;
  onAddWeek: () => void;
  onRemoveWeek: () => void;
  onAddDay: () => void;
  onRemoveDay: () => void;
}

function scrollActiveIntoView(container: HTMLElement | null, selector: string) {
  if (!container) return;
  const el = container.querySelector<HTMLElement>(selector);
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

export const ProgramWeekDayNav: React.FC<ProgramWeekDayNavProps> = ({
  program,
  selectedWeek,
  selectedDay,
  selectedWeekData,
  editingDayLabel,
  isEs,
  canAddWeek,
  canRemoveWeek,
  canAddDay,
  canRemoveDay,
  labels,
  onSelectWeek,
  onSelectDay,
  onDayLabelChange,
  onDayLabelCommit,
  onAddWeek,
  onRemoveWeek,
  onAddDay,
  onRemoveDay,
}) => {
  const weekStripRef = useRef<HTMLDivElement>(null);
  const dayStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollActiveIntoView(weekStripRef.current, '.wolf-week-pill.active');
  }, [selectedWeek, program.weeks.length]);

  useEffect(() => {
    scrollActiveIntoView(
      dayStripRef.current,
      '.wolf-day-pill.active, .wolf-day-pill--editing.active',
    );
  }, [selectedDay, selectedWeek, selectedWeekData?.days.length]);

  const weekCount = program.weeks.length;
  const dayCount = selectedWeekData?.days.length ?? 0;

  return (
    <div className="wolf-program-nav wolf-program-nav--editable">
      <header className="wolf-program-nav-top">
        <div className="wolf-program-nav-top-bar">
          <div className="wolf-program-nav-label">{labels.weekDayNav}</div>
          <div className="wolf-program-nav-stats" aria-label={isEs ? 'Estructura del plan' : 'Plan structure'}>
            <span className="wolf-program-nav-stat wolf-program-nav-stat--weeks">
              <span className="wolf-program-nav-stat-val">
                {weekCount}/{PROGRAM_STRUCTURE_LIMITS.MAX_WEEKS}
              </span>
              <span className="wolf-program-nav-stat-lbl">{isEs ? 'sem' : 'wk'}</span>
            </span>
            <span className="wolf-program-nav-stat wolf-program-nav-stat--days">
              <span className="wolf-program-nav-stat-val">
                {dayCount}/{PROGRAM_STRUCTURE_LIMITS.MAX_DAYS_PER_WEEK}
              </span>
              <span className="wolf-program-nav-stat-lbl">{isEs ? 'días' : 'days'}</span>
            </span>
          </div>
        </div>
        <p className="wolf-program-structure-hint">
          {isEs
            ? 'Elige semana y día. Usa + para añadir; quitar elimina la selección actual.'
            : 'Pick week and day. Use + to add; remove deletes the current selection.'}
        </p>
      </header>

      <div className="wolf-program-nav-grid">
        <section className="wolf-program-nav-section" aria-label={labels.weeksRow}>
          <div className="wolf-program-nav-section-head">
            <span className="wolf-program-nav-row-label">{labels.weeksRow}</span>
            <div className="wolf-program-nav-section-actions">
              <button
                type="button"
                className="wolf-structure-add-btn wolf-structure-add-btn--labeled"
                onClick={onAddWeek}
                disabled={!canAddWeek}
                title={canAddWeek ? labels.addWeek : labels.maxWeeks}
                aria-label={labels.addWeek}
              >
                <Plus size={16} strokeWidth={2.5} aria-hidden />
                <span className="wolf-structure-add-btn-label">{labels.addWeek}</span>
              </button>
              {canRemoveWeek ? (
                <button
                  type="button"
                  className="wolf-structure-remove-btn"
                  onClick={onRemoveWeek}
                  title={labels.removeWeek}
                  aria-label={`${labels.removeWeek} W${selectedWeek}`}
                >
                  <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                  <span>
                    {isEs ? `Quitar W${selectedWeek}` : `Remove W${selectedWeek}`}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
          <div className="wolf-program-strip-track wolf-program-strip-track--scroll">
            <div ref={weekStripRef} className="wolf-week-strip wolf-week-strip-scroll">
              {program.weeks.map((w) => (
                <button
                  key={w.weekNumber}
                  type="button"
                  className={`wolf-week-pill${selectedWeek === w.weekNumber ? ' active' : ''}`}
                  aria-current={selectedWeek === w.weekNumber ? 'true' : undefined}
                  onClick={() => onSelectWeek(w.weekNumber)}
                >
                  W{w.weekNumber}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="wolf-program-nav-section" aria-label={labels.daysRow}>
          <div className="wolf-program-nav-section-head">
            <span className="wolf-program-nav-row-label">
              {labels.daysRow}
              {selectedWeekData ? (
                <span className="wolf-program-nav-row-context"> · W{selectedWeek}</span>
              ) : null}
            </span>
            <div className="wolf-program-nav-section-actions">
              <button
                type="button"
                className="wolf-structure-add-btn wolf-structure-add-btn--labeled"
                onClick={onAddDay}
                disabled={!canAddDay}
                title={canAddDay ? labels.addDay : labels.maxDays}
                aria-label={labels.addDay}
              >
                <Plus size={16} strokeWidth={2.5} aria-hidden />
                <span className="wolf-structure-add-btn-label">{labels.addDay}</span>
              </button>
              {canRemoveDay ? (
                <button
                  type="button"
                  className="wolf-structure-remove-btn"
                  onClick={onRemoveDay}
                  title={labels.removeDay}
                  aria-label={`${labels.removeDay} ${selectedWeekData?.days.find((d) => d.dayNumber === selectedDay)?.label ?? selectedDay}`}
                >
                  <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                  <span>
                    {isEs ? `Quitar día ${selectedDay}` : `Remove day ${selectedDay}`}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
          <div className="wolf-program-strip-track wolf-program-strip-track--scroll">
            <div ref={dayStripRef} className="wolf-day-strip wolf-day-strip-scroll">
              {selectedWeekData?.days.map((d) => {
                const isActive = selectedDay === d.dayNumber;
                return isActive ? (
                  <div key={d.dayNumber} className="wolf-day-pill wolf-day-pill--editing active">
                    <input
                      type="text"
                      className="wolf-day-pill-input"
                      value={editingDayLabel}
                      aria-label={labels.dayLabelAria}
                      maxLength={32}
                      onChange={(e) => onDayLabelChange(e.target.value)}
                      onBlur={() => onDayLabelCommit(selectedWeek, d.dayNumber, editingDayLabel)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                    />
                  </div>
                ) : (
                  <button
                    key={d.dayNumber}
                    type="button"
                    className="wolf-day-pill"
                    onClick={() => onSelectDay(d.dayNumber)}
                    title={isEs ? 'Clic para editar el nombre' : 'Click to edit name'}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
