import React, { useEffect, useId, useMemo, useState } from 'react';

import {

  scienceZoneLabel,
  scienceZoneLabelShort,

  type ScienceZoneId,

  type ScienceZoneSlice,

} from '../programScienceStats';



export interface ScienceDistributionBarProps {

  slices: ScienceZoneSlice[];

  isEs: boolean;

  /** Show volume % (default) or reps % */

  mode?: 'volume' | 'reps';

  /** Leyenda con reps + % volumen */

  showRepsInLegend?: boolean;

  /** Aviso si todo el volumen cae en una sola zona */

  singleZoneVolumeHint?: boolean;

  /** Entrada animada al montar / cambiar datos */

  animateOnMount?: boolean;

  /** Tooltips en donut y leyenda */

  showTooltips?: boolean;

  /** Leyenda y centro del donut con nombres cortos (panel contexto). */
  compact?: boolean;

  /** Dock: porcentaje en el centro y una línea por zona, sin aviso ni reps. */
  dense?: boolean;

}



/** Hex for conic-gradient (CSS variables in gradients are unreliable in some engines). */
const ZONE_COLORS: Record<ScienceZoneId, string> = {
  Tecnica_Velocidad: '#2563eb',
  Acumulacion_Tension: '#059669',
  Potencia_Neural: '#ff4d00',
};

const ZONE_SWATCH: Record<ScienceZoneId, string> = {
  Tecnica_Velocidad: 'var(--stats-blue, #2563eb)',
  Acumulacion_Tension: 'var(--stats-green, #059669)',
  Potencia_Neural: 'var(--stats-orange, #ff4d00)',
};



function sliceFingerprint(slices: ScienceZoneSlice[], mode: 'volume' | 'reps'): string {

  return slices.map((s) => `${s.zone}:${mode === 'volume' ? s.volumePct : s.repsPct}:${s.reps}`).join('|');

}



/** Donut for DeepSeek science zones (<70 / 70–85 / >85) — stats module only. */

