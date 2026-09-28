import React, { useMemo, useState } from 'react';
import type { DailyTrendChartData } from '../programChartSeries';
import { formatStatsKg } from '../statsTonnage';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartTooltip } from './ChartTooltip';
import { intensityAxisTitle, intensityMetricLabel, intensityMetricTooltip } from '../statsLabels';
import { formatAxisPct, formatVolumeTicks, niceLinearTicks, padDomain } from './chartFormat';

export interface DailyTrendChartProps {
  data: DailyTrendChartData;
  isEs: boolean;
  variant?: 'full' | 'compact' | 'context' | 'detail';
  /** Etiqueta corta de la semana de referencia (p. ej. Sem 3). */
  prevWeekLabel?: string;
}

function pctDelta(curr: number | null, prev: number | null): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  if (curr == null || prev == null || prev === 0) return null;
  const pct = ((curr - prev) / prev) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return { text: '±0%', tone: 'flat' };
  const sign = rounded > 0 ? '▲' : '▼';
  return { text: `${sign} ${Math.abs(rounded)}%`, tone: rounded > 0 ? 'up' : 'down' };
}

function absDeltaPct(curr: number | null, prev: number | null): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  if (curr == null || prev == null) return null;
  const d = Math.round((curr - prev) * 10) / 10;
  if (d === 0) return { text: '±0%', tone: 'flat' };
  const sign = d > 0 ? '▲' : '▼';
  return { text: `${sign} ${Math.abs(d)}%`, tone: d > 0 ? 'up' : 'down' };
}

/** Segmentos de polyline sin interpolar huecos (días de descanso). */
function buildSegments(values: Array<number | null>): Array<Array<{ i: number; v: number }>> {
  const segments: Array<Array<{ i: number; v: number }>> = [];
  let current: Array<{ i: number; v: number }> = [];
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v)) {
      if (current.length) {
        segments.push(current);
        current = [];
      }
      return;
    }
    current.push({ i, v: v });
  });
  if (current.length) segments.push(current);
  return segments;
}

