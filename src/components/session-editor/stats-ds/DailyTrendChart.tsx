import React, { useEffect, useMemo, useState } from 'react';
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
  /** Índice de la barra activa (semana o día que se está editando). */
  activeIndex?: number;
  messages?: {
    empty: string;
    sparse: string;
    aria: string;
  };
  /** El viewBox sigue el ancho real del contenedor. */
  fluid?: boolean;
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
  activeIndex,
  messages,
  fluid = false,
}) => {
  const isDetail = variant === 'detail';
  const isContext = variant === 'context';
  const compact = variant === 'compact';
  const [plotNode, setPlotNode] = useState<HTMLDivElement | null>(null);
  const [plotSize, setPlotSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!fluid || !plotNode) return;
    const update = () => {
      const next = {
        w: Math.max(280, Math.round(plotNode.clientWidth)),
        h: Math.max(110, Math.round(plotNode.clientHeight)),
      };
      setPlotSize((prev) => (prev && prev.w === next.w && prev.h === next.h ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(plotNode);
    return () => observer.disconnect();
  }, [fluid, plotNode]);

  const measured = fluid && plotSize ? plotSize : null;
  const width = measured ? measured.w : isDetail ? 920 : isContext ? 300 : compact ? 280 : 360;
  const height = measured ? measured.h : isDetail ? 460 : isContext ? 156 : compact ? 188 : 240;
  const padL = fluid ? 52 : isDetail ? 72 : isContext ? 36 : compact ? 42 : 52;
  const padR = fluid ? 48 : isDetail ? 64 : isContext ? 34 : compact ? 40 : 48;
  const padT = fluid ? 18 : isDetail ? 28 : isContext ? 12 : compact ? 16 : 20;
  const padB = fluid ? 30 : isDetail ? 44 : isContext ? 26 : compact ? 28 : 36;
  const labelSize = isDetail ? 14 : fluid && width > 560 ? 12 : isContext ? 10 : compact ? 9 : 11;
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
        message={messages?.empty ?? (isEs ? 'Sin datos de tendencia diaria.' : 'No daily trend data.')}
      />
    );
  }

  if (sessionDayCount < 2) {
    return (
      <ChartEmptyState
        message={
          messages?.sparse ??
            (isEs
              ? 'Necesitas al menos 2 días con sesión para ver la tendencia.'
              : 'You need at least 2 session days to see the trend.')
        }
      />
    );
  }

  const volVals = data.tonnage.filter((v): v is number => v != null && v > 0);
  const impVals = data.imp.filter((v): v is number => v != null && v > 0);
  const volPeak = Math.max(...volVals, data.volumeBaseline ?? 0, 1);
  const volDom = { min: 0, max: volPeak * 1.12 };
  const impDom = padDomain(Math.min(...impVals, 65), Math.max(...impVals, 90), 0.1);

  const n = data.labels.length;
  const labelBudget = Math.max(2, Math.floor(plotW / (fluid ? 36 : 28)));
  const labelStep = fluid
    ? n > labelBudget
      ? Math.ceil(n / labelBudget)
      : 1
    : !isDetail && n > 8
      ? Math.ceil(n / 8)
      : 1;
  const slot = plotW / Math.max(n, 1);
  const barCap = fluid ? 42 : isContext ? 18 : isDetail ? 36 : 22;
  const barW = Math.min(barCap, slot * (fluid ? 0.5 : 0.62));
  const xAt = (i: number) => padL + slot * i + slot / 2;
  const yBase = padT + plotH;
  const yVol = (v: number) => padT + plotH - ((v - volDom.min) / (volDom.max - volDom.min)) * plotH;
  const yImp = (v: number) => padT + plotH - ((v - impDom.min) / (impDom.max - impDom.min)) * plotH;

  const volTicks = niceLinearTicks(volDom.min, volDom.max, 4);
  const impTicks = niceLinearTicks(impDom.min, impDom.max, 4);
  const volTickLabels = formatVolumeTicks(volTicks, true);

  const impSegments = buildSegments(data.imp);

  const prevRef = prevWeekLabel && prevWeekLabel !== '—' ? prevWeekLabel : isEs ? 'sem. ant.' : 'prev wk';
  const hasPrevWeek = data.prevTonnage.some((vol) => vol != null && vol > 0);

  const intensityLabel = intensityMetricLabel(isEs);
  const intensityTitle = intensityMetricTooltip(isEs);

  return (
    <div
      className={`wl-stats-daily wl-stats-daily--animate${compact ? ' wl-stats-daily--compact' : ''}${isContext ? ' wl-stats-daily--context' : ''}${isDetail ? ' wl-stats-daily--detail' : ''}`}
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
        {isContext ? null : (
          <li className="wl-stats-daily__legend-item">
            <span className="wl-stats-daily__swatch wl-stats-daily__swatch--baseline" />
            {isEs ? 'Baseline 28d' : 'Baseline 28d'}
          </li>
        )}
        {hasPrevWeek || !isContext ? (
          <li className="wl-stats-daily__legend-item wl-stats-daily__legend-item--ref">
            <span className="wl-stats-daily__swatch wl-stats-daily__swatch--prev" />
            {isEs ? 'Sem. ant.' : 'Prev. week'}
          </li>
        ) : null}
      </ul>

      <div className="wl-stats-daily__plot-wrap" ref={setPlotNode}>
        <svg
          className="wl-stats-daily__svg"
          viewBox={`0 0 ${width} ${height}`}
          width={fluid ? '100%' : width}
          height={fluid ? '100%' : height}
          preserveAspectRatio={fluid ? 'none' : 'xMidYMid meet'}
          role="img"
          aria-label={
            messages?.aria ??
            (isEs ? 'Tendencia diaria volumen e intensidad' : 'Daily volume and intensity trend')
          }
          style={
            fluid
              ? { width: '100%', height: '100%' }
              : { width: '100%', height: 'auto', aspectRatio: `${width} / ${height}` }
          }
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

          <g key={`${data.labels.join('|')}:${data.tonnage.join(',')}:${data.imp.join(',')}`}>
          {data.prevTonnage.map((vol, i) => {
            if (vol == null || vol <= 0) return null;
            const y = yVol(vol);
            const h = Math.max(1, yBase - y);
            const prevW = Math.max(5, barW * 0.58);
            return (
              <rect
                key={`bar-prev-${i}`}
                x={xAt(i) - barW / 2 - prevW * 0.48}
                y={y}
                width={prevW}
                height={h}
                rx={2}
                className="wl-stats-daily__bar wl-stats-daily__bar--prev"
                style={{ '--wl-i': i } as React.CSSProperties}
              />
            );
          })}

          {data.tonnage.map((vol, i) => {
            if (vol == null || vol <= 0) return null;
            const y = yVol(vol);
            const h = Math.max(1, yBase - y);
            return (
              <rect
                key={`bar-${i}`}
                x={xAt(i) - barW / 2}
                y={y}
                width={barW}
                height={h}
                rx={3}
                className={`wl-stats-daily__bar${hoverIndex === i ? ' is-hover' : ''}${activeIndex === i ? ' is-current' : ''}`}
                style={{ '--wl-i': i } as React.CSSProperties}
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
            const imp = data.imp[i];
            return (
              <g key={`pts-${i}`}>
                {imp != null ? (
                  <circle
                    cx={xAt(i)}
                    cy={yImp(imp)}
                    r={hoverIndex === i ? 5 : 4}
                    className="wl-stats-daily__dot wl-stats-daily__dot--imp"
                    style={{ '--wl-i': i } as React.CSSProperties}
                  />
                ) : null}
              </g>
            );
          })}
          </g>

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

          {data.labels.map((label, i) =>
            labelStep > 1 && i % labelStep !== 0 && i !== n - 1 ? null : (
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
            ),
          )}

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
