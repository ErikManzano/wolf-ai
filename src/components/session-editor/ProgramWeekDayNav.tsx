import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Reorder, useReducedMotion } from 'framer-motion';
import { CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { GeneratedProgram, ProgramWeek } from '../../models/training';
import ConfirmationModal from '../ConfirmationModal';
import { AthleteDayNavigator } from '../athlete-tracking/AthleteDayNavigator';
import { MobileWeekNavigator } from '../athlete-tracking/MobileWeekNavigator';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { CoachNavMoreMenu } from './CoachNavMoreMenu';
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
import { formatShortDate, programDayDate } from './programScienceStats';

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
    duplicateDay?: string;
    duplicateWeek?: string;
  };
  canRemoveWeek?: boolean;
  canRemoveDay?: boolean;
  onSelectWeek: (weekNumber: number) => void;
  onSelectDay: (dayNumber: number) => void;
  onAddWeek: (atIndex?: number) => void;
  onAddDay: (atIndex?: number) => void;
  onRemoveWeek?: (weekNumber: number) => void;
  onRemoveDay?: (dayNumber: number) => void;
  onDuplicateWeek?: (weekNumber: number) => void;
  onDuplicateDay?: (dayNumber: number) => void;
  onReorderWeek?: (fromWeekNumber: number, toWeekNumber: number) => void;
  onReorderDay?: (fromDayNumber: number, toDayNumber: number) => void;
  /** Rendered at the start of the week row head (e.g. session/stats tabs). */
  weekHeadLeading?: React.ReactNode;
  /** Tighter chrome for embedded program editor — more room for the exercise sheet. */
  density?: 'default' | 'editor';
  /** Stats dashboard mode — hides editor chrome; day chips only when scope is `day`. */
  statsContext?: ProgramStatsScope;
  /** Allows the unified desktop header to keep weeks while days stay above the exercise sheet. */
  sections?: 'all' | 'weeks' | 'days';
  /** Nav stacked above the sheet in the left editor column — ultra-compact day/week chips. */
  compactSurface?: 'sheet-sidebar';
}

