import React, { useId, useMemo } from 'react';
import { Clock, Dumbbell, Layers } from 'lucide-react';
import type { Athlete, Exercise, Session } from '../../models/training';
import {
  estimateSessionMinutes,
  sessionAvgIntensity,
  sessionTotalReps,
  sessionTotalSets,
  sessionTonnage,
} from './blockMetrics';
import {
  purposeLabel,
  purposePct,
  sessionExerciseVolumes,
  sessionPurposeBreakdown,
  sessionWarmupSetCount,
  sessionWorkExerciseCount,
  type SetPurpose,
} from './sessionSummaryMetrics';

export interface SessionSheetSummaryProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  variant?: 'compact' | 'expanded';
  maxExerciseSlices?: number;
}

const PURPOSE_ORDER: SetPurpose[] = ['technique', 'work', 'intensity'];

function truncateLabel(label: string, max = 22): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

function IntensityRing({ pct, label }: { pct: number; label: string }) {
  const size = 46;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="wolf-se-day-summary__ring" aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="wolf-se-day-summary__ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="wolf-se-day-summary__ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="wolf-se-day-summary__ring-value">{label}</span>
    </div>
  );
}

export const SessionSheetSummary: React.FC<SessionSheetSummaryProps> = ({
  session,
  athlete,
  exercises,
  isEs,
  variant = 'compact',
  maxExerciseSlices,
}) => {
  const purposeBarId = useId();
  const volumeBarId = useId();
  const isExpanded = variant === 'expanded';
  const exerciseSliceLimit = maxExerciseSlices ?? (isExpanded ? 12 : 4);
  const labelMaxLen = isExpanded ? 40 : 22;

  const metrics = useMemo(() => {
    const blocks = session.exercises;
    const tonnage = sessionTonnage(session, athlete, exercises);
    const sets = sessionTotalSets(blocks);
    const reps = sessionTotalReps(blocks);
    const avgPct = sessionAvgIntensity(blocks);
    const minutes = estimateSessionMinutes(session);
    const purpose = sessionPurposeBreakdown(blocks);
    const exerciseVolumes = sessionExerciseVolumes(blocks, athlete, exercises, exerciseSliceLimit);
    const workExercises = sessionWorkExerciseCount(blocks);
    const warmupSets = sessionWarmupSetCount(blocks);

    return {
      tonnage,
      sets,
      reps,
      avgPct,
      minutes,
      purpose,
      exerciseVolumes,
      workExercises,
      warmupSets,
      exerciseCount: blocks.length,
    };
  }, [session, athlete, exercises, exerciseSliceLimit]);

  const purposeSegments = PURPOSE_ORDER.map((key) => ({
    key,
    label: purposeLabel(key, isEs),
    sets: metrics.purpose[key],
    pct: purposePct(metrics.purpose, key),
  })).filter((segment) => segment.sets > 0);

  const hasPurposeData = metrics.purpose.total > 0;
  const hasVolumeData = metrics.exerciseVolumes.length > 0;
  const isEmpty = metrics.exerciseCount === 0;

  return (
    <div
      className={`wolf-se-spreadsheet__summary wolf-se-day-summary${isEmpty ? ' wolf-se-day-summary--empty' : ''}${isExpanded ? ' wolf-se-day-summary--expanded' : ''}`}
      role="region"
      aria-label={isEs ? 'Resumen del día' : 'Day summary'}
    >
      <div className="wolf-se-day-summary__hero">
        <div className="wolf-se-day-summary__hero-top">
          <span className="wolf-se-day-summary__eyebrow">
            <Dumbbell size={13} aria-hidden />
            {isEs ? 'Volumen del día' : 'Day volume'}
          </span>
          <strong className="wolf-se-day-summary__volume">
            {metrics.tonnage > 0 ? `${metrics.tonnage.toLocaleString()} kg` : '—'}
          </strong>
        </div>
        <div className="wolf-se-day-summary__chips" aria-label={isEs ? 'Totales del día' : 'Day totals'}>
          <span className="wolf-se-day-summary__chip">
            <Layers size={12} aria-hidden />
            {metrics.sets} {isEs ? 'series' : 'sets'}
          </span>
          <span className="wolf-se-day-summary__chip">
            {metrics.reps} reps
          </span>
          <span className="wolf-se-day-summary__chip">
            {metrics.exerciseCount} {isEs ? (metrics.exerciseCount === 1 ? 'ejercicio' : 'ejercicios') : metrics.exerciseCount === 1 ? 'exercise' : 'exercises'}
          </span>
          {metrics.warmupSets > 0 ? (
            <span className="wolf-se-day-summary__chip wolf-se-day-summary__chip--warmup">
              {metrics.warmupSets} {isEs ? 'ser. calent.' : 'warm-up sets'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="wolf-se-day-summary__panel wolf-se-day-summary__panel--purpose">
        <div className="wolf-se-day-summary__panel-head">
          <span className="wolf-se-day-summary__panel-title">
            {isEs ? 'Intensidad' : 'Intensity'}
          </span>
          <span className="wolf-se-day-summary__panel-meta">
            {isEs ? 'por series' : 'by sets'}
          </span>
        </div>
        <div className="wolf-se-day-summary__purpose-body">
          <IntensityRing pct={metrics.avgPct} label={`${metrics.avgPct}%`} />
          <div className="wolf-se-day-summary__purpose-chart">
            {hasPurposeData ? (
              <>
                <div
                  id={purposeBarId}
                  className="wolf-se-day-summary__stack"
                  role="img"
                  aria-label={
                    isEs
                      ? `Distribución: ${purposeSegments.map((s) => `${s.label} ${s.pct}%`).join(', ')}`
                      : `Distribution: ${purposeSegments.map((s) => `${s.label} ${s.pct}%`).join(', ')}`
                  }
                >
                  {purposeSegments.map((segment) => (
                    <span
                      key={segment.key}
                      className={`wolf-se-day-summary__stack-seg wolf-se-day-summary__stack-seg--${segment.key}`}
                      style={{ flexGrow: segment.sets, flexBasis: `${segment.pct}%` }}
                      title={`${segment.label}: ${segment.sets} ${isEs ? 'series' : 'sets'} (${segment.pct}%)`}
                    />
                  ))}
                </div>
                <ul className="wolf-se-day-summary__legend" aria-hidden>
                  {purposeSegments.map((segment) => (
                    <li key={segment.key}>
                      <span className={`wolf-se-day-summary__legend-dot wolf-se-day-summary__legend-dot--${segment.key}`} />
                      <span>{segment.label}</span>
                      <strong>{segment.pct}%</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="wolf-se-day-summary__empty-note">
                {isEs ? 'Sin series prescritas' : 'No prescribed sets'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="wolf-se-day-summary__panel wolf-se-day-summary__panel--load">
        <div className="wolf-se-day-summary__panel-head">
          <span className="wolf-se-day-summary__panel-title">
            {isEs ? 'Carga por ejercicio' : 'Load by exercise'}
          </span>
          <span className="wolf-se-day-summary__panel-meta">
            {metrics.workExercises} {isEs ? 'de trabajo' : 'working'}
          </span>
        </div>
        {hasVolumeData ? (
          <ul
            id={volumeBarId}
            className="wolf-se-day-summary__bars"
            aria-label={isEs ? 'Distribución de volumen por ejercicio' : 'Volume distribution by exercise'}
          >
            {metrics.exerciseVolumes.map((slice) => (
              <li key={slice.label} className="wolf-se-day-summary__bar-row">
                <span className="wolf-se-day-summary__bar-label" title={slice.label}>
                  {truncateLabel(slice.label, labelMaxLen)}
                </span>
                <div className="wolf-se-day-summary__bar-track" aria-hidden>
                  <span
                    className="wolf-se-day-summary__bar-fill"
                    style={{ width: `${Math.max(slice.pct, 6)}%` }}
                  />
                </div>
                <span className="wolf-se-day-summary__bar-value">
                  {slice.tonnage.toLocaleString()} kg
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="wolf-se-day-summary__empty-note">
            {isEs ? 'Añade ejercicios para ver la distribución' : 'Add exercises to see distribution'}
          </p>
        )}
      </div>

      <div className="wolf-se-day-summary__time" aria-label={isEs ? 'Tiempo estimado' : 'Estimated time'}>
        <Clock size={14} aria-hidden />
        <span className="wolf-se-day-summary__time-label">{isEs ? 'Tiempo est.' : 'Est. time'}</span>
        <strong>
          {metrics.minutes}–{metrics.minutes + 15} min
        </strong>
      </div>
    </div>
  );
};
