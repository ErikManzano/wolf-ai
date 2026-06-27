import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FileImage, FileText, Maximize2, Minimize2, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Exercise, GeneratedProgram, Session } from '../../models/training';
import type { ProgramDaySlot } from '../../services/programStructureMutations';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { exportElementAsPdf, exportElementAsPng, slugExportFilename } from '../../utils/matrixExport';
import { dayToneIndex, weekToneIndex } from '../../utils/matrixDayTones';
import { formatBlockPrescription } from './schemeFormat';
import { blockDisplayName, formatWeekTonnageLabel } from './sessionSheetUtils';
import { matrixGridTemplate, matrixGridTemplateCompact } from './programTabReorderUtils';
import './program-matrix.css';

const DRAG_THRESHOLD_PX = 10;
const TAB_SPRING = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.82 };

export interface ProgramMatrixTableProps {
  program: GeneratedProgram;
  exercises: Exercise[];
  selectedWeek: number;
  selectedDay: number;
  isEs: boolean;
  weekTonnages: Record<number, number>;
  labels: {
    weekCol: string;
    emptyCell: string;
    overviewHint: string;
  };
  expanded?: boolean;
  exportTitle?: string;
  enableViewportTools?: boolean;
  onSelectCell: (weekNumber: number, dayNumber: number) => void;
  onSwapCells?: (from: ProgramDaySlot, to: ProgramDaySlot) => void;
}

function maxDaysInProgram(program: GeneratedProgram): number {
  return Math.max(1, ...program.weeks.map((w) => w.days.length));
}

function sessionAt(program: GeneratedProgram, weekNumber: number, dayNumber: number): Session | null {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  const day = week?.days.find((d) => d.dayNumber === dayNumber);
  return day?.session ?? null;
}

function dayExists(program: GeneratedProgram, weekNumber: number, dayNumber: number): boolean {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  return Boolean(week?.days.some((d) => d.dayNumber === dayNumber));
}

function dayColumnLabel(
  program: GeneratedProgram,
  dayNumber: number,
  selectedWeek: number,
  isEs: boolean,
): string {
  const week = program.weeks.find((w) => w.weekNumber === selectedWeek) ?? program.weeks[0];
  const day = week?.days.find((d) => d.dayNumber === dayNumber);
  const custom = day?.label?.trim();
  if (custom) return custom;
  return isEs ? `Día ${dayNumber}` : `Day ${dayNumber}`;
}

function slotKey(slot: ProgramDaySlot) {
  return `${slot.weekNumber}-${slot.dayNumber}`;
}

interface MatrixCellProps {
  weekNumber: number;
  dayNumber: number;
  session: Session | null;
  exists: boolean;
  exercises: Exercise[];
  isSelected: boolean;
  tone: number;
  emptyLabel: string;
  canSwap: boolean;
  isDragSource: boolean;
  isDropTarget: boolean;
  reduceMotion: boolean | null;
  onSelect: () => void;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerEnter: () => void;
}

