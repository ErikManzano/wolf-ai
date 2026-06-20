import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Reorder, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import type { GeneratedProgram, ProgramWeek } from '../../models/training';
import { formatWeekTonnageLabel } from './sessionSheetUtils';
import {
  type DayRow,
  type WeekRow,
  TAB_DRAG,
  TAB_SPRING,
  findMoveIndices,
  syncDayRows,
  syncWeekRows,
} from './programTabReorderUtils';

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
  onReorderWeek?: (fromWeekNumber: number, toWeekNumber: number) => void;
  onReorderDay?: (fromDayNumber: number, toDayNumber: number) => void;
}

function scrollActiveIntoView(container: HTMLElement | null, selector: string) {
  if (!container) return;
  const el = container.querySelector<HTMLElement>(selector);
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

interface SortableWeekTabProps {
  row: WeekRow;
  isActive: boolean;
  tonnage: number;
  isEs: boolean;
  canReorder: boolean;
  reduceMotion: boolean | null;
  onSelect: (weekNumber: number) => void;
}

const SortableWeekTab: React.FC<SortableWeekTabProps> = ({
  row,
  isActive,
  tonnage,
  isEs,
  canReorder,
  reduceMotion,
  onSelect,
}) => {
  const weekLabel = isEs ? `Semana ${row.weekNumber}` : `Week ${row.weekNumber}`;

  return (
    <Reorder.Item
      value={row}
      as="div"
      dragListener={canReorder}
      className={`wolf-week-tab-card-wrap${isActive ? ' is-active' : ''}`}
      layout="position"
      layoutScroll
      transition={TAB_SPRING}
      whileDrag={reduceMotion ? undefined : TAB_DRAG}
      style={{ touchAction: canReorder ? 'pan-x' : 'manipulation' }}
    >
      <button
        type="button"
        role="tab"
        id={`wolf-week-tab-${row.weekNumber}`}
        aria-selected={isActive}
        aria-controls={`wolf-week-panel-${row.weekNumber}`}
        className={`wolf-week-tab-card${isActive ? ' active' : ''}`}
        onClick={() => onSelect(row.weekNumber)}
      >
        <span className="wolf-week-tab-card__title">{weekLabel}</span>
        <span className="wolf-week-tab-card__load">{formatWeekTonnageLabel(tonnage, isEs)}</span>
      </button>
    </Reorder.Item>
  );
};

interface SortableDayTabProps {
  row: DayRow;
  isActive: boolean;
  canReorder: boolean;
  canRemove: boolean;
  reduceMotion: boolean | null;
  removeLabel: string;
  onSelect: (dayNumber: number) => void;
  onRemove?: (dayNumber: number) => void;
}

const SortableDayTab: React.FC<SortableDayTabProps> = ({
  row,
  isActive,
  canReorder,
  canRemove,
  reduceMotion,
  removeLabel,
  onSelect,
  onRemove,
}) => {
  const trimmed = row.label?.trim();
  const label =
    trimmed &&
    !/^D[ií]a\s+\d+$/i.test(trimmed) &&
    !/^Day\s+\d+$/i.test(trimmed)
      ? trimmed
      : `D${row.dayNumber}`;

  const showRemove = isActive && canRemove && onRemove;

  return (
    <Reorder.Item
      value={row}
      as="div"
      dragListener={canReorder}
      className={`wolf-day-tab-wrap${isActive ? ' is-active' : ''}`}
      layout="position"
      layoutScroll
      transition={TAB_SPRING}
      whileDrag={reduceMotion ? undefined : { scale: 1.04, boxShadow: '0 8px 22px rgba(0, 0, 0, 0.24)', zIndex: 24 }}
      style={{ touchAction: canReorder ? 'pan-x' : 'manipulation' }}
    >
      {showRemove ? (
        <div className="wolf-day-tab active" aria-current="true">
          <button type="button" className="wolf-day-tab__select" onClick={() => onSelect(row.dayNumber)}>
            {label}
          </button>
          <button
            type="button"
            className="wolf-day-tab__remove"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(row.dayNumber)}
            aria-label={removeLabel}
            title={removeLabel}
          >
            <X size={14} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`wolf-day-tab${isActive ? ' active' : ''}`}
          aria-current={isActive ? 'true' : undefined}
          onClick={() => onSelect(row.dayNumber)}
        >
          {label}
        </button>
      )}
    </Reorder.Item>
  );
};

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
  onReorderWeek,
  onReorderDay,
}) => {
  const reduceMotion = useReducedMotion();
  const weekStripRef = useRef<HTMLDivElement>(null);
  const dayStripRef = useRef<HTMLDivElement>(null);
  const dayWeekRef = useRef(selectedWeek);

  const canReorderWeeks = Boolean(onReorderWeek) && program.weeks.length > 1;
  const canReorderDays = Boolean(onReorderDay) && (selectedWeekData?.days.length ?? 0) > 1;

  const [weekRows, setWeekRows] = useState<WeekRow[]>(() => syncWeekRows(program.weeks, []));
  const [dayRows, setDayRows] = useState<DayRow[]>(() =>
    selectedWeekData ? syncDayRows(selectedWeekData.days, []) : [],
  );

  useEffect(() => {
    setWeekRows((prev) => syncWeekRows(program.weeks, prev));
  }, [program.weeks]);

  useEffect(() => {
    if (!selectedWeekData) {
      setDayRows([]);
      return;
    }
    const weekChanged = dayWeekRef.current !== selectedWeek;
    dayWeekRef.current = selectedWeek;
    setDayRows((prev) => syncDayRows(selectedWeekData.days, weekChanged ? [] : prev));
  }, [selectedWeek, selectedWeekData]);

  const weekNumbers = weekRows.map((r) => r.weekNumber);
  const selectedWeekIndex = weekNumbers.indexOf(selectedWeek);
  const canGoPrevWeek = selectedWeekIndex > 0;
  const canGoNextWeek = selectedWeekIndex >= 0 && selectedWeekIndex < weekNumbers.length - 1;

  const goPrevWeek = () => {
    if (!canGoPrevWeek) return;
    onSelectWeek(weekNumbers[selectedWeekIndex - 1]!);
  };

  const goNextWeek = () => {
    if (!canGoNextWeek) return;
    onSelectWeek(weekNumbers[selectedWeekIndex + 1]!);
  };

  useEffect(() => {
    scrollActiveIntoView(weekStripRef.current, '.wolf-week-tab-card.active');
  }, [selectedWeek, weekRows.length]);

  useEffect(() => {
    scrollActiveIntoView(dayStripRef.current, '.wolf-day-tab.active, .wolf-day-tab-wrap.is-active');
  }, [selectedDay, selectedWeek, dayRows.length]);

  const handleWeekReorder = useCallback(
    (nextRows: WeekRow[]) => {
      const move = findMoveIndices(
        weekRows.map((r) => r.id),
        nextRows.map((r) => r.id),
      );
      setWeekRows(nextRows);
      if (move && onReorderWeek) {
        onReorderWeek(weekRows[move.from]!.weekNumber, weekRows[move.to]!.weekNumber);
      }
    },
    [weekRows, onReorderWeek],
  );

  const handleDayReorder = useCallback(
    (nextRows: DayRow[]) => {
      const move = findMoveIndices(
        dayRows.map((r) => r.id),
        nextRows.map((r) => r.id),
      );
      setDayRows(nextRows);
      if (move && onReorderDay) {
        onReorderDay(dayRows[move.from]!.dayNumber, dayRows[move.to]!.dayNumber);
      }
    },
    [dayRows, onReorderDay],
  );

  const weekOptionLabel = (n: number, tonnage: number) => {
    const load = formatWeekTonnageLabel(tonnage, isEs);
    return isEs ? `Semana - ${n} · ${load}` : `Week - ${n} · ${load}`;
  };

  return (
    <div className="wolf-program-nav wolf-program-nav--editable wolf-program-nav--compact">
      <div className="wolf-program-nav-compact">
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

        <div className="wolf-week-carousel">
          <button
            type="button"
            className="wolf-week-carousel__arrow"
            disabled={!canGoPrevWeek}
            onClick={goPrevWeek}
            aria-label={isEs ? 'Semana anterior' : 'Previous week'}
          >
            <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
          </button>

          <div className="wolf-week-carousel__viewport" ref={weekStripRef}>
            <Reorder.Group
              as="div"
              axis="x"
              values={weekRows}
              onReorder={handleWeekReorder}
              className="wolf-week-carousel__track"
              role="tablist"
              aria-label={labels.weeksRow}
            >
              {weekRows.map((row) => (
                <SortableWeekTab
                  key={row.id}
                  row={row}
                  isActive={selectedWeek === row.weekNumber}
                  tonnage={weekTonnages[row.weekNumber] ?? 0}
                  isEs={isEs}
                  canReorder={canReorderWeeks}
                  reduceMotion={reduceMotion}
                  onSelect={onSelectWeek}
                />
              ))}
            </Reorder.Group>
          </div>

          <button
            type="button"
            className="wolf-week-tab-add wolf-week-tab-add--pinned"
            onClick={onAddWeek}
            disabled={!canAddWeek}
            title={canAddWeek ? labels.addWeek : labels.maxWeeks}
            aria-label={labels.addWeek}
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden />
          </button>

          <button
            type="button"
            className="wolf-week-carousel__arrow"
            disabled={!canGoNextWeek}
            onClick={goNextWeek}
            aria-label={isEs ? 'Semana siguiente' : 'Next week'}
          >
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
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
            <Reorder.Group
              as="div"
              axis="x"
              values={dayRows}
              onReorder={handleDayReorder}
              className="wolf-day-tabs-reorder"
              role="tablist"
              aria-label={labels.daysRow}
            >
              {dayRows.map((row) => (
                <SortableDayTab
                  key={row.id}
                  row={row}
                  isActive={selectedDay === row.dayNumber}
                  canReorder={canReorderDays}
                  canRemove={canRemoveDay}
                  reduceMotion={reduceMotion}
                  removeLabel={labels.removeDay}
                  onSelect={onSelectDay}
                  onRemove={onRemoveDay}
                />
              ))}
            </Reorder.Group>
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
