import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek } from '../../models/training';
import { computeWeekAggregateMetrics } from './programWeekStats';
import { formatStatsKg } from './statsTonnage';
import {
  computeSessionScienceSummary,
  computeWeekScience,
  formatShortDate,
  scienceZoneLabel,
  type ScienceZoneId,
} from './programScienceStats';
import './editor-programming-rail.css';

const STORAGE_KEY = 'wolf_editor_stats_bar_open';

export interface EditorProgrammingRailProps {
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  weekNumber: number;
  selectedDay: number;
  weekData?: ProgramWeek;
  program: GeneratedProgram;
  onSelectDay?: (dayNumber: number) => void;
  /** Optional calendar date for the selected day (YYYY-MM-DD) */
  dayDateIso?: string | null;
}

const ZONE_COLOR: Record<ScienceZoneId, string> = {
  Tecnica_Velocidad: 'var(--stats-blue, #2563eb)',
  Acumulacion_Tension: 'var(--stats-green, #059669)',
  Potencia_Neural: 'var(--stats-orange, #ff7a00)',
};

function readOpenPreference(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return false;
    return raw === '1';
  } catch {
    return false;
  }
}

/**
 * Top info bar for programming feedback.
 * Collapsed = one KPI strip; expanded = days + stimulus (no horizontal sidebar).
 */