const MatrixCell: React.FC<MatrixCellProps> = ({
  session,
  exists,
  exercises,
  isSelected,
  tone,
  emptyLabel,
  canSwap,
  isDragSource,
  isDropTarget,
  reduceMotion,
  onSelect,
  onPointerDown,
  onPointerEnter,
}) => {
  if (!exists) {
    return (
      <div
        role="cell"
        data-day-tone={tone}
        className={`wolf-program-matrix-cell wolf-program-matrix-cell--tone-${tone} is-empty is-missing`}
      >
        <span className="wolf-program-matrix-cell-empty">—</span>
      </div>
    );
  }

  return (
    <motion.div
      role="cell"
      layout
      transition={TAB_SPRING}
      data-day-tone={tone}
      className={`wolf-program-matrix-cell wolf-program-matrix-cell--tone-${tone}${isSelected ? ' is-selected' : ''}${canSwap ? ' wolf-program-matrix-cell--swappable' : ''}${isDragSource ? ' is-drag-source' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
      onPointerEnter={canSwap ? onPointerEnter : undefined}
    >
      <button
        type="button"
        className="wolf-program-matrix-cell-hit"
        aria-current={isSelected ? 'true' : undefined}
        onPointerDown={canSwap ? onPointerDown : undefined}
        onClick={onSelect}
      >
        {session && session.exercises.length > 0 ? (
          <ol className="wolf-program-matrix-exercises">
            {session.exercises.map((block, i) => {
              const name = blockDisplayName(block, exercises);
              const rx = formatBlockPrescription(block);
              return (
                <li key={`${block.exerciseId}-${i}`}>
                  <span className="wolf-program-matrix-exercise">
                    <span className="wolf-program-matrix-exercise-name">{name}</span>
                    <code className="wolf-program-matrix-exercise-rx">{rx}</code>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <span className="wolf-program-matrix-cell-placeholder">{emptyLabel}</span>
        )}
      </button>
      {canSwap && isDragSource && !reduceMotion ? (
        <span className="wolf-program-matrix-cell-float" aria-hidden />
      ) : null}
    </motion.div>
  );
};

function MatrixTableBody({
  program,
  exercises,
  selectedWeek,
  selectedDay,
  isEs,
  weekTonnages,
  labels,
  onSelectCell,
  onSwapCells,
}: Omit<ProgramMatrixTableProps, 'expanded' | 'exportTitle' | 'enableViewportTools'>) {
  const reduceMotion = useReducedMotion();
  const canSwap = Boolean(onSwapCells);
  const dayCount = useMemo(() => maxDaysInProgram(program), [program]);
  const dayNumbers = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => i + 1),
    [dayCount],
  );

  const [dragSource, setDragSource] = useState<ProgramDaySlot | null>(null);
  const [dropTarget, setDropTarget] = useState<ProgramDaySlot | null>(null);
  const pendingPointer = useRef<{ slot: ProgramDaySlot; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const gridStyle = {
    '--matrix-grid-template': matrixGridTemplate(dayNumbers.length),
    '--matrix-grid-template-compact': matrixGridTemplateCompact(dayNumbers.length),
    '--matrix-day-count': dayNumbers.length,
  } as CSSProperties;

  const clearDrag = useCallback(() => {
    pendingPointer.current = null;
    setDragSource(null);
    setDropTarget(null);
  }, []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!pendingPointer.current) return;
      const dx = event.clientX - pendingPointer.current.x;
      const dy = event.clientY - pendingPointer.current.y;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        setDragSource(pendingPointer.current.slot);
        pendingPointer.current = null;
        suppressClick.current = true;
      }
    };

    const onPointerUp = () => {
      if (
        dragSource &&
        dropTarget &&
        slotKey(dragSource) !== slotKey(dropTarget)
      ) {
        onSwapCells?.(dragSource, dropTarget);
      }
      if (dragSource) suppressClick.current = true;
      clearDrag();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [dragSource, dropTarget, onSwapCells, clearDrag]);

  const handleCellPointerDown = useCallback(
    (slot: ProgramDaySlot, event: React.PointerEvent) => {
      if (!canSwap || event.button !== 0) return;
      pendingPointer.current = { slot, x: event.clientX, y: event.clientY };
    },
    [canSwap],
  );

  const handleCellSelect = useCallback(
    (weekNumber: number, dayNumber: number) => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      onSelectCell(weekNumber, dayNumber);
    },
    [onSelectCell],
  );

  const weekLabel = (n: number) => (isEs ? `Semana ${n}` : `Week ${n}`);

  return (
    <div
      className={`wolf-program-matrix-table wolf-program-matrix-table--grid${canSwap ? ' wolf-program-matrix-table--swappable' : ''}`}
      style={gridStyle}
      role="table"
      aria-label={isEs ? 'Matriz del programa' : 'Program matrix'}
    >
      <div className="wolf-program-matrix-grid-head" role="row">
        <div className="wolf-program-matrix-corner" role="columnheader">
          {labels.weekCol}
        </div>
        <div className="wolf-program-matrix-day-header-track" role="presentation">
          {dayNumbers.map((dayNumber) => {
            const isActiveDay = selectedDay === dayNumber;
            const tone = dayToneIndex(dayNumber);
            return (
              <div
                key={dayNumber}
                role="columnheader"
                data-day-tone={tone}
                className={`wolf-program-matrix-day-col wolf-program-matrix-day-col--tone-${tone}${isActiveDay ? ' is-active-day' : ''}`}
              >
                {dayColumnLabel(program, dayNumber, selectedWeek, isEs)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="wolf-program-matrix-week-body">
        {program.weeks.map((w, rowIndex) => {
          const isActiveWeek = selectedWeek === w.weekNumber;
          const tonnage = weekTonnages[w.weekNumber] ?? 0;
          const weekTone = weekToneIndex(w.weekNumber);

          return (
            <div
              key={w.weekNumber}
              role="row"
              data-week-tone={weekTone}
              className={`wolf-program-matrix-week-line${isActiveWeek ? ' is-active-week' : ''}${rowIndex % 2 === 1 ? ' is-alt-row' : ''}`}
            >
              <div className="wolf-program-matrix-week-row" role="rowheader">
                <button
                  type="button"
                  className="wolf-program-matrix-week-row-btn"
                  onClick={() => onSelectCell(w.weekNumber, selectedDay)}
                  aria-current={isActiveWeek ? 'true' : undefined}
                >
                  <span className="wolf-program-matrix-week-title">{weekLabel(w.weekNumber)}</span>
                  <span className="wolf-program-matrix-week-load">
                    {formatWeekTonnageLabel(tonnage, isEs)}
                  </span>
                </button>
              </div>
              {dayNumbers.map((dayNumber) => {
                const slot = { weekNumber: w.weekNumber, dayNumber };
                const exists = dayExists(program, w.weekNumber, dayNumber);
                const session = sessionAt(program, w.weekNumber, dayNumber);
                const isSelected = selectedWeek === w.weekNumber && selectedDay === dayNumber;
                const tone = dayToneIndex(dayNumber);
                const isDragSource = dragSource ? slotKey(dragSource) === slotKey(slot) : false;
                const isDropTarget =
                  dragSource && dropTarget ? slotKey(dropTarget) === slotKey(slot) && !isDragSource : false;

                return (
                  <MatrixCell
                    key={`${w.weekNumber}-${dayNumber}`}
                    weekNumber={w.weekNumber}
                    dayNumber={dayNumber}
                    session={session}
                    exists={exists}
                    exercises={exercises}
                    isSelected={isSelected}
                    tone={tone}
                    emptyLabel={labels.emptyCell}
                    canSwap={canSwap && exists}
                    isDragSource={isDragSource}
                    isDropTarget={Boolean(isDropTarget)}
                    reduceMotion={reduceMotion}
                    onSelect={() => handleCellSelect(w.weekNumber, dayNumber)}
                    onPointerDown={(event) => handleCellPointerDown(slot, event)}
                    onPointerEnter={() => {
                      if (dragSource) setDropTarget(slot);
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ProgramMatrixTable: React.FC<ProgramMatrixTableProps> = ({
  program,
  exercises,
  selectedWeek,
  selectedDay,
  isEs,
  weekTonnages,
  labels,
  expanded = false,
  exportTitle,
  enableViewportTools = true,
  onSelectCell,
  onSwapCells,
}) => {
  const { pushAlert } = useWolfAlert();
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const matrixRef = useRef<HTMLDivElement>(null);

  const title =
    exportTitle?.trim() || program.name?.trim() || (isEs ? 'programa' : 'program');

  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFullscreen();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [fullscreen, closeFullscreen]);

  const runExport = async (kind: 'png' | 'pdf') => {
    if (!matrixRef.current || exporting) return;
    setExporting(true);
    try {
      const filename =
        kind === 'png'
          ? slugExportFilename(title, 'png')
          : slugExportFilename(title, 'pdf');
      const exportOptions = { title };
      if (kind === 'png') {
        await exportElementAsPng(matrixRef.current, filename, exportOptions);
      } else {
        await exportElementAsPdf(matrixRef.current, filename, exportOptions);
      }
      pushAlert({
        tone: 'success',
        title: isEs ? 'Exportación lista' : 'Export ready',
        message:
          kind === 'png'
            ? isEs
              ? 'Imagen descargada correctamente.'
              : 'Image downloaded successfully.'
            : isEs
              ? 'PDF descargado correctamente.'
              : 'PDF downloaded successfully.',
      });
    } catch {
      pushAlert({
        tone: 'error',
        title: isEs ? 'No se pudo exportar' : 'Export failed',
        message: isEs
          ? 'Inténtalo de nuevo en unos segundos.'
          : 'Please try again in a few seconds.',
      });
    } finally {
      setExporting(false);
    }
  };

  const exportChrome = (
    <>
      <div className="wolf-program-matrix-brand">
        <div className="wolf-program-matrix-brand__mark" aria-hidden>
          <span className="wolf-program-matrix-brand__wolf">Wolf</span>
          <span className="wolf-program-matrix-brand__ai">AI</span>
        </div>
        <span className="wolf-program-matrix-brand__divider" aria-hidden />
        <h2 className="wolf-program-matrix-brand__title">{title}</h2>
      </div>
    </>
  );

  const exportFooter = (
    <div className="wolf-program-matrix-export-footer" aria-hidden>
      <span className="wolf-program-matrix-export-footer__site">wolf.ai</span>
      <span>
        {isEs ? 'Inteligencia de entrenamiento olímpico' : 'Olympic weightlifting training intelligence'}
      </span>
    </div>
  );

  const toolbar = enableViewportTools ? (
    <div className="wolf-program-matrix-toolbar" role="toolbar" aria-label={isEs ? 'Herramientas de tabla' : 'Table tools'}>
      <button
        type="button"
        className="wolf-program-matrix-tool-btn"
        onClick={() => setFullscreen(true)}
        disabled={exporting || fullscreen}
        aria-label={isEs ? 'Pantalla completa' : 'Full screen'}
        title={isEs ? 'Pantalla completa' : 'Full screen'}
      >
        <Maximize2 size={16} aria-hidden />
        <span>{isEs ? 'Expandir' : 'Expand'}</span>
      </button>
      <button
        type="button"
        className="wolf-program-matrix-tool-btn"
        onClick={() => void runExport('png')}
        disabled={exporting}
        aria-label={isEs ? 'Exportar imagen' : 'Export image'}
        title={isEs ? 'Exportar PNG' : 'Export PNG'}
      >
        <FileImage size={16} aria-hidden />
        <span>{isEs ? 'Imagen' : 'Image'}</span>
      </button>
      <button
        type="button"
        className="wolf-program-matrix-tool-btn"
        onClick={() => void runExport('pdf')}
        disabled={exporting}
        aria-label={isEs ? 'Exportar PDF' : 'Export PDF'}
        title={isEs ? 'Exportar PDF' : 'Export PDF'}
      >
        <FileText size={16} aria-hidden />
        <span>PDF</span>
      </button>
    </div>
  ) : null;

  const matrixBodyProps = {
    program,
    exercises,
    selectedWeek,
    selectedDay,
    isEs,
    weekTonnages,
    labels,
    onSelectCell,
    onSwapCells,
  };

  const matrixPanel = (
    <div
      className={`wolf-program-matrix${expanded ? ' wolf-program-matrix--expanded' : ' wolf-program-matrix--overview'}`}
      role="region"
      aria-label={isEs ? 'Vista general del plan' : 'Plan overview'}
    >
      {toolbar}
      <div
        ref={!fullscreen ? matrixRef : undefined}
        data-matrix-export-root
        className="wolf-program-matrix-export-body"
      >
        {exportChrome}
        <div className="wolf-program-matrix-scroll">
          <MatrixTableBody {...matrixBodyProps} />
        </div>
        <p className="wolf-program-matrix-hint">{labels.overviewHint}</p>
        {exportFooter}
      </div>
    </div>
  );

  return (
    <>
      {!fullscreen ? matrixPanel : null}
      {fullscreen
        ? createPortal(
            <div className="wolf-program-matrix-fullscreen" role="dialog" aria-modal="true" aria-label={isEs ? 'Tabla en pantalla completa' : 'Full screen table'}>
              <header className="wolf-program-matrix-fullscreen__head">
                <strong>{title}</strong>
                <div className="wolf-program-matrix-fullscreen__actions">
                  <button type="button" className="wolf-program-matrix-tool-btn" onClick={() => void runExport('png')} disabled={exporting}>
                    <FileImage size={16} aria-hidden />
                    <span>{isEs ? 'Imagen' : 'Image'}</span>
                  </button>
                  <button type="button" className="wolf-program-matrix-tool-btn" onClick={() => void runExport('pdf')} disabled={exporting}>
                    <FileText size={16} aria-hidden />
                    <span>PDF</span>
                  </button>
                  <button type="button" className="wolf-program-matrix-tool-btn wolf-program-matrix-tool-btn--icon" onClick={closeFullscreen} aria-label={isEs ? 'Salir de pantalla completa' : 'Exit full screen'}>
                    <Minimize2 size={16} aria-hidden />
                  </button>
                  <button type="button" className="wolf-program-matrix-tool-btn wolf-program-matrix-tool-btn--icon" onClick={closeFullscreen} aria-label={isEs ? 'Cerrar' : 'Close'}>
                    <X size={16} aria-hidden />
                  </button>
                </div>
              </header>
              <div className="wolf-program-matrix-fullscreen__body">
                <div className="wolf-program-matrix wolf-program-matrix--expanded wolf-program-matrix--in-fullscreen">
                  <div ref={matrixRef} data-matrix-export-root className="wolf-program-matrix-export-body">
                    {exportChrome}
                    <div className="wolf-program-matrix-scroll">
                      <MatrixTableBody
                        {...matrixBodyProps}
                        onSelectCell={(week, day) => {
                          onSelectCell(week, day);
                          closeFullscreen();
                        }}
                      />
                    </div>
                    <p className="wolf-program-matrix-hint">{labels.overviewHint}</p>
                    {exportFooter}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
