import type { Athlete, Exercise, Session } from '../../models/training';
import { purposePct, type ExerciseVolumeSlice, type SessionPurposeBreakdown } from './sessionSummaryMetrics';
import { evaluateDayVerdict, type DayVerdict } from './programStatsVerdict';
import type { WeekDayMetricRow } from './programWeekStats';
import type { ProgramWeekMetricRow } from './programAggregateStats';

export type InsightTone = 'neutral' | 'positive' | 'caution' | 'info';

export interface StatsInsight {
  id: string;
  text: string;
  tone: InsightTone;
}

function dominantPurpose(purpose: SessionPurposeBreakdown): 'technique' | 'work' | 'intensity' | null {
  if (purpose.total <= 0) return null;
  const entries: Array<['technique' | 'work' | 'intensity', number]> = [
    ['technique', purpose.technique],
    ['work', purpose.work],
    ['intensity', purpose.intensity],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? null;
}

export function buildDayInsights(params: {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  purpose: SessionPurposeBreakdown;
  exerciseVolumes: ExerciseVolumeSlice[];
  avgPct: number;
  verdict?: DayVerdict;
}): StatsInsight[] {
  const { isEs, purpose, exerciseVolumes, avgPct } = params;
  const insights: StatsInsight[] = [];
  const verdict = params.verdict ?? evaluateDayVerdict(params.session, params.athlete, params.exercises, isEs);

  if (verdict.tone === 'empty') {
    return [
      {
        id: 'empty',
        text: verdict.message,
        tone: 'neutral',
      },
    ];
  }

  const top2 = exerciseVolumes.slice(0, 2);
  const top2Pct = top2.reduce((sum, row) => sum + row.pct, 0);
  if (top2.length >= 2 && top2Pct >= 55) {
    insights.push({
      id: 'concentration',
      text: isEs
        ? `El ${top2Pct}% del volumen está en los primeros dos ejercicios.`
        : `${top2Pct}% of volume sits in the top two exercises.`,
      tone: top2Pct >= 70 ? 'caution' : 'info',
    });
  } else if (top2[0] && top2[0].pct >= 40) {
    insights.push({
      id: 'dominant-lift',
      text: isEs
        ? `${top2[0].label} concentra el ${top2[0].pct}% del volumen del día.`
        : `${top2[0].label} holds ${top2[0].pct}% of today’s volume.`,
      tone: 'info',
    });
  }

  if (avgPct > 0) {
    if (avgPct >= 85) {
      insights.push({
        id: 'intensity-high',
        text: isEs
          ? `Intensidad media alta (${avgPct}% 1RM). Prioriza recuperación entre bloques.`
          : `High average intensity (${avgPct}% 1RM). Prioritize recovery between blocks.`,
        tone: 'caution',
      });
    } else if (avgPct <= 72) {
      insights.push({
        id: 'intensity-tech',
        text: isEs
          ? `Intensidad media moderada (${avgPct}% 1RM) — rango típico de trabajo técnico.`
          : `Moderate average intensity (${avgPct}% 1RM) — typical technical work range.`,
        tone: 'positive',
      });
    } else {
      insights.push({
        id: 'intensity-ok',
        text: isEs
          ? `Intensidad media dentro del rango esperado (${avgPct}% 1RM).`
          : `Average intensity within expected range (${avgPct}% 1RM).`,
        tone: 'positive',
      });
    }
  }

  insights.push({
    id: 'verdict',
    text: isEs ? `Estado: ${verdict.title}. ${verdict.message}` : `Status: ${verdict.title}. ${verdict.message}`,
    tone:
      verdict.tone === 'heavy' || verdict.tone === 'light'
        ? 'caution'
        : verdict.tone === 'optimal'
          ? 'positive'
          : 'info',
  });

  const dom = dominantPurpose(purpose);
  if (dom === 'technique' && purposePct(purpose, 'technique') >= 45) {
    insights.push({
      id: 'intent-tech',
      text: isEs
        ? 'Prioriza fuerza técnica y calidad de movimiento.'
        : 'Prioritize technical strength and movement quality.',
      tone: 'info',
    });
  } else if (dom === 'intensity' && purposePct(purpose, 'intensity') >= 40) {
    insights.push({
      id: 'intent-int',
      text: isEs
        ? 'La sesión enfatiza intensidad; cuida fatiga acumulada.'
        : 'Session emphasizes intensity; watch accumulated fatigue.',
      tone: 'caution',
    });
  }

  return insights.slice(0, 4);
}

export function buildWeekInsights(params: {
  isEs: boolean;
  dayRows: WeekDayMetricRow[];
  purpose: SessionPurposeBreakdown;
  avgPct: number;
}): StatsInsight[] {
  const { isEs, dayRows, purpose, avgPct } = params;
  const insights: StatsInsight[] = [];
  const active = dayRows.filter((d) => d.tonnage > 0);

  if (active.length === 0) {
    return [
      {
        id: 'week-empty',
        text: isEs ? 'No hay volumen programado esta semana.' : 'No volume programmed this week.',
        tone: 'neutral',
      },
    ];
  }

  const peak = active.reduce((best, row) => (row.tonnage > best.tonnage ? row : best), active[0]!);
  insights.push({
    id: 'peak-day',
    text: isEs
      ? `${peak.label} concentra la mayor carga (${peak.sharePct}% de la semana).`
      : `${peak.label} carries the heaviest load (${peak.sharePct}% of the week).`,
    tone: peak.sharePct >= 40 ? 'caution' : 'info',
  });

  const avg = active.reduce((sum, row) => sum + row.tonnage, 0) / active.length;
  const balanceRatio = avg > 0 ? peak.tonnage / avg : 1;
  if (balanceRatio >= 1.6) {
    insights.push({
      id: 'balance-off',
      text: isEs
        ? 'Volumen semanal desbalanceado: un día muy por encima del promedio.'
        : 'Weekly volume is unbalanced: one day sits well above the average.',
      tone: 'caution',
    });
  } else {
    insights.push({
      id: 'balance-ok',
      text: isEs
        ? 'Volumen semanal equilibrado entre los días programados.'
        : 'Weekly volume is balanced across programmed days.',
      tone: 'positive',
    });
  }

  if (active.length >= 3) {
    const first = active.slice(0, Math.ceil(active.length / 2));
    const second = active.slice(Math.ceil(active.length / 2));
    const firstAvg = first.reduce((s, r) => s + r.avgPct, 0) / first.length;
    const secondAvg = second.reduce((s, r) => s + r.avgPct, 0) / second.length;
    const delta = Math.round(secondAvg - firstAvg);
    if (Math.abs(delta) >= 3) {
      insights.push({
        id: 'intensity-trend',
        text:
          delta > 0
            ? isEs
              ? `La intensidad sube hacia el final de la semana (+${delta} pts).`
              : `Intensity rises toward the end of the week (+${delta} pts).`
            : isEs
              ? `La intensidad baja hacia el final de la semana (${delta} pts).`
              : `Intensity eases toward the end of the week (${delta} pts).`,
        tone: 'info',
      });
    } else if (avgPct > 0) {
      insights.push({
        id: 'intensity-stable',
        text: isEs
          ? `Intensidad semanal estable (media ${avgPct}% 1RM).`
          : `Weekly intensity is stable (avg ${avgPct}% 1RM).`,
        tone: 'positive',
      });
    }
  }

  const tech = purposePct(purpose, 'technique');
  if (tech >= 40) {
    insights.push({
      id: 'week-tech',
      text: isEs
        ? `${tech}% de series técnicas en la semana — buen bloque de calidad.`
        : `${tech}% technique sets this week — solid quality block.`,
      tone: 'info',
    });
  }

  return insights.slice(0, 4);
}

export function buildProgramInsights(params: {
  isEs: boolean;
  weekRows: ProgramWeekMetricRow[];
  purpose: SessionPurposeBreakdown;
  exerciseVolumes: ExerciseVolumeSlice[];
  avgPct: number;
}): StatsInsight[] {
  const { isEs, weekRows, purpose, exerciseVolumes, avgPct } = params;
  const insights: StatsInsight[] = [];
  const active = weekRows.filter((w) => w.tonnage > 0);

  if (active.length === 0) {
    return [
      {
        id: 'program-empty',
        text: isEs ? 'El programa aún no tiene volumen calculable.' : 'Program has no calculable volume yet.',
        tone: 'neutral',
      },
    ];
  }

  if (active.length >= 2) {
    const first = active[0]!;
    const last = active[active.length - 1]!;
    if (first.tonnage > 0) {
      const deltaPct = Math.round(((last.tonnage - first.tonnage) / first.tonnage) * 100);
      if (Math.abs(deltaPct) >= 5) {
        insights.push({
          id: 'volume-progression',
          text:
            deltaPct > 0
              ? isEs
                ? `Progresión de volumen: +${deltaPct}% ${first.label}→${last.label}.`
                : `Volume progression: +${deltaPct}% ${first.label}→${last.label}.`
              : isEs
                ? `Volumen baja ${Math.abs(deltaPct)}% de ${first.label} a ${last.label}.`
                : `Volume drops ${Math.abs(deltaPct)}% from ${first.label} to ${last.label}.`,
          tone: deltaPct > 0 ? 'positive' : 'caution',
        });
      } else {
        insights.push({
          id: 'volume-stable',
          text: isEs
            ? `Volumen estable a lo largo del bloque (${first.label}→${last.label}).`
            : `Volume stays stable across the block (${first.label}→${last.label}).`,
          tone: 'positive',
        });
      }
    }
  }

  const peak = active.reduce((best, row) => (row.tonnage > best.tonnage ? row : best), active[0]!);
  insights.push({
    id: 'peak-week',
    text: isEs
      ? `${peak.label} es el pico de carga (${peak.sharePct}% del programa).`
      : `${peak.label} is the peak load week (${peak.sharePct}% of the program).`,
    tone: 'info',
  });

  if (avgPct > 0) {
    insights.push({
      id: 'block-intensity',
      text: isEs
        ? `Intensidad media del bloque: ${avgPct}% 1RM.`
        : `Block average intensity: ${avgPct}% 1RM.`,
      tone: avgPct >= 85 ? 'caution' : 'positive',
    });
  }

  const top = exerciseVolumes[0];
  if (top && top.pct >= 18) {
    insights.push({
      id: 'dominant-lifts',
      text: isEs
        ? `Dominan ${exerciseVolumes
            .slice(0, 2)
            .map((e) => e.label)
            .join(' / ')} en el mesociclo.`
        : `Dominated by ${exerciseVolumes
            .slice(0, 2)
            .map((e) => e.label)
            .join(' / ')} across the mesocycle.`,
      tone: 'info',
    });
  }

  const intPct = purposePct(purpose, 'intensity');
  if (intPct >= 35) {
    insights.push({
      id: 'program-intensity-share',
      text: isEs
        ? `${intPct}% de series de intensidad en el programa.`
        : `${intPct}% intensity sets across the program.`,
      tone: 'info',
    });
  }

  return insights.slice(0, 4);
}

export function purposeIntentLine(
  purpose: SessionPurposeBreakdown,
  isEs: boolean,
): string | undefined {
  const dom = dominantPurpose(purpose);
  if (!dom || purpose.total <= 0) return undefined;
  const pct = purposePct(purpose, dom);
  if (dom === 'technique') {
    return isEs ? `Prioriza fuerza técnica (${pct}% series)` : `Prioritizes technical strength (${pct}% sets)`;
  }
  if (dom === 'intensity') {
    return isEs ? `Enfatiza intensidad (${pct}% series)` : `Emphasizes intensity (${pct}% sets)`;
  }
  return isEs ? `Enfoque de trabajo (${pct}% series)` : `Work-focused session (${pct}% sets)`;
}
