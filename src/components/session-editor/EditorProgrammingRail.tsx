import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BarChart3, ChevronRight, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek } from '../../models/training';
import { computeWeekAggregateMetrics } from './programWeekStats';
import { formatStatsKg } from './statsTonnage';
import {
  computeSessionScienceSummary,
  computeWeekScience,
  scienceZoneLabel,
  type ScienceZoneId,
} from './programScienceStats';
import { buildWeekInsights, pickHeroInsight } from './statsInsights';
import './editor-programming-rail.css';

const STORAGE_KEY = 'wolf_editor_stats_rail_open';

export interface EditorProgrammingRailProps {
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  weekNumber: number;
  selectedDay: number;
  weekData?: ProgramWeek;
  program: GeneratedProgram;
  previousWeekData?: ProgramWeek;
  onSelectDay?: (dayNumber: number) => void;
  /** Force overlay mode (narrow viewports) */
  overlay?: boolean;
}

const ZONE_COLOR: Record<ScienceZoneId, string> = {
  Tecnica_Velocidad: 'var(--stats-blue, #2563eb)',
  Acumulacion_Tension: 'var(--stats-green, #059669)',
  Potencia_Neural: 'var(--stats-orange, #ff7a00)',
};

function readOpenPreference(defaultOpen: boolean): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return defaultOpen;
    return raw === '1';
  } catch {
    return defaultOpen;
  }
}

/**
 * Compact secondary sidebar: essential programming feedback while editing.
 * Collapses to a slim edge rail; expands with width animation.
 */