export const EditorProgrammingRail: React.FC<EditorProgrammingRailProps> = ({
  athlete,
  exercises,
  isEs,
  weekNumber,
  selectedDay,
  weekData,
  program,
  onSelectDay,
  dayDateIso = null,
}) => {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(readOpenPreference);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  const metrics = useMemo(
    () => computeWeekAggregateMetrics(weekData, athlete, exercises, isEs, 6),
    [weekData, athlete, exercises, isEs],
  );

  const science = useMemo(
    () => computeWeekScience(program, weekNumber, athlete, exercises, null),
    [program, weekNumber, athlete, exercises],
  );

  const dayScience = useMemo(() => {
    const day = weekData?.days.find((d) => d.dayNumber === selectedDay);
    if (!day) return null;
    return computeSessionScienceSummary(day.session, athlete, exercises);
  }, [weekData, selectedDay, athlete, exercises]);

  const dayRows = useMemo(() => {
    const days = [...(weekData?.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);
    const tonnages = days.map((d) =>
      computeSessionScienceSummary(d.session, athlete, exercises).tonnage,
    );
    const max = Math.max(...tonnages, 1);
    return days.map((d, i) => ({
      dayNumber: d.dayNumber,
      label: (d.label || `D${d.dayNumber}`).replace(/^(Día|Day)\s*/i, 'D'),
      tonnage: tonnages[i] ?? 0,
      pct: Math.round(((tonnages[i] ?? 0) / max) * 100),
      share:
        metrics.tonnage > 0
          ? Math.round(((tonnages[i] ?? 0) / metrics.tonnage) * 100)
          : 0,
    }));
  }, [weekData, athlete, exercises, metrics.tonnage]);

  const volume = science?.summary.tonnage ?? metrics.tonnage;
  const imp = science?.summary.intensityWeighted ?? metrics.avgPct;
  const tl = science?.summary.trainingLoad ?? 0;
  const ramp = science?.fatigue.rampRate;
  const zones = science?.stimulusDistribution ?? [];
  const dateLabel = dayDateIso ? formatShortDate(dayDateIso, isEs) : null;

  const duration = reduceMotion ? 0 : 0.28;
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <section
      className={`wl-prog-bar${open ? ' is-open' : ''}`}
      aria-label={isEs ? 'Resumen de programación' : 'Programming summary'}
    >
      <button
        type="button"
        className="wl-prog-bar__summary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="wl-prog-bar-details"
      >
        <div className="wl-prog-bar__context">
          <span className="wl-prog-bar__week">
            {isEs ? `Sem ${weekNumber}` : `Wk ${weekNumber}`}
          </span>
          <span className="wl-prog-bar__sep" aria-hidden>
            ·
          </span>
          <span className="wl-prog-bar__day-label">
            {isEs ? `Día ${selectedDay}` : `Day ${selectedDay}`}
          </span>
          {dateLabel ? (
            <>
              <span className="wl-prog-bar__sep" aria-hidden>
                ·
              </span>
              <span className="wl-prog-bar__date">{dateLabel}</span>
            </>
          ) : null}
        </div>

        <div className="wl-prog-bar__kpis" aria-hidden={!open ? undefined : true}>
          <span className="wl-prog-bar__kpi">
            <em>{isEs ? 'Vol' : 'Vol'}</em>
            <strong>{formatStatsKg(volume)}</strong>
            {ramp != null ? (
              <small className={ramp > 0 ? 'is-up' : ramp < 0 ? 'is-down' : undefined}>
                {ramp > 0 ? '+' : ''}
                {ramp}%
              </small>
            ) : null}
          </span>
          <span className="wl-prog-bar__kpi">
            <em>IMP</em>
            <strong>{imp > 0 ? `${imp}%` : '—'}</strong>
            {dayScience && dayScience.intensityWeighted > 0 ? (
              <small>
                {isEs ? 'día' : 'day'} {dayScience.intensityWeighted}%
              </small>
            ) : null}
          </span>
          <span className="wl-prog-bar__kpi">
            <em>AU</em>
            <strong>{tl > 0 ? tl : '—'}</strong>
            {dayScience && dayScience.trainingLoad > 0 ? (
              <small>
                {isEs ? 'día' : 'day'} {dayScience.trainingLoad}
              </small>
            ) : null}
          </span>
        </div>

        <span className="wl-prog-bar__toggle" aria-hidden>
          <ChevronDown size={16} strokeWidth={2.4} className="wl-prog-bar__chevron" />
          <span className="wl-prog-bar__toggle-label">
            {open ? (isEs ? 'Menos' : 'Less') : isEs ? 'Más' : 'More'}
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="wl-prog-bar-details"
            className="wl-prog-bar__details"
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration, ease }}
          >
            <div className="wl-prog-bar__details-inner">
              <div className="wl-prog-bar__col">
                <div className="wl-prog-bar__col-head">
                  <h3>{isEs ? 'Días' : 'Days'}</h3>
                  <span>{isEs ? 'Toca para saltar' : 'Tap to jump'}</span>
                </div>
                <ul className="wl-prog-bar__days">
                  {dayRows.map((row) => {
                    const active = row.dayNumber === selectedDay;
                    return (
                      <li key={row.dayNumber}>
                        <button
                          type="button"
                          className={`wl-prog-bar__day-row${active ? ' is-active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDay?.(row.dayNumber);
                          }}
                          aria-current={active ? 'true' : undefined}
                        >
                          <span className="wl-prog-bar__day-name">{row.label}</span>
                          <span className="wl-prog-bar__day-track" aria-hidden>
                            <span
                              className="wl-prog-bar__day-fill"
                              style={{ width: `${Math.max(row.tonnage > 0 ? 6 : 0, row.pct)}%` }}
                            />
                          </span>
                          <span className="wl-prog-bar__day-meta">
                            <strong>{formatStatsKg(row.tonnage)}</strong>
                            {row.share > 0 ? <em>{row.share}%</em> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {zones.some((z) => z.volumePct > 0) ? (
                <div className="wl-prog-bar__col">
                  <div className="wl-prog-bar__col-head">
                    <h3>{isEs ? 'Estímulo' : 'Stimulus'}</h3>
                    <span>&lt;70 · 70–85 · &gt;85</span>
                  </div>
                  <div className="wl-prog-bar__zones" role="img" aria-label="zones">
                    {zones.map((z) =>
                      z.volumePct > 0 ? (
                        <span
                          key={z.zone}
                          className="wl-prog-bar__zone-seg"
                          style={{
                            flexGrow: z.volumePct,
                            background: ZONE_COLOR[z.zone],
                          }}
                          title={`${scienceZoneLabel(z.zone, isEs)} ${z.volumePct}%`}
                        />
                      ) : null,
                    )}
                  </div>
                  <ul className="wl-prog-bar__zone-legend">
                    {zones.map((z) => (
                      <li key={z.zone}>
                        <i style={{ background: ZONE_COLOR[z.zone] }} aria-hidden />
                        <span>{scienceZoneLabel(z.zone, isEs)}</span>
                        <strong>{z.volumePct > 0 ? `${z.volumePct}%` : '—'}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};
