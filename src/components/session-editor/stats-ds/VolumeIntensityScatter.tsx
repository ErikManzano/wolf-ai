import React, { useMemo, useState } from 'react';
import { formatStatsKg } from '../statsTonnage';
import {
  SCATTER_ZONE_COLORS,
  scienceZoneLabel,
  type VolumeIntensityScatterPoint,
} from '../programChartSeries';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartTooltip } from './ChartTooltip';
import { formatAxisKg, formatAxisPct, niceLinearTicks, padDomain } from './chartFormat';

export interface VolumeIntensityScatterProps {
  points: VolumeIntensityScatterPoint[];
  isEs: boolean;
  variant?: 'full' | 'compact';
}

const ZONE_BANDS = [
  { key: 'technique' as const, y0: 0, y1: 70, className: 'wl-stats-scatter__zone--technique' },
  { key: 'accumulation' as const, y0: 70, y1: 85, className: 'wl-stats-scatter__zone--accumulation' },
  { key: 'neural' as const, y0: 85, y1: 100, className: 'wl-stats-scatter__zone--neural' },
];

export const VolumeIntensityScatter: React.FC<VolumeIntensityScatterProps> = ({
  points,
  isEs,
  variant = 'full',
}) => {
  const compact = variant === 'compact';
  const width = compact ? 280 : 360;
  const height = compact ? 168 : 240;
  const padL = compact ? 40 : 48;
  const padR = compact ? 10 : 14;
  const padT = compact ? 22 : 28;
  const padB = compact ? 32 : 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const [hoverId, setHoverId] = useState<string | null>(null);

  const domains = useMemo(() => {
    const vols = points.map((p) => p.tonnage).filter((v) => v > 0);
    const pcts = points.map((p) => p.avgPct).filter((v) => v > 0);
    const volMin = vols.length ? Math.min(...vols) : 0;
    const volMax = vols.length ? Math.max(...vols) : 1000;
    const pctMin = pcts.length ? Math.min(...pcts) : 65;
    const pctMax = pcts.length ? Math.max(...pcts) : 90;
    const xDom = padDomain(volMin, volMax, 0.12);
    const yDom = padDomain(
      Math.min(pctMin, 68),
      Math.max(pctMax, 88),
      0.1,
    );
    return { xDom, yDom };
  }, [points]);

  if (points.length < 2) {
    return (
      <ChartEmptyState
        message={
          isEs
            ? 'Necesitas al menos 2 días con sesión para ver la distribución.'
            : 'You need at least 2 session days to see the distribution.'
        }
      />
    );
  }

  const { xDom, yDom } = domains;
  const xAt = (vol: number) => padL + ((vol - xDom.min) / (xDom.max - xDom.min)) * plotW;
  const yAt = (pct: number) =>
    padT + plotH - ((pct - yDom.min) / (yDom.max - yDom.min)) * plotH;

  const xTicks = niceLinearTicks(xDom.min, xDom.max, compact ? 4 : 5);
  const yTicks = niceLinearTicks(yDom.min, yDom.max, compact ? 4 : 5);

  const meanVol = points.reduce((s, p) => s + p.tonnage, 0) / points.length;
  const meanImp =
    points.filter((p) => p.avgPct > 0).reduce((s, p) => s + p.avgPct, 0) /
    Math.max(points.filter((p) => p.avgPct > 0).length, 1);

  const r = compact ? 4.5 : 5.5;
  const rCurrent = compact ? 5.5 : 7;

  const hoverPt = points.find((p) => p.id === hoverId);

  const zoneLegend = (['technique', 'accumulation', 'neural'] as const).map((key) => ({
    key,
    label: scienceZoneLabel(key, isEs),
    color: SCATTER_ZONE_COLORS[key],
  }));

  return (
    <div className={`wl-stats-scatter${compact ? ' wl-stats-scatter--compact' : ''}`}>
      <ul className="wl-stats-scatter__legend wl-stats-scatter__legend--top" aria-hidden>
        {zoneLegend.map((z) => (
          <li key={z.key} className="wl-stats-scatter__legend-item">
            <span className="wl-stats-scatter__swatch" style={{ background: z.color }} />
            {z.label}
          </li>
        ))}
        <li className="wl-stats-scatter__legend-item">
          <span className="wl-stats-scatter__swatch wl-stats-scatter__swatch--ring" />
          {isEs ? 'Sem. anterior' : 'Prev week'}
        </li>
      </ul>

      <div className="wl-stats-scatter__plot-wrap">
        <svg
          className="wl-stats-scatter__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={isEs ? 'Dispersión volumen por intensidad' : 'Volume vs intensity scatter'}
        >
          {ZONE_BANDS.map((band) => {
            const yTop = yAt(Math.min(band.y1, yDom.max));
            const yBot = yAt(Math.max(band.y0, yDom.min));
            if (yBot <= yTop) return null;
            return (
              <rect
                key={band.key}
                x={padL}
                y={yTop}
                width={plotW}
                height={yBot - yTop}
                className={`wl-stats-scatter__zone ${band.className}`}
              />
            );
          })}

          {[70, 85].map((pct) => {
            if (pct < yDom.min || pct > yDom.max) return null;
            return (
              <line
                key={`zone-line-${pct}`}
                x1={padL}
                x2={padL + plotW}
                y1={yAt(pct)}
                y2={yAt(pct)}
                className="wl-stats-scatter__zone-divider"
              />
            );
          })}

          {xTicks.map((tick) => (
            <g key={`xt-${tick}`}>
              <line
                x1={xAt(tick)}
                x2={xAt(tick)}
                y1={padT + plotH}
                y2={padT + plotH + 4}
                className="wl-stats-scatter__tick"
              />
              <text
                x={xAt(tick)}
                y={height - 14}
                className="wl-stats-scatter__tick-label"
                textAnchor="middle"
              >
                {formatAxisKg(tick, compact)}
              </text>
            </g>
          ))}
          {yTicks.map((tick) => (
            <g key={`yt-${tick}`}>
              <line
                x1={padL - 4}
                x2={padL}
                y1={yAt(tick)}
                y2={yAt(tick)}
                className="wl-stats-scatter__tick"
              />
              <text
                x={padL - 6}
                y={yAt(tick) + 3}
                className="wl-stats-scatter__tick-label"
                textAnchor="end"
              >
                {formatAxisPct(tick)}
              </text>
            </g>
          ))}

          <line
            x1={padL}
            y1={padT + plotH}
            x2={padL + plotW}
            y2={padT + plotH}
            className="wl-stats-scatter__axis"
          />
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} className="wl-stats-scatter__axis" />

          <line
            x1={padL}
            x2={padL + plotW}
            y1={yAt(meanImp)}
            y2={yAt(meanImp)}
            className="wl-stats-scatter__mean-h"
          />
          <line
            x1={xAt(meanVol)}
            x2={xAt(meanVol)}
            y1={padT}
            y2={padT + plotH}
            className="wl-stats-scatter__mean-v"
          />

          {points.map((pt) => {
            if (pt.prevTonnage != null && pt.prevImp != null && pt.prevImp > 0) {
              const pcx = xAt(Math.max(pt.prevTonnage, 0));
              const pcy = yAt(pt.prevImp);
              return (
                <circle
                  key={`prev-${pt.id}`}
                  cx={pcx}
                  cy={pcy}
                  r={r}
                  className="wl-stats-scatter__dot-prev"
                />
              );
            }
            return null;
          })}

          {points.map((pt) => {
            const cx = xAt(Math.max(pt.tonnage, xDom.min));
            const cy = yAt(pt.avgPct > 0 ? pt.avgPct : yDom.min);
            const fill = SCATTER_ZONE_COLORS[pt.scienceZone];
            return (
              <circle
                key={pt.id}
                cx={cx}
                cy={cy}
                r={pt.isCurrent ? rCurrent : r}
                fill={fill}
                className={
                  pt.isCurrent ? 'wl-stats-scatter__dot is-current' : 'wl-stats-scatter__dot'
                }
                opacity={hoverId && hoverId !== pt.id ? 0.45 : 0.92}
                onMouseEnter={() => setHoverId(pt.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(pt.id)}
                onBlur={() => setHoverId(null)}
                tabIndex={0}
              />
            );
          })}

          <text
            x={padL + plotW / 2}
            y={height - 2}
            className="wl-stats-scatter__axis-title"
            textAnchor="middle"
          >
            {isEs ? 'Volumen (kg)' : 'Volume (kg)'}
          </text>
          <text
            x={8}
            y={padT + plotH / 2}
            className="wl-stats-scatter__axis-title"
            textAnchor="middle"
            transform={`rotate(-90, 8, ${padT + plotH / 2})`}
          >
            {isEs ? 'IMP (%1RM)' : 'IMP (%1RM)'}
          </text>
        </svg>

        {hoverPt ? (
          <div className="wl-stats-scatter__tooltip">
            <ChartTooltip
              title={hoverPt.label}
              rows={[
                {
                  label: isEs ? 'Volumen' : 'Volume',
                  value: formatStatsKg(hoverPt.tonnage),
                },
                {
                  label: 'IMP',
                  value: `${Math.round(hoverPt.avgPct * 10) / 10}%`,
                },
                {
                  label: 'AU',
                  value: String(hoverPt.au),
                },
                {
                  label: isEs ? 'Zona' : 'Zone',
                  value: scienceZoneLabel(hoverPt.scienceZone, isEs),
                },
              ]}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
