import React, { useEffect, useRef } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { GeneratedProgram, ProgramWeek } from '../../models/training';
import { formatWeekTonnageLabel } from './sessionSheetUtils';

export interface ProgramWeekDayNavProps {
  program: GeneratedProgram;
  selectedWeek: number;
  selectedDay: number;
  selectedWeekData: ProgramWeek | undefined;
  isEs: boolean;
  weekTonnages: Record<number, number>;
  canAddWeek: boolean;
  canAddDay: boolean;
  labels: {
    weeksRow: string;
    daysRow: string;
    addWeek: string;
    addDay: string;
    maxWeeks: string;
    maxDays: string;
    removeDay: string;
  };
  canRemoveDay?: boolean;
  onSelectWeek: (weekNumber: number) => void;
  onSelectDay: (dayNumber: number) => void;
  onAddWeek: () => void;
  onAddDay: () => void;
  onRemoveDay?: (dayNumber: number) => void;
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
  isEs,
  weekTonnages,
  canAddWeek,
  canAddDay,
  canRemoveDay = false,
  labels,
  onSelectWeek,
  onSelectDay,
  onAddWeek,
  onAddDay,
  onRemoveDay,
}) => {
  const weekStripRef = useRef<HTMLDivElement>(null);
  const dayStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollActiveIntoView(weekStripRef.current, '.wolf-week-tab-card.active');
  }, [selectedWeek, program.weeks.length]);

  useEffect(() => {
    scrollActiveIntoView(dayStripRef.current, '.wolf-day-tab.active');
  }, [selectedDay, selectedWeek, selectedWeekData?.days.length]);

  const weekLabel = (n: number) => (isEs ? `Semana ${n}` : `Week ${n}`);
  const weekOptionLabel = (n: number, tonnage: number) => {
    const load = formatWeekTonnageLabel(tonnage, isEs);
    return isEs ? `Semana - ${n} · ${load}` : `Week - ${n} · ${load}`;
  };
  const dayTabLabel = (n: number, label?: string) => {
    const trimmed = label?.trim();
    if (
      trimmed &&
      !/^D[ií]a\s+\d+$/i.test(trimmed) &&
      !/^Day\s+\d+$/i.test(trimmed)
    ) {
      return trimmed;
    }
    return `D${n}`;
  };

  return (
    <div className="wolf-program-nav wolf-program-nav--editable wolf-program-nav--compact">
      <div className="wolf-program-nav-compact">
        {/* Mobile: week select */}
        <div className="wolf-week-select-mobile">
          <div className="wolf-week-select-mobile__row">
            <label className="wolf-week-select-mobile__field">
              <div className="wolf-select-wrap">
                <select
                  value={selectedWeek}
                  onChange={(e) => onSelectWeek(Number(e.target.value))}
                  aria-label={labels.weeksRow}
                >
                  {program.weeks.map((w) => (
                      <option key={w.weekNumber} value={w.weekNumber}>
                        {weekOptionLabel(w.weekNumber, weekTonnages[w.weekNumber] ?? 0)}
                      </option>
                  ))}
                </select>
                <ChevronDown className="wolf-select-chevron" size={16} strokeWidth={2} aria-hidden />
              </div>
            </label>
            <button
              type="button"
              className="wolf-week-tab-add wolf-week-tab-add--mobile"
              onClick={onAddWeek}
              disabled={!canAddWeek}
              title={canAddWeek ? labels.addWeek : labels.maxWeeks}
              aria-label={labels.addWeek}
            >
              <Plus size={18} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        {/* Desktop: week underline tabs */}
        <div
          className="wolf-week-tabs-strip"
          role="tablist"
          aria-label={labels.weeksRow}
          ref={weekStripRef}
        >
          {program.weeks.map((w) => {
            const isActive = selectedWeek === w.weekNumber;
            const tonnage = weekTonnages[w.weekNumber] ?? 0;
            return (
              <button
                key={w.weekNumber}
                type="button"
                role="tab"
                id={`wolf-week-tab-${w.weekNumber}`}
                aria-selected={isActive}
                aria-controls={`wolf-week-panel-${w.weekNumber}`}
                className={`wolf-week-tab-card${isActive ? ' active' : ''}`}
                onClick={() => onSelectWeek(w.weekNumber)}
              >
                <span className="wolf-week-tab-card__title">{weekLabel(w.weekNumber)}</span>
                <span className="wolf-week-tab-card__load">{formatWeekTonnageLabel(tonnage, isEs)}</span>
              </button>
            );
          })}
          <button
            type="button"
            className="wolf-week-tab-add"
            onClick={onAddWeek}
            disabled={!canAddWeek}
            title={canAddWeek ? labels.addWeek : labels.maxWeeks}
            aria-label={labels.addWeek}
          >
            <Plus size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <section
          className="wolf-day-tabs-section"
          aria-label={labels.daysRow}
          id={`wolf-week-panel-${selectedWeek}`}
          role="tabpanel"
          aria-labelledby={`wolf-week-tab-${selectedWeek}`}
        >
          <div className="wolf-day-tabs-strip" ref={dayStripRef}>
            {selectedWeekData?.days.map((d) => {
              const isActive = selectedDay === d.dayNumber;
              const label = dayTabLabel(d.dayNumber, d.label);
              if (isActive && canRemoveDay && onRemoveDay) {
                return (
                  <div key={d.dayNumber} className="wolf-day-tab active" aria-current="true">
                    <button
                      type="button"
                      className="wolf-day-tab__select"
                      onClick={() => onSelectDay(d.dayNumber)}
                    >
                      {label}
                    </button>
                    <button
                      type="button"
                      className="wolf-day-tab__remove"
                      onClick={() => onRemoveDay(d.dayNumber)}
                      aria-label={labels.removeDay}
                      title={labels.removeDay}
                    >
                      <X size={14} strokeWidth={2.25} aria-hidden />
                    </button>
                  </div>
                );
              }
              return (
                <button
                  key={d.dayNumber}
                  type="button"
                  className={`wolf-day-tab${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => onSelectDay(d.dayNumber)}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              className="wolf-day-tab-add"
              onClick={onAddDay}
              disabled={!canAddDay}
              title={canAddDay ? labels.addDay : labels.maxDays}
              aria-label={labels.addDay}
            >
              <Plus size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
