import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Reorder, useReducedMotion } from 'framer-motion';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { GeneratedProgram, ProgramWeek } from '../../models/training';
import ConfirmationModal from '../ConfirmationModal';
import { formatWeekTonnageLabel } from './sessionSheetUtils';
import { programNavConfirmCopy, type ProgramNavConfirmKind } from './programNavConfirmCopy';
import {
  type DayRow,
  type WeekRow,
  TAB_DRAG,
  TAB_SPRING,
  findMoveIndices,
  syncDayRows,
  syncWeekRows,
} from './programTabReorderUtils';

import type { ProgramStatsScope } from './ProgramDayBoardTabs';

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
    removeWeek: string;
  };
  canRemoveWeek?: boolean;
  canRemoveDay?: boolean;
  onSelectWeek: (weekNumber: number) => void;
  onSelectDay: (dayNumber: number) => void;
  onAddWeek: () => void;
  onAddDay: () => void;
  onRemoveWeek?: (weekNumber: number) => void;
  onRemoveDay?: (dayNumber: number) => void;
  onReorderWeek?: (fromWeekNumber: number, toWeekNumber: number) => void;
  onReorderDay?: (fromDayNumber: number, toDayNumber: number) => void;
  /** Rendered at the start of the week row head (e.g. session/stats tabs). */
  weekHeadLeading?: React.ReactNode;
  /** Tighter chrome for embedded program editor — more room for the exercise sheet. */
  density?: 'default' | 'editor';
  /** Minimal picker for stats dashboard — hides editors chrome and day row unless scope is day. */
  statsContext?: ProgramStatsScope;
}

function scrollActiveIntoView(
  container: HTMLElement | null,
  selector: string,
  behavior: ScrollBehavior = 'auto',
) {
  if (!container) return;
  const el = container.querySelector<HTMLElement>(selector);
  el?.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' });
}

function dayTabLabel(row: DayRow): string {
  const trimmed = row.label?.trim();
  if (
    trimmed &&
    !/^D[ií]a\s+\d+$/i.test(trimmed) &&
    !/^Day\s+\d+$/i.test(trimmed)
  ) {
    return trimmed;
  }
  return `D${row.dayNumber}`;
}

interface NavSectionHeadProps {
  title: string;
  meta?: string;
  leading?: React.ReactNode;
  hideContext?: boolean;
  canRemove: boolean;
  removeLabel: string;
  onRemove?: () => void;
}