export const EditorProgrammingRail: React.FC<EditorProgrammingRailProps> = ({
  athlete,
  exercises,
  isEs,
  weekNumber,
  selectedDay,
  weekData,
  program,
  previousWeekData,
  onSelectDay,
  overlay = false,
}) => {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(() => readOpenPreference(!overlay));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  // On overlay/narrow, start closed when mode flips to overlay
  useEffect(() => {
    if (overlay) setOpen(false);
  }, [overlay]);

  const metrics = useMemo(
    () => computeWeekAggregateMetrics(weekData, athlete, exercises, isEs, 6),
    [weekData, athlete, exercises, isEs],
  );

  const science = useMemo(
    () => computeWeekScience(program, weekNumber, athlete, exercises, null),
    [program, weekNumber, athlete, exercises],
  );

  const prevScience = useMemo(() => {
    if (!previousWeekData || weekNumber <= 1) return null;
    return computeWeekScience(program, weekNumber - 1, athlete, exercises, null);
  }, [previousWeekData, program, weekNumber, athlete, exercises]);

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

  const insights = useMemo(
    () =>
      buildWeekInsights({
        isEs,
        dayRows: metrics.dayRows,
        purpose: metrics.purpose,
        avgPct: science?.summary.intensityWeighted ?? metrics.avgPct,
        prevWeekTonnage: prevScience?.summary.tonnage,
        prevWeekAvgPct: prevScience?.summary.intensityWeighted,
        weekTonnage: science?.summary.tonnage ?? metrics.tonnage,
      }),
    [isEs, metrics, science, prevScience],
  );

  const hero = useMemo(() => pickHeroInsight(insights), [insights]);

  const volume = science?.summary.tonnage ?? metrics.tonnage;
  const imp = science?.summary.intensityWeighted ?? metrics.avgPct;
  const tl = science?.summary.trainingLoad ?? 0;
  const ramp = science?.fatigue.rampRate;
  const zones = science?.stimulusDistribution ?? [];

  const toggle = () => setOpen((v) => !v);

  const panelBody = (
    <div className="wl-prog-rail__body">
      <header className="wl-prog-rail__head">
        <div className="wl-prog-rail__titles">
          <p className="wl-prog-rail__eyebrow">
            {isEs ? 'Lo que estás programando' : 'What you’re programming'}
          </p>
          <h2 className="wl-prog-rail__title">
            {isEs ? `Semana ${weekNumber}` : `Week ${weekNumber}`}
            <span className="wl-prog-rail__day">
              · {isEs ? `Día ${selectedDay}` : `Day ${selectedDay}`}
            </span>
          </h2>
        </div>
        <button
          type="button"
          className="wl-prog-rail__icon-btn"
          onClick={toggle}
          aria-expanded={open}
          aria-label={isEs ? 'Ocultar panel' : 'Hide panel'}
          title={isEs ? 'Ocultar' : 'Hide'}
        >
          <PanelRightClose size={18} strokeWidth={2.25} aria-hidden />
        </button>
      </header>

      <div className="wl-prog-rail__kpis" aria-label={isEs ? 'Resumen semanal' : 'Week summary'}>
        <div className="wl-prog-rail__kpi wl-prog-rail__kpi--accent">
          <span className="wl-prog-rail__kpi-label">{isEs ? 'Volumen' : 'Volume'}</span>
          <strong className="wl-prog-rail__kpi-value">{formatStatsKg(volume)}</strong>
          {ramp != null ? (
            <span className={`wl-prog-rail__kpi-delta${ramp > 0 ? ' is-up' : ramp < 0 ? ' is-down' : ''}`}>
              {ramp > 0 ? '+' : ''}
              {ramp}% {isEs ? 'vs ant.' : 'vs prev'}
            </span>
          ) : (
            <span className="wl-prog-rail__kpi-delta">{isEs ? 'Carga prescrita' : 'Prescribed'}</span>
          )}
        </div>
        <div className="wl-prog-rail__kpi">
          <span className="wl-prog-rail__kpi-label">IMP</span>
          <strong className="wl-prog-rail__kpi-value">{imp > 0 ? `${imp}%` : '—'}</strong>
          <span className="wl-prog-rail__kpi-delta">
            {dayScience && dayScience.intensityWeighted > 0
              ? isEs
                ? `Día ${dayScience.intensityWeighted}%`
                : `Day ${dayScience.intensityWeighted}%`
              : isEs
                ? 'Ponderada'
                : 'Weighted'}
          </span>
        </div>
        <div className="wl-prog-rail__kpi">
          <span className="wl-prog-rail__kpi-label">{isEs ? 'Carga (AU)' : 'Load (AU)'}</span>
          <strong className="wl-prog-rail__kpi-value">{tl > 0 ? tl : '—'}</strong>
          <span className="wl-prog-rail__kpi-delta">
            {dayScience && dayScience.trainingLoad > 0
              ? isEs
                ? `Día ${dayScience.trainingLoad}`
                : `Day ${dayScience.trainingLoad}`
              : 'Σ sets×reps×%'}
          </span>
        </div>
      </div>

      <section className="wl-prog-rail__section" aria-label={isEs ? 'Carga por día' : 'Load by day'}>
        <div className="wl-prog-rail__section-head">
          <h3>{isEs ? 'Días de la semana' : 'Days this week'}</h3>
          <span>{isEs ? 'Toca para saltar' : 'Tap to jump'}</span>
        </div>
        <ul className="wl-prog-rail__days">
          {dayRows.map((row) => {
            const active = row.dayNumber === selectedDay;
            return (
              <li key={row.dayNumber}>
                <button
                  type="button"
                  className={`wl-prog-rail__day-row${active ? ' is-active' : ''}`}
                  onClick={() => onSelectDay?.(row.dayNumber)}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="wl-prog-rail__day-label">{row.label}</span>
                  <span className="wl-prog-rail__day-track" aria-hidden>
                    <span
                      className="wl-prog-rail__day-fill"
                      style={{ width: `${Math.max(row.tonnage > 0 ? 6 : 0, row.pct)}%` }}
                    />
                  </span>
                  <span className="wl-prog-rail__day-meta">
                    <strong>{formatStatsKg(row.tonnage)}</strong>
                    {row.share > 0 ? <em>{row.share}%</em> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {zones.some((z) => z.volumePct > 0) ? (
        <section className="wl-prog-rail__section" aria-label={isEs ? 'Zonas' : 'Zones'}>
          <div className="wl-prog-rail__section-head">
            <h3>{isEs ? 'Estímulo' : 'Stimulus'}</h3>
            <span>&lt;70 · 70–85 · &gt;85</span>
          </div>
          <div className="wl-prog-rail__zones" role="img" aria-label="zones">
            {zones.map((z) =>
              z.volumePct > 0 ? (
                <span
                  key={z.zone}
                  className="wl-prog-rail__zone-seg"
                  style={{
                    flexGrow: z.volumePct,
                    background: ZONE_COLOR[z.zone],
                  }}
                  title={`${scienceZoneLabel(z.zone, isEs)} ${z.volumePct}%`}
                />
              ) : null,
            )}
          </div>
          <ul className="wl-prog-rail__zone-legend">
            {zones.map((z) => (
              <li key={z.zone}>
                <i style={{ background: ZONE_COLOR[z.zone] }} aria-hidden />
                <span>{scienceZoneLabel(z.zone, isEs)}</span>
                <strong>{z.volumePct > 0 ? `${z.volumePct}%` : '—'}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hero ? (
        <div className={`wl-prog-rail__insight wl-prog-rail__insight--${hero.tone}`} role="status">
          <p className="wl-prog-rail__insight-title">{hero.title}</p>
          {hero.action ? <p className="wl-prog-rail__insight-action">{hero.action}</p> : null}
        </div>
      ) : null}
    </div>
  );

  const collapsedStrip = (
    <button
      type="button"
      className="wl-prog-rail__collapsed"
      onClick={toggle}
      aria-expanded={false}
      aria-label={isEs ? 'Mostrar estadísticas de programación' : 'Show programming stats'}
    >
      <PanelRightOpen size={18} strokeWidth={2.25} aria-hidden />
      <span className="wl-prog-rail__collapsed-label">
        {isEs ? 'Stats' : 'Stats'}
      </span>
      <span className="wl-prog-rail__collapsed-peek">
        <BarChart3 size={14} aria-hidden />
        {formatStatsKg(volume)}
      </span>
      <ChevronRight size={16} className="wl-prog-rail__collapsed-chevron" aria-hidden />
    </button>
  );

  const duration = reduceMotion ? 0 : 0.32;
  const ease = [0.22, 1, 0.36, 1] as const;

  if (overlay) {
    return (
      <>
        <button
          type="button"
          className={`wl-prog-rail__fab${open ? ' is-open' : ''}`}
          onClick={toggle}
          aria-expanded={open}
          aria-controls="wl-prog-rail-panel"
          aria-label={isEs ? 'Estadísticas de programación' : 'Programming stats'}
        >
          <BarChart3 size={20} strokeWidth={2.25} aria-hidden />
        </button>
        <AnimatePresence>
          {open ? (
            <>
              <motion.button
                type="button"
                key="scrim"
                className="wl-prog-rail__scrim"
                aria-label={isEs ? 'Cerrar' : 'Close'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration * 0.8 }}
                onClick={toggle}
              />
              <motion.aside
                id="wl-prog-rail-panel"
                key="panel"
                className="wl-prog-rail wl-prog-rail__panel wl-prog-rail__panel--drawer"
                role="complementary"
                aria-label={isEs ? 'Estadísticas de la semana' : 'Week statistics'}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration, ease }}
              >
                {panelBody}
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.aside
      className={`wl-prog-rail wl-prog-rail--dock${open ? ' is-open' : ' is-collapsed'}`}
      role="complementary"
      aria-label={isEs ? 'Estadísticas de la semana' : 'Week statistics'}
      initial={false}
      animate={{
        width: open ? 312 : 52,
      }}
      transition={{ duration, ease }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.div
            key="open"
            className="wl-prog-rail__panel"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: duration * 0.85, ease }}
          >
            {panelBody}
          </motion.div>
        ) : (
          <motion.div
            key="closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration * 0.6 }}
          >
            {collapsedStrip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
};