export const ScienceDistributionBar: React.FC<ScienceDistributionBarProps> = ({

  slices,

  isEs,

  mode = 'volume',

  showRepsInLegend = false,

  singleZoneVolumeHint = false,

  animateOnMount = false,

  showTooltips = false,

  compact = false,

  dense = false,

}) => {

  const fingerprint = useMemo(() => sliceFingerprint(slices, mode), [slices, mode]);

  const [animGen, setAnimGen] = useState(0);

  const tooltipId = useId();



  useEffect(() => {

    if (!animateOnMount) return;

    setAnimGen((g) => g + 1);

  }, [animateOnMount, fingerprint]);



  const empty = slices.every((s) => (mode === 'volume' ? s.volumePct : s.repsPct) <= 0);



  const view = slices.map((s) => ({

    zone: s.zone,

    pct: mode === 'volume' ? s.volumePct : s.repsPct,

    volumePct: s.volumePct,

    repsPct: s.repsPct,

    reps: s.reps,

    label: scienceZoneLabel(s.zone, isEs),

    labelShort: scienceZoneLabelShort(s.zone, isEs),

    range: s.range,

  }));



  const gradientParts: string[] = [];

  let cursor = 0;

  for (const slice of view) {

    if (slice.pct <= 0) continue;

    const start = cursor;

    const end = cursor + slice.pct;

    gradientParts.push(`${ZONE_COLORS[slice.zone]} ${start}% ${end}%`);

    cursor = end;

  }



  const dominant = empty

    ? null

    : view.reduce((best, slice) => (slice.pct > best.pct ? slice : best), view[0]!);



  const ariaLabel = view.map((s) => `${s.label} ${s.pct}%`).join(', ');



  const pieTooltip = showTooltips

    ? view

        .map(

          (s) =>

            `${s.label} (${s.range}): ${s.reps} ${isEs ? 'reps' : 'reps'}, ${s.volumePct}% ${isEs ? 'vol' : 'vol'}, ${s.repsPct}% ${isEs ? 'reps' : 'reps'}`,

        )

        .join('\n')

    : undefined;



  const rootClass = [

    'wl-stats-dist',

    'wl-stats-dist--pie',

    'wl-stats-dist--science',

    compact || dense ? 'wl-stats-dist--compact' : '',

    dense ? 'wl-stats-dist--dense' : '',

    animateOnMount ? 'wl-stats-dist--animate' : '',

  ]

    .filter(Boolean)

    .join(' ');



  return (

    <div className={rootClass} data-anim={animGen}>

      {singleZoneVolumeHint && !dense && dominant && !empty && dominant.volumePct >= 99 ? (

        <p className="wl-stats-dist__single-zone-hint">

          {isEs

            ? `100% del volumen en ${compact ? dominant.labelShort : dominant.label}.`

            : `100% of volume in ${compact ? dominant.labelShort : dominant.label}.`}

        </p>

      ) : null}

      <div className="wl-stats-dist__pie-layout">

        <div

          key={animateOnMount ? `pie-${animGen}` : 'pie-static'}

          className={`wl-stats-dist__pie${empty ? ' wl-stats-dist__pie--empty' : ''}${animateOnMount && !empty ? ' wl-stats-dist__pie--enter' : ''}`}

          style={

            empty

              ? undefined

              : {

                  background: `conic-gradient(from -90deg, ${gradientParts.join(', ')})`,

                }

          }

          role="img"

          aria-label={ariaLabel}

          {...(showTooltips && pieTooltip

            ? { 'data-tooltip': pieTooltip, 'aria-describedby': tooltipId }

            : {})}

        >

          <div className="wl-stats-dist__pie-hole">

            {dominant && !empty ? (

              <>

                <strong className="wl-stats-dist__pie-value">{dominant.pct}%</strong>

                <span className="wl-stats-dist__pie-label">

                  {dense ? dominant.range : compact ? dominant.labelShort : dominant.label}

                </span>

              </>

            ) : (

              <span className="wl-stats-dist__pie-label">{isEs ? 'Sin datos' : 'No data'}</span>

            )}

          </div>

        </div>



        <ul className="wl-stats-dist__legend wl-stats-dist__legend--stacked" id={tooltipId}>

          {view.map((slice, index) => {

            const tip = showTooltips

              ? `${slice.label} · ${slice.range}\n${slice.reps} ${isEs ? 'reps' : 'reps'} · ${slice.volumePct}% ${isEs ? 'volumen' : 'volume'} · ${slice.repsPct}% ${isEs ? 'reps' : 'reps'}`

              : undefined;

            return (

              <li

                key={slice.zone}

                className={`wl-stats-dist__legend-item${slice.pct <= 0 ? ' is-zero' : ''}`}

                title={`${slice.label} · ${slice.range}`}

                style={

                  animateOnMount

                    ? ({ '--wl-stats-legend-i': index } as React.CSSProperties)

                    : undefined

                }

                {...(tip ? { 'data-tooltip': tip } : {})}

              >

                <span

                  className="wl-stats-dist__swatch"

                  style={{ background: ZONE_SWATCH[slice.zone] }}

                  aria-hidden

                />

                <span className="wl-stats-dist__legend-name">

                  {dense ? (

                    slice.range

                  ) : compact ? (

                    <>

                      {slice.labelShort}

                      <span className="wl-stats-dist__legend-range"> {slice.range}</span>

                    </>

                  ) : (

                    <>

                      {slice.label}

                      <span className="wl-stats-dist__legend-range"> {slice.range}</span>

                    </>

                  )}

                </span>

                <span className="wl-stats-dist__legend-value">

                  {empty

                    ? '—'

                    : dense

                      ? `${slice.pct}%`

                      : showRepsInLegend

                        ? compact

                          ? `${slice.reps} · ${slice.volumePct}%`

                          : `${slice.reps} ${isEs ? 'reps' : 'reps'} · ${slice.volumePct}%`

                        : `${slice.pct}%`}

                </span>

              </li>

            );

          })}

        </ul>

      </div>

    </div>

  );

};