function NavSectionHead({
  title,
  meta,
  leading,
  hideContext = false,
  canRemove,
  removeLabel,
  onRemove,
}: NavSectionHeadProps) {
  if (!canRemove || !onRemove) {
    return (
      <div
        className={`wolf-program-nav-row-head wolf-program-nav-row-head--static${hideContext ? ' wolf-program-nav-row-head--context-hidden' : ''}`}
      >
        {leading ? <div className="wolf-program-nav-row-head__leading">{leading}</div> : null}
        {!hideContext ? (
          <div className="wolf-program-nav-row-head__context">
            <span className="wolf-program-nav-row-head__title">{title}</span>
            {meta ? <span className="wolf-program-nav-row-head__meta">{meta}</span> : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`wolf-program-nav-row-head${hideContext ? ' wolf-program-nav-row-head--context-hidden' : ''}`}
    >
      {leading ? <div className="wolf-program-nav-row-head__leading">{leading}</div> : null}
      {!hideContext ? (
        <div className="wolf-program-nav-row-head__context">
          <span className="wolf-program-nav-row-head__title">{title}</span>
          {meta ? <span className="wolf-program-nav-row-head__meta">{meta}</span> : null}
        </div>
      ) : null}
      <button
        type="button"
        className="wolf-program-nav-remove-btn"
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
      >
        <Trash2 size={15} strokeWidth={2} aria-hidden />
        <span className="wolf-program-nav-remove-btn__text">{removeLabel}</span>
      </button>
    </div>
  );
}

interface SortableWeekTabProps {
  row: WeekRow;
  isActive: boolean;
  tonnage: number;
  isEs: boolean;
  compactLabel?: boolean;
  canReorder: boolean;
  reduceMotion: boolean | null;
  onSelect: (weekNumber: number) => void;
}

const SortableWeekTab: React.FC<SortableWeekTabProps> = ({
  row,
  isActive,
  tonnage,
  isEs,
  compactLabel = false,
  canReorder,
  reduceMotion,
  onSelect,
}) => {
  const weekLabel = compactLabel
    ? isEs
      ? `S${row.weekNumber}`
      : `W${row.weekNumber}`
    : isEs
      ? `Semana ${row.weekNumber}`
      : `Week ${row.weekNumber}`;

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

type PendingConfirm =
  | { kind: 'removeWeek'; weekNumber: number }
  | { kind: 'removeDay'; dayNumber: number }
  | { kind: 'reorderWeek'; from: number; to: number; nextRows: WeekRow[] }
  | { kind: 'reorderDay'; from: number; to: number; nextRows: DayRow[] };

interface SortableDayTabProps {
  row: DayRow;
  isActive: boolean;
  canReorder: boolean;
  reduceMotion: boolean | null;
  onSelect: (dayNumber: number) => void;
}

const SortableDayTab: React.FC<SortableDayTabProps> = ({
  row,
  isActive,
  canReorder,
  reduceMotion,
  onSelect,
}) => {
  const label = dayTabLabel(row);

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
      <button
        type="button"
        className={`wolf-day-tab${isActive ? ' active' : ''}`}
        aria-current={isActive ? 'true' : undefined}
        onClick={() => onSelect(row.dayNumber)}
      >
        {label}
      </button>
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
  canRemoveWeek = false,
  canRemoveDay = false,
  labels,
  onSelectWeek,
  onSelectDay,
  onAddWeek,
  onAddDay,
  onRemoveWeek,
  onRemoveDay,
  onReorderWeek,
  onReorderDay,
  weekHeadLeading,
  density = 'default',
  statsContext,
}) => {
  const reduceMotion = useReducedMotion();
  const isEditorDensity = density === 'editor';
  const isStatsNav = statsContext != null;
  const showDayNav = !isStatsNav || statsContext === 'day';
  const hideWeekContext = isEditorDensity && Boolean(weekHeadLeading);
  const weekStripRef = useRef<HTMLDivElement>(null);
  const dayStripRef = useRef<HTMLDivElement>(null);
  const dayWeekRef = useRef(selectedWeek);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const canReorderWeeks = !isStatsNav && Boolean(onReorderWeek) && program.weeks.length > 1;
  const canReorderDays = !isStatsNav && Boolean(onReorderDay) && (selectedWeekData?.days.length ?? 0) > 1;

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
    const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';
    scrollActiveIntoView(weekStripRef.current, '.wolf-week-tab-card.active', behavior);
  }, [selectedWeek, weekRows.length, reduceMotion]);

  useEffect(() => {
    const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';
    scrollActiveIntoView(
      dayStripRef.current,
      '.wolf-day-tab.active, .wolf-day-tab-wrap.is-active',
      behavior,
    );
  }, [selectedDay, selectedWeek, dayRows.length, reduceMotion]);

  const handleWeekReorder = useCallback(
    (nextRows: WeekRow[]) => {
      const move = findMoveIndices(
        weekRows.map((r) => r.id),
        nextRows.map((r) => r.id),
      );
      if (!move || !onReorderWeek) return;
      const from = weekRows[move.from]!.weekNumber;
      const to = weekRows[move.to]!.weekNumber;
      setPendingConfirm({ kind: 'reorderWeek', from, to, nextRows });
    },
    [weekRows, onReorderWeek],
  );

  const handleDayReorder = useCallback(
    (nextRows: DayRow[]) => {
      const move = findMoveIndices(
        dayRows.map((r) => r.id),
        nextRows.map((r) => r.id),
      );
      if (!move || !onReorderDay) return;
      const from = dayRows[move.from]!.dayNumber;
      const to = dayRows[move.to]!.dayNumber;
      setPendingConfirm({ kind: 'reorderDay', from, to, nextRows });
    },
    [dayRows, onReorderDay],
  );

  const requestRemoveWeek = useCallback(
    (weekNumber: number) => {
      if (!canRemoveWeek || !onRemoveWeek) return;
      setPendingConfirm({ kind: 'removeWeek', weekNumber });
    },
    [canRemoveWeek, onRemoveWeek],
  );

  const requestRemoveDay = useCallback(
    (dayNumber: number) => {
      if (!canRemoveDay || !onRemoveDay) return;
      setPendingConfirm({ kind: 'removeDay', dayNumber });
    },
    [canRemoveDay, onRemoveDay],
  );

  const handleConfirmPending = useCallback(() => {
    if (!pendingConfirm) return;
    switch (pendingConfirm.kind) {
      case 'removeWeek':
        onRemoveWeek?.(pendingConfirm.weekNumber);
        break;
      case 'removeDay':
        onRemoveDay?.(pendingConfirm.dayNumber);
        break;
      case 'reorderWeek':
        setWeekRows(pendingConfirm.nextRows);
        onReorderWeek?.(pendingConfirm.from, pendingConfirm.to);
        break;
      case 'reorderDay':
        setDayRows(pendingConfirm.nextRows);
        onReorderDay?.(pendingConfirm.from, pendingConfirm.to);
        break;
      default:
        break;
    }
    setPendingConfirm(null);
  }, [pendingConfirm, onRemoveWeek, onRemoveDay, onReorderWeek, onReorderDay]);

  const confirmModal = pendingConfirm
    ? programNavConfirmCopy(pendingConfirm.kind as ProgramNavConfirmKind, isEs, {
        weekNumber: pendingConfirm.kind === 'removeWeek' ? pendingConfirm.weekNumber : undefined,
        dayNumber: pendingConfirm.kind === 'removeDay' ? pendingConfirm.dayNumber : undefined,
        from:
          pendingConfirm.kind === 'reorderWeek' || pendingConfirm.kind === 'reorderDay'
            ? pendingConfirm.from
            : undefined,
        to:
          pendingConfirm.kind === 'reorderWeek' || pendingConfirm.kind === 'reorderDay'
            ? pendingConfirm.to
            : undefined,
      })
    : null;

  const weekOptionLabel = (n: number) => (isEs ? `Semana ${n}` : `Week ${n}`);

  const selectedDayRow = dayRows.find((row) => row.dayNumber === selectedDay);
  const selectedDayTitle = selectedDayRow
    ? dayTabLabel(selectedDayRow)
    : isEs
      ? `Día ${selectedDay}`
      : `Day ${selectedDay}`;
  const selectedWeekTitle = isEs ? `Semana ${selectedWeek}` : `Week ${selectedWeek}`;
  const selectedWeekVolume = formatWeekTonnageLabel(weekTonnages[selectedWeek] ?? 0, isEs);
  const hideMobileWeekHead = isEditorDensity;

  return (
    <div
      className={`wolf-program-nav wolf-program-nav--editable wolf-program-nav--compact${isEditorDensity ? ' wolf-program-nav--editor-density' : ''}${weekHeadLeading ? ' wolf-program-nav--has-leading' : ''}${isStatsNav ? ' wolf-program-nav--stats' : ''}`}
    >
      <ConfirmationModal
        open={pendingConfirm != null}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        confirmLabel={confirmModal?.confirmLabel ?? ''}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger={confirmModal?.danger}
        onConfirm={handleConfirmPending}
        onCancel={() => setPendingConfirm(null)}
      />
      <div className="wolf-program-nav-compact">
        <div className="wolf-program-nav-section wolf-program-nav-section--weeks">
          {!isStatsNav && !hideMobileWeekHead ? (
            <NavSectionHead
              title={selectedWeekTitle}
              meta={selectedWeekVolume}
              leading={weekHeadLeading}
              hideContext={hideWeekContext}
              canRemove={canRemoveWeek}
              removeLabel={labels.removeWeek}
              onRemove={
                canRemoveWeek && onRemoveWeek
                  ? () => requestRemoveWeek(selectedWeek)
                  : undefined
              }
            />
          ) : null}

        <div className="wolf-week-select-mobile">
          <div className="wolf-week-select-mobile__row">
            <span className="wolf-week-select-mobile__icon" aria-hidden>
              <CalendarDays size={18} strokeWidth={2} />
            </span>
            <label className="wolf-week-select-mobile__field">
              <div className="wolf-select-wrap wolf-week-select-mobile__select">
                <select
                  value={selectedWeek}
                  onChange={(e) => onSelectWeek(Number(e.target.value))}
                  aria-label={labels.weeksRow}
                >
                  {program.weeks.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      {weekOptionLabel(w.weekNumber)}
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
          {hideMobileWeekHead ? (
            <div className="wolf-week-select-mobile__volume" aria-label={isEs ? 'Volumen total de la semana' : 'Weekly total volume'}>
              <span className="wolf-week-select-mobile__volume-label">
                {isEs ? 'Volumen total' : 'Total volume'}
              </span>
              <strong className="wolf-week-select-mobile__volume-value">{selectedWeekVolume}</strong>
            </div>
          ) : null}
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
                  compactLabel={isEditorDensity}
                  canReorder={canReorderWeeks}
                  reduceMotion={reduceMotion}
                  onSelect={onSelectWeek}
                />
              ))}
            </Reorder.Group>
          </div>

          {!isStatsNav ? (
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
          ) : null}

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
        </div>

        {showDayNav ? (
        <section
          className="wolf-program-nav-section wolf-program-nav-section--days"
          aria-label={labels.daysRow}
          id={`wolf-week-panel-${selectedWeek}`}
          role="tabpanel"
          aria-labelledby={`wolf-week-tab-${selectedWeek}`}
        >
          {!isStatsNav && !hideMobileWeekHead ? (
            <NavSectionHead
              title={selectedDayTitle}
              canRemove={canRemoveDay}
              removeLabel={labels.removeDay}
              onRemove={
                canRemoveDay && onRemoveDay ? () => requestRemoveDay(selectedDay) : undefined
              }
            />
          ) : null}
          <div className="wolf-day-tabs-section">
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
                  reduceMotion={reduceMotion}
                  onSelect={onSelectDay}
                />
              ))}
            </Reorder.Group>
            {!isStatsNav ? (
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
            ) : null}
            {!isStatsNav && isEditorDensity && canRemoveDay && onRemoveDay ? (
              <button
                type="button"
                className="wolf-program-nav-day-remove wolf-program-nav-day-remove--strip"
                onClick={() => requestRemoveDay(selectedDay)}
                aria-label={labels.removeDay}
                title={labels.removeDay}
              >
                <Trash2 size={14} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>
          </div>
        </section>
        ) : null}
      </div>
    </div>
  );
};