/** Classes for the week/day nav. In the sheet sidebar they live on the single nav host. */
export function programWeekDayNavClassName({
  isEditorDensity,
  compactSurface,
  useAthleteMobileNav,
  weekHeadLeading,
  isStatsNav,
  sections,
}: {
  isEditorDensity: boolean;
  compactSurface?: 'sheet-sidebar';
  useAthleteMobileNav: boolean;
  weekHeadLeading?: boolean;
  isStatsNav: boolean;
  sections: 'all' | 'weeks' | 'days';
}): string {
  return [
    'wolf-program-nav',
    'wolf-program-nav--editable',
    'wolf-program-nav--compact',
    isEditorDensity ? 'wolf-program-nav--editor-density' : '',
    compactSurface === 'sheet-sidebar' ? 'wolf-program-nav--sheet-sidebar' : '',
    useAthleteMobileNav ? 'wolf-program-nav--athlete-mobile' : '',
    weekHeadLeading ? 'wolf-program-nav--has-leading' : '',
    isStatsNav ? 'wolf-program-nav--stats' : '',
    sections === 'weeks' ? 'wolf-program-nav--weeks-only' : '',
    sections === 'days' ? 'wolf-program-nav--days-only' : '',
  ]
    .filter(Boolean)
    .join(' ');
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

function dayTabLabel(row: { label?: string; dayNumber: number }): string {
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
  const weekLabelFull = isEs ? `Semana ${row.weekNumber}` : `Week ${row.weekNumber}`;
  const weekLabelShort = isEs ? `S${row.weekNumber}` : `W${row.weekNumber}`;

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
        aria-label={weekLabelFull}
        onClick={() => onSelect(row.weekNumber)}
      >
        <span className="wolf-week-tab-card__title wolf-week-tab-card__title--full">{weekLabelFull}</span>
        <span className="wolf-week-tab-card__title wolf-week-tab-card__title--short" aria-hidden>
          {weekLabelShort}
        </span>
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
  dateLabel?: string | null;
}

const SortableDayTab: React.FC<SortableDayTabProps> = ({
  row,
  isActive,
  canReorder,
  reduceMotion,
  onSelect,
  dateLabel,
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
        className={`wolf-day-tab${isActive ? ' active' : ''}${dateLabel ? ' wolf-day-tab--dated' : ''}`}
        aria-current={isActive ? 'true' : undefined}
        title={label}
        aria-label={label}
        onClick={() => onSelect(row.dayNumber)}
      >
        <span className="wolf-day-tab__label">{`D${row.dayNumber}`}</span>
        {dateLabel ? <span className="wolf-day-tab__date">{dateLabel}</span> : null}
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
  onDuplicateWeek,
  onDuplicateDay,
  onReorderWeek,
  onReorderDay,
  weekHeadLeading,
  density = 'default',
  statsContext,
  sections = 'all',
  compactSurface,
}) => {
  const reduceMotion = useReducedMotion();
  const isEditorDensity = density === 'editor';
  const isMobileLayout = useMediaQuery('(max-width: 1024px)');
  const useAthleteMobileNav =
    isEditorDensity && isMobileLayout && compactSurface !== 'sheet-sidebar';
  const isStatsNav = statsContext != null;
  const showDayNav = !isStatsNav || statsContext === 'day';
  const showWeeks = sections !== 'days';
  const showDays = sections !== 'weeks' && showDayNav;
  const hideWeekContext = isEditorDensity && Boolean(weekHeadLeading);
  const weekStripRef = useRef<HTMLDivElement>(null);
  const dayStripRef = useRef<HTMLDivElement>(null);
  const folderListRef = useRef<HTMLUListElement>(null);
  const folderDragRef = useRef<{ kind: 'week' | 'day'; from: number } | null>(null);
  const dayWeekRef = useRef(selectedWeek);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(selectedWeek);

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
    setExpandedWeek(selectedWeek);
  }, [selectedWeek]);

  useEffect(() => {
    if (!selectedWeekData) {
      setDayRows([]);
      return;
    }
    const weekChanged = dayWeekRef.current !== selectedWeek;
    dayWeekRef.current = selectedWeek;
    setDayRows((prev) => syncDayRows(selectedWeekData.days, weekChanged ? [] : prev));
  }, [selectedWeek, selectedWeekData]);

  const dayDateLabels = useMemo(() => {
    const map: Record<number, string> = {};
    if (!program.startDate || !selectedWeekData) return map;
    for (const day of selectedWeekData.days) {
      const iso = programDayDate(program, selectedWeek, day.dayNumber);
      if (iso) map[day.dayNumber] = formatShortDate(iso, isEs);
    }
    return map;
  }, [program, selectedWeek, selectedWeekData, isEs]);

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
  const duplicateWeekLabel = labels.duplicateWeek ?? (isEs ? 'Duplicar semana' : 'Duplicate week');
  const duplicateDayLabel = labels.duplicateDay ?? (isEs ? 'Duplicar día' : 'Duplicate day');
  const reorderWeekLabel = isEs ? 'Arrastra para reordenar la semana' : 'Drag to reorder the week';
  const reorderDayLabel = isEs ? 'Arrastra para reordenar el día' : 'Drag to reorder the day';

  const clearFolderDropTargets = () => {
    folderListRef.current?.querySelectorAll('.is-drop-target').forEach((el) => {
      el.classList.remove('is-drop-target');
    });
  };

  const startFolderDrag = (event: React.DragEvent, kind: 'week' | 'day', from: number) => {
    event.stopPropagation();
    folderDragRef.current = { kind, from };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${kind}:${from}`);
    (event.currentTarget as HTMLElement).closest('li')?.classList.add('is-dragging');
  };

  const overFolderRow = (event: React.DragEvent<HTMLElement>, kind: 'week' | 'day') => {
    if (folderDragRef.current?.kind !== kind) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const row = event.currentTarget;
    if (row.classList.contains('is-drop-target')) return;
    clearFolderDropTargets();
    row.classList.add('is-drop-target');
  };

  const endFolderDrag = (event: React.DragEvent) => {
    (event.currentTarget as HTMLElement).closest('li')?.classList.remove('is-dragging');
    clearFolderDropTargets();
    folderDragRef.current = null;
  };

  const dropFolderRow = (event: React.DragEvent, kind: 'week' | 'day', to: number) => {
    if (folderDragRef.current?.kind !== kind) return;
    event.preventDefault();
    event.stopPropagation();
    const from = folderDragRef.current.from;
    folderDragRef.current = null;
    clearFolderDropTargets();
    (event.currentTarget as HTMLElement).classList.remove('is-dragging');
    if (from === to) return;
    if (kind === 'week') onReorderWeek?.(from, to);
    else onReorderDay?.(from, to);
  };

  const selectedDayRow = dayRows.find((row) => row.dayNumber === selectedDay);
  const selectedDayTitle = selectedDayRow
    ? dayTabLabel(selectedDayRow)
    : isEs
      ? `Día ${selectedDay}`
      : `Day ${selectedDay}`;
  const selectedWeekTitle = isEs ? `Semana ${selectedWeek}` : `Week ${selectedWeek}`;
  const selectedWeekVolume = formatWeekTonnageLabel(weekTonnages[selectedWeek] ?? 0, isEs);
  const hideMobileWeekHead = isEditorDensity;
  const sheetSidebarNav = compactSurface === 'sheet-sidebar';
  const navClassName = programWeekDayNavClassName({
    isEditorDensity,
    compactSurface,
    useAthleteMobileNav,
    weekHeadLeading: Boolean(weekHeadLeading),
    isStatsNav,
    sections,
  });

  if (sheetSidebarNav && !isMobileLayout && !isStatsNav && showWeeks && showDays) {
    const openWeek = program.weeks.find((week) => week.weekNumber === selectedWeek);
    return (
      <>
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
        <div className="wl-week-folders">
          <header className="wl-week-folders__head">
            <p className="wl-week-folders__title">{program.name.trim() || (isEs ? 'Programa' : 'Program')}</p>
            <p className="wl-week-folders__sub">
              {isEs
                ? `${program.weeks.length} ${program.weeks.length === 1 ? 'semana' : 'semanas'}`
                : `${program.weeks.length} ${program.weeks.length === 1 ? 'week' : 'weeks'}`}
            </p>
          </header>
          <ul className="wl-week-folders__list" ref={folderListRef}>
            {program.weeks.map((week) => {
              const open = expandedWeek === week.weekNumber;
              const days = open ? (week.weekNumber === selectedWeek ? openWeek?.days ?? week.days : week.days) : [];
              const dayCount = week.days.length;
              const weekMeta = isEs
                ? `${dayCount} ${dayCount === 1 ? 'día' : 'días'}`
                : `${dayCount} ${dayCount === 1 ? 'day' : 'days'}`;
              const weekDraggable = canReorderWeeks;
              return (
                <li
                  key={week.weekNumber}
                  className={`wl-week-folder${open ? ' is-open' : ''}${week.weekNumber === selectedWeek ? ' is-current' : ''}`}
                  onDragOver={(event) => overFolderRow(event, 'week')}
                  onDrop={(event) => dropFolderRow(event, 'week', week.weekNumber)}
                >
                  <div className="wl-week-folder__row">
                    <button
                      type="button"
                      className="wl-week-folder__select"
                      aria-expanded={open}
                      draggable={weekDraggable}
                      title={weekDraggable ? reorderWeekLabel : undefined}
                      onDragStart={(event) => startFolderDrag(event, 'week', week.weekNumber)}
                      onDragEnd={endFolderDrag}
                      onClick={() => {
                        if (open) {
                          setExpandedWeek(null);
                          return;
                        }
                        setExpandedWeek(week.weekNumber);
                        if (week.weekNumber !== selectedWeek) onSelectWeek(week.weekNumber);
                      }}
                    >
                      {weekDraggable ? (
                        <GripVertical className="wl-week-folder__grip" size={14} strokeWidth={2} aria-hidden />
                      ) : null}
                      <span className="wl-week-folder__mark" aria-hidden>
                        <CalendarRange size={15} strokeWidth={2} />
                      </span>
                      <span className="wl-week-folder__copy">
                        <span className="wl-week-folder__name">{weekOptionLabel(week.weekNumber)}</span>
                        <span className="wl-week-folder__meta">{weekMeta}</span>
                      </span>
                      <ChevronRight className="wl-week-folder__chev" size={16} strokeWidth={2.25} aria-hidden />
                    </button>
                    {onRemoveWeek || onDuplicateWeek ? (
                      <span className="wl-week-folder__actions">
                        <CoachNavMoreMenu
                          ariaLabel={isEs ? `Acciones de ${weekOptionLabel(week.weekNumber)}` : `Actions for ${weekOptionLabel(week.weekNumber)}`}
                          removeLabel={isEs ? 'Eliminar semana' : 'Delete week'}
                          canRemove={Boolean(canRemoveWeek && onRemoveWeek)}
                          onRemove={() => requestRemoveWeek(week.weekNumber)}
                          duplicateLabel={onDuplicateWeek ? duplicateWeekLabel : undefined}
                          canDuplicate={canAddWeek}
                          onDuplicate={onDuplicateWeek ? () => onDuplicateWeek(week.weekNumber) : undefined}
                          triggerClassName="wl-week-folder__action"
                        />
                      </span>
                    ) : null}
                  </div>
                  {open ? (
                    <ul className="wl-week-folder__days" aria-label={labels.daysRow}>
                      {days.map((day) => {
                        const active = selectedDay === day.dayNumber && week.weekNumber === selectedWeek;
                        const dayDraggable = canReorderDays && week.weekNumber === selectedWeek;
                        return (
                          <li
                            key={day.dayNumber}
                            className={`wl-week-folder__day${active ? ' is-active' : ''}`}
                            onDragOver={(event) => overFolderRow(event, 'day')}
                            onDrop={(event) => dropFolderRow(event, 'day', day.dayNumber)}
                          >
                            <button
                              type="button"
                              className="wl-week-folder__day-select"
                              aria-current={active ? 'true' : undefined}
                              title={dayDraggable ? `${dayTabLabel(day)}. ${reorderDayLabel}` : dayTabLabel(day)}
                              draggable={dayDraggable}
                              onDragStart={(event) => startFolderDrag(event, 'day', day.dayNumber)}
                              onDragEnd={endFolderDrag}
                              onClick={() => {
                                if (week.weekNumber !== selectedWeek) onSelectWeek(week.weekNumber);
                                onSelectDay(day.dayNumber);
                              }}
                            >
                              {dayDraggable ? (
                                <GripVertical className="wl-week-folder__grip" size={14} strokeWidth={2} aria-hidden />
                              ) : null}
                              <span className="wl-week-folder__dot" aria-hidden />
                              <span className="wl-week-folder__name">{`D${day.dayNumber}`}</span>
                              {active ? <ChevronRight className="wl-week-folder__chev" size={14} strokeWidth={2.25} aria-hidden /> : null}
                            </button>
                            {onRemoveDay || onDuplicateDay ? (
                              <span className="wl-week-folder__actions">
                                <CoachNavMoreMenu
                                  ariaLabel={isEs ? `Acciones del día ${day.dayNumber}` : `Actions for day ${day.dayNumber}`}
                                  removeLabel={isEs ? 'Eliminar día' : 'Delete day'}
                                  canRemove={Boolean(canRemoveDay && onRemoveDay)}
                                  onRemove={() => requestRemoveDay(day.dayNumber)}
                                  duplicateLabel={onDuplicateDay ? duplicateDayLabel : undefined}
                                  canDuplicate={canAddDay}
                                  onDuplicate={onDuplicateDay ? () => onDuplicateDay(day.dayNumber) : undefined}
                                  triggerClassName="wl-week-folder__action"
                                />
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                      <li className="wl-week-folder__day wl-week-folder__day--add">
                        <button
                          type="button"
                          className="wl-week-folders__add wl-week-folders__add--day"
                          disabled={!canAddDay}
                          title={canAddDay ? labels.addDay : labels.maxDays}
                          onClick={() => onAddDay()}
                        >
                          <Plus size={14} strokeWidth={2.25} aria-hidden />
                          {labels.addDay}
                        </button>
                      </li>
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="wl-week-folders__add"
            disabled={!canAddWeek}
            title={canAddWeek ? labels.addWeek : labels.maxWeeks}
            onClick={() => onAddWeek()}
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            {labels.addWeek}
          </button>
        </div>
      </>
    );
  }

  const navTree = (
    <>
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
        {showWeeks ? (
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

        {!useAthleteMobileNav ? (
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
              onClick={() => onAddWeek()}
              disabled={!canAddWeek}
              title={canAddWeek ? labels.addWeek : labels.maxWeeks}
              aria-label={labels.addWeek}
            >
              <Plus size={18} strokeWidth={2.25} aria-hidden />
            </button>
            {canRemoveWeek && onRemoveWeek ? (
              <button
                type="button"
                className="wolf-week-tab-remove wolf-week-tab-remove--mobile"
                onClick={() => requestRemoveWeek(selectedWeek)}
                disabled={!canRemoveWeek}
                title={labels.removeWeek}
                aria-label={labels.removeWeek}
              >
                <Trash2 size={16} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        ) : null}

        {useAthleteMobileNav ? (
          <MobileWeekNavigator
            variant="coach"
            weeks={program.weeks}
            activeWeek={selectedWeek}
            isEs={isEs}
            onWeekChange={onSelectWeek}
            labelMode="simple"
            canAddWeek={!isStatsNav && canAddWeek}
            onAddWeek={onAddWeek}
            addWeekTitle={canAddWeek ? labels.addWeek : labels.maxWeeks}
            canRemoveWeek={!isStatsNav && canRemoveWeek}
            onRemoveWeek={
              canRemoveWeek && onRemoveWeek ? () => requestRemoveWeek(selectedWeek) : undefined
            }
            removeWeekTitle={labels.removeWeek}
          />
        ) : (
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
              style={{ '--nav-chip-count': weekRows.length } as React.CSSProperties}
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
            className="wolf-week-carousel__arrow"
            disabled={!canGoNextWeek}
            onClick={goNextWeek}
            aria-label={isEs ? 'Semana siguiente' : 'Next week'}
          >
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
          </button>

          {!isStatsNav ? (
            <button
              type="button"
              className="wolf-week-tab-add wolf-week-tab-add--pinned"
              onClick={() => onAddWeek()}
              disabled={!canAddWeek}
              title={canAddWeek ? labels.addWeek : labels.maxWeeks}
              aria-label={labels.addWeek}
            >
              <Plus size={16} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}

          {!isStatsNav && isEditorDensity && canRemoveWeek && onRemoveWeek ? (
            <button
              type="button"
              className="wolf-program-nav-week-remove wolf-program-nav-week-remove--carousel"
              onClick={() => requestRemoveWeek(selectedWeek)}
              disabled={!canRemoveWeek}
              title={labels.removeWeek}
              aria-label={labels.removeWeek}
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>
        )}
        </div>
        ) : null}

        {showDays ? (
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
          {useAthleteMobileNav && selectedWeekData ? (
            <AthleteDayNavigator
              days={selectedWeekData.days}
              activeDay={selectedDay}
              isEs={isEs}
              isDayComplete={() => false}
              onDayChange={onSelectDay}
              layout="coach"
              className="wolf-coach-day-nav"
              trailing={
                !isStatsNav ? (
                  <>
                    <button
                      type="button"
                      className="wolf-coach-day-nav__tool"
                      onClick={() => onAddDay()}
                      disabled={!canAddDay}
                      title={canAddDay ? labels.addDay : labels.maxDays}
                      aria-label={labels.addDay}
                    >
                      <Plus size={16} strokeWidth={2.25} aria-hidden />
                    </button>
                    {onRemoveDay ? (
                      <CoachNavMoreMenu
                        ariaLabel={isEs ? 'Más opciones de día' : 'More day options'}
                        removeLabel={labels.removeDay}
                        canRemove={Boolean(canRemoveDay)}
                        onRemove={() => requestRemoveDay(selectedDay)}
                        triggerClassName="wolf-coach-day-nav__tool"
                      />
                    ) : null}
                  </>
                ) : undefined
              }
            />
          ) : (
          <div
            className="wolf-day-tabs-strip"
            ref={dayStripRef}
            style={{ '--nav-chip-count': dayRows.length } as React.CSSProperties}
          >
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
                  dateLabel={dayDateLabels[row.dayNumber] ?? null}
                />
              ))}
            </Reorder.Group>
            {!isStatsNav ? (
              <button
                type="button"
                className="wolf-day-tab-add"
                onClick={() => onAddDay()}
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
          )}
          </div>
        </section>
        ) : null}
      </div>
    </>
  );

  if (sheetSidebarNav) return navTree;
  return <div className={navClassName}>{navTree}</div>;
};
