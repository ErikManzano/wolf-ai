import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Athlete, Exercise, GeneratedProgram } from '../../../models/training';
import type { DailyTrendChartData } from '../programChartSeries';
import { computeWeekAggregateMetrics } from '../programWeekStats';
import { formatStatsKg } from '../statsTonnage';
import { DailyTrendChart } from '../stats-ds/DailyTrendChart';
import { ProgramContextSection } from './ProgramContextSection';
import { ProgramContextChartExpandButton } from './ProgramContextChartExpandButton';
import {
  ProgramContextChartGallery,
  type ProgramContextChartItem,
} from './ProgramContextChartGallery';

const HISTORY_PAGE_SIZE = 6;

export function DayHistoryContextTab({
  program,
  weekNumber,
  athlete,
  exercises,
  isEs,
}: {
  program: GeneratedProgram;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  templateMetrics?: boolean;
}) {
  const rows = useMemo(() => {
    return [...program.weeks]
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map((week) => {
        const metrics = computeWeekAggregateMetrics(week, athlete, exercises, isEs);
        return {
          weekNumber: week.weekNumber,
          tonnage: metrics.tonnage,
          imp: metrics.avgPct,
          sets: metrics.sets,
          reps: metrics.reps,
        };
      });
  }, [program, athlete, exercises, isEs]);

  const head = isEs ? 'Todas las semanas' : 'All weeks';

  const evolution = useMemo((): DailyTrendChartData => {
    return {
      labels: rows.map((row) => `S${row.weekNumber}`),
      dayNumbers: rows.map((row) => row.weekNumber),
      tonnage: rows.map((row) => (row.tonnage > 0 ? row.tonnage : null)),
      imp: rows.map((row) => (row.imp > 0 ? row.imp : null)),
      au: rows.map((row) => (row.au > 0 ? row.au : null)),
      prevTonnage: rows.map(() => null),
      prevImp: rows.map(() => null),
      volumeBaseline: null,
    };
  }, [rows]);

  const activeWeekIndex = rows.findIndex((row) => row.weekNumber === weekNumber);
  const evolutionTitle = isEs ? 'Evolución' : 'Trend';
  const evolutionMessages = {
    empty: isEs ? 'Sin carga en las semanas del plan.' : 'No load across the program weeks.',
    sparse: isEs
      ? 'Hacen falta al menos 2 semanas con carga para ver la evolución.'
      : 'At least 2 weeks with load are needed to see the trend.',
    aria: isEs
      ? 'Evolución del volumen y la intensidad por semana'
      : 'Weekly volume and intensity trend',
  };

  const chartItems = useMemo((): ProgramContextChartItem[] => {
    const messages = {
      empty: isEs ? 'Sin carga en las semanas del plan.' : 'No load across the program weeks.',
      sparse: isEs
        ? 'Hacen falta al menos 2 semanas con carga para ver la evolución.'
        : 'At least 2 weeks with load are needed to see the trend.',
      aria: isEs
        ? 'Evolución del volumen y la intensidad por semana'
        : 'Weekly volume and intensity trend',
    };
    return [
      {
        id: 'weekEvolution',
        title: evolutionTitle,
        render: (variant) => (
          <DailyTrendChart
            data={evolution}
            isEs={isEs}
            variant={variant}
            fluid={variant === 'context'}
            activeIndex={activeWeekIndex >= 0 ? activeWeekIndex : undefined}
            messages={messages}
          />
        ),
      },
    ];
  }, [activeWeekIndex, evolution, evolutionTitle, isEs]);

  const [galleryChartId, setGalleryChartId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / HISTORY_PAGE_SIZE));
  const weekSignature = rows.map((row) => row.weekNumber).join(',');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const numbers = weekSignature ? weekSignature.split(',').map(Number) : [];
    const index = numbers.indexOf(weekNumber);
    setPage(index >= 0 ? Math.floor(index / HISTORY_PAGE_SIZE) : 0);
  }, [weekNumber, weekSignature]);

  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * HISTORY_PAGE_SIZE;
  const pageRows = rows.slice(pageStart, pageStart + HISTORY_PAGE_SIZE);
  const isLastPage = safePage >= totalPages - 1;
  const totalTonnage = rows.reduce((sum, row) => sum + row.tonnage, 0);
  const totalSets = rows.reduce((sum, row) => sum + row.sets, 0);
  const totalReps = rows.reduce((sum, row) => sum + row.reps, 0);
  const totalImp =
    totalTonnage > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.imp * row.tonnage, 0) / totalTonnage)
      : 0;
  const rangeStart = pageRows[0]?.weekNumber ?? 0;
  const rangeEnd = pageRows[pageRows.length - 1]?.weekNumber ?? rangeStart;
  const rangeLabel =
    rangeStart === rangeEnd ? `${rangeStart} de ${rows.length}` : `${rangeStart}–${rangeEnd} de ${rows.length}`;

  if (rows.length === 0) {
    return (
      <div className="wl-program-context-tab wl-program-context-tab--history">
        <ProgramContextSection title={isEs ? 'Histórico' : 'History'} subtitle={head.toUpperCase()}>
          <p className="wl-program-context-empty">
            {isEs ? 'Sin semanas en el plan.' : 'No weeks in this program yet.'}
          </p>
        </ProgramContextSection>
      </div>
    );
  }

  return (
    <div className="wl-program-context-tab wl-program-context-tab--history">
      <ProgramContextSection
        title={isEs ? 'Histórico' : 'History'}
        subtitle={head.toUpperCase()}
        action={
          <nav
            className="wl-day-history-pager"
            aria-label={isEs ? 'Paginación del histórico por semanas' : 'History week pagination'}
          >
            <button
              type="button"
              className="wl-day-history-pager__btn"
              disabled={safePage <= 0}
              aria-label={isEs ? 'Seis semanas anteriores' : 'Previous six weeks'}
              onClick={() => setPage((current) => Math.max(0, Math.min(current, totalPages - 1) - 1))}
            >
              <ChevronLeft size={14} strokeWidth={2.25} aria-hidden />
            </button>
            <span
              className="wl-day-history-pager__range"
              aria-live="polite"
              title={isEs ? `Semanas ${rangeLabel}` : `Weeks ${rangeLabel}`}
            >
              {rangeLabel}
            </span>
            <button
              type="button"
              className="wl-day-history-pager__btn"
              disabled={safePage >= totalPages - 1}
              aria-label={isEs ? 'Seis semanas siguientes' : 'Next six weeks'}
              onClick={() =>
                setPage((current) => Math.min(totalPages - 1, Math.min(current, totalPages - 1) + 1))
              }
            >
              <ChevronRight size={14} strokeWidth={2.25} aria-hidden />
            </button>
          </nav>
        }
      >
        <table className="wl-program-context-table wl-day-history-table">
          <thead>
            <tr>
              <th>{isEs ? 'Sem' : 'Wk'}</th>
              <th>Tonelaje</th>
              <th>IMP</th>
              <th>Sets</th>
              <th>Reps</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const isCurrent = row.weekNumber === weekNumber;
              const isPrev = row.weekNumber === weekNumber - 1;
              return (
                <tr
                  key={row.weekNumber}
                  className={
                    isCurrent ? 'is-current' : isPrev ? 'is-prev-week' : undefined
                  }
                >
                  <td>
                    {row.weekNumber}
                    {isCurrent ? (isEs ? ' (editando)' : ' (editing)') : ''}
                  </td>
                  <td>{row.tonnage > 0 ? formatStatsKg(row.tonnage, { alwaysKg: true }) : '—'}</td>
                  <td>{row.imp > 0 ? `${row.imp}%` : '—'}</td>
                  <td>{row.sets}</td>
                  <td>{row.reps}</td>
                </tr>
              );
            })}
          </tbody>
          {isLastPage ? (
            <tfoot>
              <tr className="wl-day-history-table__totals">
                <th scope="row">{isEs ? 'Total' : 'Total'}</th>
                <td>{totalTonnage > 0 ? formatStatsKg(totalTonnage, { alwaysKg: true }) : '—'}</td>
                <td>{totalImp > 0 ? `${totalImp}%` : '—'}</td>
                <td>{totalSets}</td>
                <td>{totalReps}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </ProgramContextSection>

      <ProgramContextSection
        className="wl-stats-section--span"
        title={evolutionTitle}
        subtitle={head}
        action={
          <ProgramContextChartExpandButton
            isEs={isEs}
            chartTitle={evolutionTitle}
            onClick={() => setGalleryChartId('weekEvolution')}
          />
        }
      >
        <DailyTrendChart
          data={evolution}
          isEs={isEs}
          variant="context"
          fluid
          activeIndex={activeWeekIndex >= 0 ? activeWeekIndex : undefined}
          messages={evolutionMessages}
        />
      </ProgramContextSection>

      <ProgramContextChartGallery
        open={galleryChartId != null}
        items={chartItems}
        activeId={galleryChartId}
        onActiveIdChange={setGalleryChartId}
        onClose={() => setGalleryChartId(null)}
        isEs={isEs}
        scopeLabel={head}
        programName={program.name}
      />
    </div>
  );
}