export const DailyTrendChart: React.FC<DailyTrendChartProps> = ({
  data,
  isEs,
  variant = 'compact',
  prevWeekLabel,
}) => {
  const isDetail = variant === 'detail';
  const isContext = variant === 'context';
  const compact = variant === 'compact';
  const width = isDetail ? 920 : isContext ? 320 : compact ? 280 : 360;
  const height = isDetail ? 460 : isContext ? 228 : compact ? 188 : 240;
  const padL = isDetail ? 72 : isContext ? 46 : compact ? 42 : 52;
  const padR = isDetail ? 64 : isContext ? 44 : compact ? 40 : 48;
  const padT = isDetail ? 28 : isContext ? 18 : compact ? 16 : 20;
  const padB = isDetail ? 44 : isContext ? 32 : compact ? 28 : 36;
  const labelSize = isDetail ? 14 : isContext ? 10 : compact ? 9 : 11;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const hasData = useMemo(
    () => data.tonnage.some((v) => v != null && v > 0) || data.imp.some((v) => v != null && v > 0),
    [data],
  );

  const sessionDayCount = useMemo(
    () => data.tonnage.filter((v) => v != null).length,
    [data.tonnage],
  );

  if (!hasData || data.labels.length === 0) {
    return (
      <ChartEmptyState
        message={isEs ? 'Sin datos de tendencia diaria.' : 'No daily trend data.'}
      />
    );
  }

  if (sessionDayCount < 2) {
    return (
      <ChartEmptyState
        message={
          isEs
            ? 'Necesitas al menos 2 días con sesión para ver la tendencia.'
            : 'You need at least 2 session days to see the trend.'
        }
      />
    );
  }

  const volVals = data.tonnage.filter((v): v is number => v != null && v > 0);
  const impVals = data.imp.filter((v): v is number => v != null && v > 0);
  const volDom = padDomain(
    Math.min(...volVals, data.volumeBaseline ?? volVals[0] ?? 0),
    Math.max(...volVals, data.volumeBaseline ?? volVals[0] ?? 1),
    0.1,
  );
  const impDom = padDomain(Math.min(...impVals, 65), Math.max(...impVals, 90), 0.1);

  const n = data.labels.length;
  const xAt = (i: number) => {
    if (n <= 1) return padL + plotW / 2;
    return padL + (i / (n - 1)) * plotW;
  };
  const yVol = (v: number) => padT + plotH - ((v - volDom.min) / (volDom.max - volDom.min)) * plotH;
  const yImp = (v: number) => padT + plotH - ((v - impDom.min) / (impDom.max - impDom.min)) * plotH;

  const volTicks = niceLinearTicks(volDom.min, volDom.max, 4);
  const impTicks = niceLinearTicks(impDom.min, impDom.max, 4);
  const volTickLabels = formatVolumeTicks(volTicks, true);

  const volSegments = buildSegments(data.tonnage);
  const impSegments = buildSegments(data.imp);
  const prevVolSegments = buildSegments(data.prevTonnage);

  const prevRef = prevWeekLabel && prevWeekLabel !== '—' ? prevWeekLabel : isEs ? 'sem. ant.' : 'prev wk';

  const intensityLabel = intensityMetricLabel(isEs);
  const intensityTitle = intensityMetricTooltip(isEs);

  return (
    <div
      className={`wl-stats-daily${compact ? ' wl-stats-daily--compact' : ''}${isContext ? ' wl-stats-daily--context' : ''}${isDetail ? ' wl-stats-daily--detail' : ''}`}
    >
      <ul className="wl-stats-daily__legend" aria-hidden>
        <li className="wl-stats-daily__legend-item">
          <span className="wl-stats-daily__swatch wl-stats-daily__swatch--vol" />
          {isEs ? 'Volumen' : 'Volume'}
        </li>
        <li className="wl-stats-daily__legend-item" title={intensityTitle}>
          <span className="wl-stats-daily__swatch wl-stats-daily__swatch--imp" />
          {intensityLabel}
        </li>
        <li className="wl-stats-daily__legend-item">
          <span className="wl-stats-daily__swatch wl-stats-daily__swatch--baseline" />
          {isEs ? 'Baseline 28d' : 'Baseline 28d'}
        </li>
        <li className="wl-stats-daily__legend-item">
          <span className="wl-stats-daily__swatch wl-stats-daily__swatch--prev" />
          {isEs ? 'Semana anterior' : 'Previous week'}
        </li>
      </ul>

      <div className="wl-stats-daily__plot-wrap">
        <svg
          className="wl-stats-daily__svg"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={isEs ? 'Tendencia diaria volumen e intensidad' : 'Daily volume and intensity trend'}
          style={{ width: '100%', height: 'auto', aspectRatio: `${width} / ${height}` }}
        >
          {volTicks.map((tick) => (
            <line
              key={`grid-v-${tick}`}
              x1={padL}
              x2={padL + plotW}
              y1={yVol(tick)}
              y2={yVol(tick)}
              className="wl-stats-daily__grid"
            />
          ))}

          {data.volumeBaseline != null && data.volumeBaseline > 0 ? (
            <line
              x1={padL}
              x2={padL + plotW}
              y1={yVol(data.volumeBaseline)}
              y2={yVol(data.volumeBaseline)}
              className="wl-stats-daily__baseline"
            />
          ) : null}

          {prevVolSegments.map((seg, si) => {
            const pts = seg.map(({ i, v }) => `${xAt(i).toFixed(1)},${yVol(v).toFixed(1)}`).join(' ');
            return (
              <polyline
                key={`prev-vol-${si}`}
                fill="none"
                points={pts}
                className="wl-stats-daily__line-prev"
              />
            );
          })}

          {volSegments.map((seg, si) => {
            const pts = seg.map(({ i, v }) => `${xAt(i).toFixed(1)},${yVol(v).toFixed(1)}`).join(' ');
            return (
              <polyline
                key={`vol-${si}`}
                fill="none"
                points={pts}
                className="wl-stats-daily__line-vol"
              />
            );
          })}

          {impSegments.map((seg, si) => {
            const pts = seg.map(({ i, v }) => `${xAt(i).toFixed(1)},${yImp(v).toFixed(1)}`).join(' ');
            return (
              <polyline
                key={`imp-${si}`}
                fill="none"
                points={pts}
                className="wl-stats-daily__line-imp"
              />
            );
          })}

          {data.labels.map((_, i) => {
            const vol = data.tonnage[i];
            const imp = data.imp[i];
            return (
              <g key={`pts-${i}`}>
                {vol != null ? (
                  <circle
                    cx={xAt(i)}
                    cy={yVol(vol)}
                    r={hoverIndex === i ? 5 : 4}
                    className="wl-stats-daily__dot wl-stats-daily__dot--vol"
                  />
                ) : null}
                {imp != null ? (
                  <circle
                    cx={xAt(i)}
                    cy={yImp(imp)}
                    r={hoverIndex === i ? 5 : 4}
                    className="wl-stats-daily__dot wl-stats-daily__dot--imp"
                  />
                ) : null}
              </g>
            );
          })}

          {volTicks.map((tick, index) => (
            <text
              key={`yl-${tick}-${index}`}
              x={padL - 6}
              y={yVol(tick) + 4}
              className="wl-stats-daily__tick-label"
              textAnchor="end"
              fontSize={labelSize}
            >
              {volTickLabels[index]}
            </text>
          ))}
          {impTicks.map((tick) => (
            <text
              key={`yr-${tick}`}
              x={padL + plotW + 5}
              y={yImp(tick) + 3}
              className="wl-stats-daily__tick-label wl-stats-daily__tick-label--right"
              textAnchor="start"
              fontSize={labelSize}
            >
              {formatAxisPct(tick, 0)}
            </text>
          ))}

          {data.labels.map((label, i) => (
            <text
              key={`xl-${label}`}
              x={xAt(i)}
              y={height - 10}
              className="wl-stats-daily__x-label"
              textAnchor="middle"
              fontSize={labelSize}
            >
              {label}
            </text>
          ))}

          <text
            x={padL - 2}
            y={padT - 2}
            className="wl-stats-daily__axis-title"
            textAnchor="start"
            fontSize={Math.max(9, labelSize - 1)}
          >
            {isEs ? 'kg' : 'kg'}
          </text>
          <text
            x={padL + plotW + 2}
            y={padT - 2}
            className="wl-stats-daily__axis-title wl-stats-daily__axis-title--right"
            textAnchor="end"
            fontSize={Math.max(9, labelSize - 1)}
          >
            {intensityAxisTitle(isEs)}
          </text>

          {data.labels.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={xAt(i) - plotW / Math.max(n, 1) / 2}
              y={0}
              width={Math.max(14, plotW / Math.max(n, 1))}
              height={height}
              fill="transparent"
              className="wl-stats-daily__hit"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}
        </svg>

        {hoverIndex != null ? (
          <div className="wl-stats-daily__tooltip">
            <ChartTooltip
              title={data.labels[hoverIndex] ?? ''}
              rows={[
                {
                  label: isEs ? 'Volumen' : 'Volume',
                  value:
                    data.tonnage[hoverIndex] != null
                      ? formatStatsKg(data.tonnage[hoverIndex] as number)
                      : '—',
                  delta: pctDelta(data.tonnage[hoverIndex], data.prevTonnage[hoverIndex])?.text,
                  deltaTone: pctDelta(data.tonnage[hoverIndex], data.prevTonnage[hoverIndex])?.tone,
                },
                {
                  label: intensityLabel,
                  value:
                    data.imp[hoverIndex] != null
                      ? `${Math.round((data.imp[hoverIndex] as number) * 10) / 10}%`
                      : '—',
                  delta: absDeltaPct(data.imp[hoverIndex], data.prevImp[hoverIndex])?.text,
                  deltaTone: absDeltaPct(data.imp[hoverIndex], data.prevImp[hoverIndex])?.tone,
                },
                {
                  label: 'AU',
                  value:
                    data.au[hoverIndex] != null ? String(data.au[hoverIndex]) : '—',
                },
              ]}
              footer={
                data.prevTonnage[hoverIndex] != null
                  ? isEs
                    ? `Δ vs ${prevRef}`
                    : `Δ vs ${prevRef}`
                  : undefined
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
