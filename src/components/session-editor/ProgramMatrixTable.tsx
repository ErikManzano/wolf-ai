import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileImage, FileText, Maximize2, Minimize2, X } from 'lucide-react';
import type { Exercise, GeneratedProgram, Session } from '../../models/training';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { exportElementAsPdf, exportElementAsPng, slugExportFilename } from '../../utils/matrixExport';
import { dayToneIndex, weekToneIndex } from '../../utils/matrixDayTones';
import { formatBlockPrescription } from './schemeFormat';
import { blockDisplayName, formatWeekTonnageLabel } from './sessionSheetUtils';
import './program-matrix.css';

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
}

function maxDaysInProgram(program: GeneratedProgram): number {
  return Math.max(1, ...program.weeks.map((w) => w.days.length));
}

function sessionAt(program: GeneratedProgram, weekNumber: number, dayNumber: number): Session | null {
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  const day = week?.days.find((d) => d.dayNumber === dayNumber);
  return day?.session ?? null;
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

function MatrixTableBody({
  program,
  exercises,
  selectedWeek,
  selectedDay,
  isEs,
  weekTonnages,
  labels,
  dayNumbers,
  onSelectCell,
}: {
  program: GeneratedProgram;
  exercises: Exercise[];
  selectedWeek: number;
  selectedDay: number;
  isEs: boolean;
  weekTonnages: Record<number, number>;
  labels: ProgramMatrixTableProps['labels'];
  dayNumbers: number[];
  onSelectCell: (weekNumber: number, dayNumber: number) => void;
}) {
  const weekLabel = (n: number) => (isEs ? `Semana ${n}` : `Week ${n}`);

  return (
    <table className="wolf-program-matrix-table">
      <thead>
        <tr>
          <th scope="col" className="wolf-program-matrix-corner">
            {labels.weekCol}
          </th>
          {dayNumbers.map((dayNumber) => {
            const isActiveDay = selectedDay === dayNumber;
            const tone = dayToneIndex(dayNumber);
            return (
              <th
                key={dayNumber}
                scope="col"
                data-day-tone={tone}
                className={`wolf-program-matrix-day-col wolf-program-matrix-day-col--tone-${tone}${isActiveDay ? ' is-active-day' : ''}`}
              >
                {dayColumnLabel(program, dayNumber, selectedWeek, isEs)}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {program.weeks.map((w) => {
          const isActiveWeek = selectedWeek === w.weekNumber;
          const tonnage = weekTonnages[w.weekNumber] ?? 0;
          return (
            <tr
              key={w.weekNumber}
              data-week-tone={weekToneIndex(w.weekNumber)}
              className={isActiveWeek ? 'is-active-week' : undefined}
            >
              <th scope="row" className="wolf-program-matrix-week-row">
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
              </th>
              {dayNumbers.map((dayNumber) => {
                const session = sessionAt(program, w.weekNumber, dayNumber);
                const isSelected = selectedWeek === w.weekNumber && selectedDay === dayNumber;
                const tone = dayToneIndex(dayNumber);

                if (!session) {
                  return (
                    <td
                      key={`${w.weekNumber}-${dayNumber}`}
                      data-day-tone={tone}
                      className={`wolf-program-matrix-cell wolf-program-matrix-cell--tone-${tone} is-empty`}
                    >
                      <span className="wolf-program-matrix-cell-empty">—</span>
                    </td>
                  );
                }

                return (
                  <td
                    key={`${w.weekNumber}-${dayNumber}`}
                    data-day-tone={tone}
                    className={`wolf-program-matrix-cell wolf-program-matrix-cell--tone-${tone}${isSelected ? ' is-selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="wolf-program-matrix-cell-hit"
                      onClick={() => onSelectCell(w.weekNumber, dayNumber)}
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      {session.exercises.length > 0 ? (
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
                        <span className="wolf-program-matrix-cell-placeholder">{labels.emptyCell}</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
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
}) => {
  const { pushAlert } = useWolfAlert();
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const matrixRef = useRef<HTMLDivElement>(null);

  const dayCount = useMemo(() => maxDaysInProgram(program), [program]);
  const dayNumbers = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => i + 1),
    [dayCount],
  );

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
          <MatrixTableBody
            program={program}
            exercises={exercises}
            selectedWeek={selectedWeek}
            selectedDay={selectedDay}
            isEs={isEs}
            weekTonnages={weekTonnages}
            labels={labels}
            dayNumbers={dayNumbers}
            onSelectCell={onSelectCell}
          />
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
                  <button
                    type="button"
                    className="wolf-program-matrix-tool-btn"
                    onClick={() => void runExport('png')}
                    disabled={exporting}
                  >
                    <FileImage size={16} aria-hidden />
                    <span>{isEs ? 'Imagen' : 'Image'}</span>
                  </button>
                  <button
                    type="button"
                    className="wolf-program-matrix-tool-btn"
                    onClick={() => void runExport('pdf')}
                    disabled={exporting}
                  >
                    <FileText size={16} aria-hidden />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    className="wolf-program-matrix-tool-btn wolf-program-matrix-tool-btn--icon"
                    onClick={closeFullscreen}
                    aria-label={isEs ? 'Salir de pantalla completa' : 'Exit full screen'}
                  >
                    <Minimize2 size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="wolf-program-matrix-tool-btn wolf-program-matrix-tool-btn--icon"
                    onClick={closeFullscreen}
                    aria-label={isEs ? 'Cerrar' : 'Close'}
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
              </header>
              <div className="wolf-program-matrix-fullscreen__body">
                <div className="wolf-program-matrix wolf-program-matrix--expanded wolf-program-matrix--in-fullscreen">
                  <div
                    ref={matrixRef}
                    data-matrix-export-root
                    className="wolf-program-matrix-export-body"
                  >
                    {exportChrome}
                    <div className="wolf-program-matrix-scroll">
                      <MatrixTableBody
                        program={program}
                        exercises={exercises}
                        selectedWeek={selectedWeek}
                        selectedDay={selectedDay}
                        isEs={isEs}
                        weekTonnages={weekTonnages}
                        labels={labels}
                        dayNumbers={dayNumbers}
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
