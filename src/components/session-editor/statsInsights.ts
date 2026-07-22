/**
 * Rule-based Wolf Insights for Estadísticas (day / week / program).
 *
 * Out of scope (by design — do not invent here):
 * - Neural vs technical load as separate metrics (no formula yet)
 * - LLM-generated insights
 * - Athlete / team / coach roster views
 */

import type { Athlete, Exercise, Session } from '../../models/training';
import { purposePct, type ExerciseVolumeSlice, type SessionPurposeBreakdown } from './sessionSummaryMetrics';
import { evaluateDayVerdict, type DayVerdict } from './programStatsVerdict';
import type { WeekDayMetricRow } from './programWeekStats';
import type { ProgramWeekMetricRow } from './programAggregateStats';

export type InsightTone = 'neutral' | 'positive' | 'caution' | 'info';

/** Actionable insight: what Wolf detected → why it matters → what to do. */
export interface StatsInsight {
  id: string;
  tone: InsightTone;
  /** Detectó — fact + number */
  title: string;
  /** Importa — stimulus implication */
  body: string;
  /** Hacer — coach action */
  action?: string;
  /** Higher = preferred as hero (default 0) */
  priority?: number;
}

function insight(
  partial: Omit<StatsInsight, 'priority'> & { priority?: number },
): StatsInsight {
  return { priority: 0, ...partial };
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

const TONE_RANK: Record<InsightTone, number> = {
  caution: 4,
  info: 3,
  positive: 2,
  neutral: 1,
};

/** Pick the single dominant insight for the hero slot. */
export function pickHeroInsight(insights: StatsInsight[]): StatsInsight | null {
  if (insights.length === 0) return null;
  return [...insights].sort((a, b) => {
    const p = (b.priority ?? 0) - (a.priority ?? 0);
    if (p !== 0) return p;
    return TONE_RANK[b.tone] - TONE_RANK[a.tone];
  })[0]!;
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
      insight({
        id: 'empty',
        tone: 'neutral',
        title: verdict.title,
        body: verdict.message,
        priority: 10,
      }),
    ];
  }

  // Verdict stays on the Estado KPI — only surface a coach action when load is off-band.
  if (verdict.tone === 'heavy') {
    insights.push(
      insight({
        id: 'load-heavy-action',
        tone: 'caution',
        title: isEs ? 'Carga por encima del rango objetivo' : 'Load above target range',
        body: isEs
          ? 'El estímulo del día empuja fatiga acumulada y puede comprometer la calidad técnica.'
          : 'Today’s stimulus pushes accumulated fatigue and can compromise technical quality.',
        action: isEs
          ? 'Baja 1–2 series de los bloques principales o reduce 2–3% la intensidad relativa.'
          : 'Drop 1–2 sets from main blocks or reduce relative intensity by 2–3%.',
        priority: 8,
      }),
    );
  } else if (verdict.tone === 'light') {
    insights.push(
      insight({
        id: 'load-light-action',
        tone: 'caution',
        title: isEs ? 'Día por debajo del rango objetivo' : 'Day below target range',
        body: isEs
          ? 'Hay margen para más estímulo sin salir del rango de calidad del atleta.'
          : 'There is room for more stimulus without leaving the athlete’s quality range.',
        action: isEs
          ? 'Añade una serie de trabajo o sube ligeramente la intensidad en el bloque principal.'
          : 'Add a work set or nudge intensity up on the main block.',
        priority: 7,
      }),
    );
  }

  const top2 = exerciseVolumes.slice(0, 2);
  const top2Pct = top2.reduce((sum, row) => sum + row.pct, 0);
  if (top2.length >= 2 && top2Pct >= 55) {
    insights.push(
      insight({
        id: 'concentration',
        tone: top2Pct >= 70 ? 'caution' : 'info',
        title: isEs
          ? `${top2Pct}% del volumen en los dos primeros ejercicios`
          : `${top2Pct}% of volume in the top two exercises`,
        body: isEs
          ? 'La sesión está muy concentrada: el resto de movimientos aportan poco al estímulo total.'
          : 'The session is highly concentrated: remaining lifts add little to total stimulus.',
        action: isEs
          ? 'Reparte volumen a un accesorio o reduce series del ejercicio dominante si buscas equilibrio.'
          : 'Shift volume to an accessory or trim sets on the dominant lift if you want balance.',
        priority: top2Pct >= 70 ? 6 : 4,
      }),
    );
  } else if (top2[0] && top2[0].pct >= 40) {
    insights.push(
      insight({
        id: 'dominant-lift',
        tone: 'info',
        title: isEs
          ? `${top2[0].label} concentra el ${top2[0].pct}% del volumen`
          : `${top2[0].label} holds ${top2[0].pct}% of volume`,
        body: isEs
          ? 'Ese ejercicio define el carácter de la sesión para el coach y el atleta.'
          : 'That lift defines the character of the session for coach and athlete.',
        action: isEs
          ? 'Protege la calidad de ese patrón; evita fatiga previa innecesaria.'
          : 'Protect quality on that pattern; avoid unnecessary prior fatigue.',
        priority: 3,
      }),
    );
  }

  if (avgPct > 0) {
    if (avgPct >= 85) {
      insights.push(
        insight({
          id: 'intensity-high',
          tone: 'caution',
          title: isEs
            ? `Intensidad media alta (${avgPct}% 1RM)`
            : `High average intensity (${avgPct}% 1RM)`,
          body: isEs
            ? 'Sesión orientada a producción de fuerza; el margen de error técnico se estrecha.'
            : 'Session leans toward force production; technical margin for error shrinks.',
          action: isEs
            ? 'Prioriza recuperación entre bloques y no acumules otro día neural igual mañana.'
            : 'Prioritize recovery between blocks and avoid stacking another similar neural day tomorrow.',
          priority: 5,
        }),
      );
    } else if (avgPct <= 72) {
      insights.push(
        insight({
          id: 'intensity-tech',
          tone: 'positive',
          title: isEs
            ? `Intensidad moderada (${avgPct}% 1RM)`
            : `Moderate intensity (${avgPct}% 1RM)`,
          body: isEs
            ? 'Sesión orientada al desarrollo técnico: hay margen para calidad de movimiento.'
            : 'Session oriented to technical development: room for movement quality.',
          action: isEs
            ? 'Usa el margen para reforzar posiciones; puedes subir intensidad en días posteriores.'
            : 'Use the margin to reinforce positions; you can raise intensity on later days.',
          priority: 2,
        }),
      );
    } else {
      insights.push(
        insight({
          id: 'intensity-ok',
          tone: 'positive',
          title: isEs
            ? `Intensidad en rango de trabajo (${avgPct}% 1RM)`
            : `Intensity in work range (${avgPct}% 1RM)`,
          body: isEs
            ? 'Equilibrio razonable entre calidad y carga — buen día de construcción.'
            : 'Reasonable balance of quality and load — a solid building day.',
          action: isEs
            ? 'Mantén la estructura; ajusta solo si el atleta llega fatigado.'
            : 'Keep the structure; adjust only if the athlete arrives fatigued.',
          priority: 1,
        }),
      );
    }
  }

  const dom = dominantPurpose(purpose);
  if (dom === 'technique' && purposePct(purpose, 'technique') >= 45) {
    insights.push(
      insight({
        id: 'intent-tech',
        tone: 'info',
        title: isEs
          ? `Prioridad técnica (${purposePct(purpose, 'technique')}% series)`
          : `Technical priority (${purposePct(purpose, 'technique')}% sets)`,
        body: isEs
          ? 'El entrenamiento prioriza velocidad y calidad de movimiento sobre producción máxima de fuerza.'
          : 'Training prioritizes speed and movement quality over maximal force production.',
        action: isEs
          ? 'Exige estándares de posición; no compenses con más kilos hoy.'
          : 'Demand position standards; do not compensate with more load today.',
        priority: 2,
      }),
    );
  } else if (dom === 'intensity' && purposePct(purpose, 'intensity') >= 40) {
    insights.push(
      insight({
        id: 'intent-int',
        tone: 'caution',
        title: isEs
          ? `Prioridad intensidad (${purposePct(purpose, 'intensity')}% series)`
          : `Intensity priority (${purposePct(purpose, 'intensity')}% sets)`,
        body: isEs
          ? 'La sesión enfatiza carga relativa alta; la fatiga acumulada importa más que el volumen total.'
          : 'Session emphasizes high relative load; accumulated fatigue matters more than total volume.',
        action: isEs
          ? 'Vigila el siguiente día: deja espacio de recuperación o baja el volumen satélite.'
          : 'Watch the next day: leave recovery room or cut satellite volume.',
        priority: 4,
      }),
    );
  }

  return insights.slice(0, 4);
}

export function buildWeekInsights(params: {
  isEs: boolean;
  dayRows: WeekDayMetricRow[];
  purpose: SessionPurposeBreakdown;
  avgPct: number;
  prevWeekTonnage?: number;
  prevWeekAvgPct?: number;
  weekTonnage?: number;
}): StatsInsight[] {
  const { isEs, dayRows, purpose, avgPct, prevWeekTonnage, prevWeekAvgPct, weekTonnage } = params;
  const insights: StatsInsight[] = [];
  const active = dayRows.filter((d) => d.tonnage > 0);

  if (active.length === 0) {
    return [
      insight({
        id: 'week-empty',
        tone: 'neutral',
        title: isEs ? 'Semana sin volumen' : 'Week has no volume',
        body: isEs
          ? 'No hay volumen programado esta semana.'
          : 'No volume programmed this week.',
        action: isEs ? 'Programa al menos un día de trabajo en el editor.' : 'Program at least one training day in the editor.',
        priority: 10,
      }),
    ];
  }

  if (
    prevWeekTonnage != null &&
    prevWeekTonnage > 0 &&
    weekTonnage != null &&
    weekTonnage > 0
  ) {
    const deltaPct = Math.round(((weekTonnage - prevWeekTonnage) / prevWeekTonnage) * 100);
    if (Math.abs(deltaPct) >= 8) {
      insights.push(
        insight({
          id: 'vs-prev-week',
          tone: deltaPct > 15 ? 'caution' : deltaPct > 0 ? 'positive' : 'info',
          title: isEs
            ? `Volumen ${deltaPct > 0 ? '+' : ''}${deltaPct}% vs semana anterior`
            : `Volume ${deltaPct > 0 ? '+' : ''}${deltaPct}% vs previous week`,
          body: isEs
            ? deltaPct > 0
              ? 'La carga semanal sube respecto al bloque previo — revisa si la progresión es intencional.'
              : 'La carga semanal baja respecto al bloque previo — útil si buscas descarga o calidad.'
            : deltaPct > 0
              ? 'Weekly load rises vs the prior block — confirm the progression is intentional.'
              : 'Weekly load drops vs the prior block — useful if you want a deload or quality week.',
          action: isEs
            ? deltaPct > 15
              ? 'Si no es un pico planificado, reparte volumen a otro día o baja 1 bloque satélite.'
              : 'Mantén la lógica de progresión; anota el motivo del cambio para el atleta.'
            : deltaPct > 15
              ? 'If this is not a planned peak, spread volume or cut one satellite block.'
              : 'Keep the progression logic; note the reason for the athlete.',
          priority: 7,
        }),
      );
    }
  }

  if (prevWeekAvgPct != null && prevWeekAvgPct > 0 && avgPct > 0) {
    const delta = Math.round(avgPct - prevWeekAvgPct);
    if (Math.abs(delta) >= 3) {
      insights.push(
        insight({
          id: 'intensity-vs-prev-week',
          tone: delta > 0 ? 'info' : 'positive',
          title: isEs
            ? `Intensidad ${delta > 0 ? '+' : ''}${delta} pts vs semana anterior`
            : `Intensity ${delta > 0 ? '+' : ''}${delta} pts vs previous week`,
          body: isEs
            ? delta > 0
              ? 'La intensidad relativa aumenta — coherente con un bloque de fuerza si el volumen no explota.'
              : 'La intensidad relativa baja — espacio para calidad técnica o acumulación de volumen.'
            : delta > 0
              ? 'Relative intensity rises — coherent with a strength block if volume stays controlled.'
              : 'Relative intensity eases — room for technical quality or volume accumulation.',
          action: isEs
            ? 'Contrasta con el día pico de la semana para no apilar dos estímulos máximos.'
            : 'Cross-check the peak day so you do not stack two maximal stimuli.',
          priority: 5,
        }),
      );
    }
  }

  const peak = active.reduce((best, row) => (row.tonnage > best.tonnage ? row : best), active[0]!);
  insights.push(
    insight({
      id: 'peak-day',
      tone: peak.sharePct >= 40 ? 'caution' : 'info',
      title: isEs
        ? `${peak.label} es el día más pesado (${peak.sharePct}% de la semana)`
        : `${peak.label} is the heaviest day (${peak.sharePct}% of the week)`,
      body: isEs
        ? 'Ahí se concentra la mayor parte del estímulo semanal.'
        : 'Most of the weekly stimulus sits on that day.',
      action: isEs
        ? peak.sharePct >= 40
          ? 'Protege ese día: reduce satélites o aligera el día anterior.'
          : 'Programa recuperación o técnica alrededor de ese pico.'
        : peak.sharePct >= 40
          ? 'Protect that day: cut satellites or lighten the day before.'
          : 'Schedule recovery or technique around that peak.',
      priority: peak.sharePct >= 40 ? 6 : 3,
    }),
  );

  const avg = active.reduce((sum, row) => sum + row.tonnage, 0) / active.length;
  const balanceRatio = avg > 0 ? peak.tonnage / avg : 1;
  if (balanceRatio >= 1.6) {
    insights.push(
      insight({
        id: 'balance-off',
        tone: 'caution',
        title: isEs ? 'Volumen semanal desbalanceado' : 'Weekly volume unbalanced',
        body: isEs
          ? 'Un día queda muy por encima del promedio — riesgo de fatiga concentrada.'
          : 'One day sits well above the average — risk of concentrated fatigue.',
        action: isEs
          ? 'Mueve 1–2 series del día pico a un día vecino más ligero.'
          : 'Move 1–2 sets from the peak day to a lighter neighboring day.',
        priority: 6,
      }),
    );
  } else {
    insights.push(
      insight({
        id: 'balance-ok',
        tone: 'positive',
        title: isEs ? 'Distribución equilibrada entre días' : 'Balanced distribution across days',
        body: isEs
          ? 'La carga semanal se reparte de forma coherente entre los días programados.'
          : 'Weekly load is distributed coherently across programmed days.',
        action: isEs
          ? 'Mantén el patrón; solo ajusta si aparece un pico no intencional.'
          : 'Keep the pattern; adjust only if an unintentional peak appears.',
        priority: 1,
      }),
    );
  }

  if (active.length >= 3) {
    const first = active.slice(0, Math.ceil(active.length / 2));
    const second = active.slice(Math.ceil(active.length / 2));
    const firstAvg = first.reduce((s, r) => s + r.avgPct, 0) / first.length;
    const secondAvg = second.reduce((s, r) => s + r.avgPct, 0) / second.length;
    const delta = Math.round(secondAvg - firstAvg);
    if (Math.abs(delta) >= 3) {
      insights.push(
        insight({
          id: 'intensity-trend',
          tone: 'info',
          title:
            delta > 0
              ? isEs
                ? `Intensidad sube hacia el final (+${delta} pts)`
                : `Intensity rises toward week end (+${delta} pts)`
              : isEs
                ? `Intensidad baja hacia el final (${delta} pts)`
                : `Intensity eases toward week end (${delta} pts)`,
          body: isEs
            ? delta > 0
              ? 'Progresión intra-semana coherente con un pico tardío.'
              : 'Descarga intra-semana: útil si el fin de semana es competición o calidad.'
            : delta > 0
              ? 'Intra-week progression consistent with a late peak.'
              : 'Intra-week unload: useful if the weekend is competition or quality work.',
          action: isEs
            ? 'Confirma que el día más intenso no choca con fatiga residual.'
            : 'Confirm the hardest day does not collide with residual fatigue.',
          priority: 3,
        }),
      );
    } else if (avgPct > 0) {
      insights.push(
        insight({
          id: 'intensity-stable',
          tone: 'positive',
          title: isEs
            ? `Intensidad semanal estable (media ${avgPct}% 1RM)`
            : `Stable weekly intensity (avg ${avgPct}% 1RM)`,
          body: isEs
            ? 'No hay un salto brusco de intensidad entre mitades de la semana.'
            : 'No sharp intensity jump between halves of the week.',
          action: isEs
            ? 'Si buscas progresión, planifica un pico claro en un solo día.'
            : 'If you want progression, plan one clear peak day.',
          priority: 1,
        }),
      );
    }
  }

  const tech = purposePct(purpose, 'technique');
  if (tech >= 40) {
    insights.push(
      insight({
        id: 'week-tech',
        tone: 'info',
        title: isEs ? `${tech}% series técnicas esta semana` : `${tech}% technique sets this week`,
        body: isEs
          ? 'El bloque prioriza calidad de movimiento sobre producción máxima.'
          : 'The block prioritizes movement quality over maximal production.',
        action: isEs
          ? 'Exige estándares técnicos; reserva intensidad para el día pico.'
          : 'Demand technical standards; reserve intensity for the peak day.',
        priority: 2,
      }),
    );
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
      insight({
        id: 'program-empty',
        tone: 'neutral',
        title: isEs ? 'Programa sin volumen' : 'Program has no volume',
        body: isEs
          ? 'El programa aún no tiene volumen calculable.'
          : 'Program has no calculable volume yet.',
        action: isEs ? 'Genera o edita semanas en el editor.' : 'Generate or edit weeks in the editor.',
        priority: 10,
      }),
    ];
  }

  if (active.length >= 2) {
    const first = active[0]!;
    const last = active[active.length - 1]!;
    if (first.tonnage > 0) {
      const deltaPct = Math.round(((last.tonnage - first.tonnage) / first.tonnage) * 100);
      if (Math.abs(deltaPct) >= 5) {
        insights.push(
          insight({
            id: 'volume-progression',
            tone: deltaPct > 0 ? 'positive' : 'caution',
            title:
              deltaPct > 0
                ? isEs
                  ? `Progresión de volumen +${deltaPct}% (${first.label}→${last.label})`
                  : `Volume progression +${deltaPct}% (${first.label}→${last.label})`
                : isEs
                  ? `Volumen −${Math.abs(deltaPct)}% (${first.label}→${last.label})`
                  : `Volume −${Math.abs(deltaPct)}% (${first.label}→${last.label})`,
            body: isEs
              ? deltaPct > 0
                ? 'El mesociclo acumula carga de forma progresiva.'
                : 'El mesociclo reduce carga hacia el final — típico de taper o descarga.'
              : deltaPct > 0
                ? 'The mesocycle accumulates load progressively.'
                : 'The mesocycle reduces load toward the end — typical of taper or deload.',
            action: isEs
              ? deltaPct > 0
                ? 'Verifica que la última semana no sobrecargue al atleta antes de un pico.'
                : 'Confirma que la bajada es intencional (competición / deload).'
              : deltaPct > 0
                ? 'Check the last week does not overload the athlete before a peak.'
                : 'Confirm the drop is intentional (competition / deload).',
            priority: 5,
          }),
        );
      } else {
        insights.push(
          insight({
            id: 'volume-stable',
            tone: 'positive',
            title: isEs
              ? `Volumen estable (${first.label}→${last.label})`
              : `Stable volume (${first.label}→${last.label})`,
            body: isEs
              ? 'No hay un salto grande de volumen a lo largo del bloque.'
              : 'No large volume jump across the block.',
            action: isEs
              ? 'Si buscas hipertrofia o acumulación, planifica un escalón semanal claro.'
              : 'If you want accumulation, plan a clear weekly step-up.',
            priority: 1,
          }),
        );
      }
    }

    // Adjacent-week swing (last two weeks)
    const prev = active[active.length - 2]!;
    if (prev.tonnage > 0) {
      const adj = Math.round(((last.tonnage - prev.tonnage) / prev.tonnage) * 100);
      if (Math.abs(adj) >= 10) {
        insights.push(
          insight({
            id: 'adjacent-week',
            tone: Math.abs(adj) >= 20 ? 'caution' : 'info',
            title: isEs
              ? `${last.label} ${adj > 0 ? '+' : ''}${adj}% vs ${prev.label}`
              : `${last.label} ${adj > 0 ? '+' : ''}${adj}% vs ${prev.label}`,
            body: isEs
              ? 'Cambio brusco entre semanas consecutivas — el atleta lo notará en fatiga o freshness.'
              : 'Sharp change between consecutive weeks — the athlete will feel fatigue or freshness.',
            action: isEs
              ? 'Suaviza el salto o justifica el pico/descarga en la conversación con el atleta.'
              : 'Smooth the jump or explain the peak/deload in the athlete conversation.',
            priority: 6,
          }),
        );
      }
    }
  }

  const peak = active.reduce((best, row) => (row.tonnage > best.tonnage ? row : best), active[0]!);
  insights.push(
    insight({
      id: 'peak-week',
      tone: 'info',
      title: isEs
        ? `${peak.label} es el pico de carga (${peak.sharePct}% del programa)`
        : `${peak.label} is the peak load week (${peak.sharePct}% of the program)`,
      body: isEs
        ? 'Ahí se concentra la mayor parte del volumen del mesociclo.'
        : 'Most of the mesocycle volume sits in that week.',
      action: isEs
        ? 'Asegura recuperación la semana siguiente o reduce satélites alrededor del pico.'
        : 'Ensure recovery the following week or cut satellites around the peak.',
      priority: 3,
    }),
  );

  if (avgPct > 0) {
    insights.push(
      insight({
        id: 'block-intensity',
        tone: avgPct >= 85 ? 'caution' : 'positive',
        title: isEs
          ? `Intensidad media del bloque: ${avgPct}% 1RM`
          : `Block average intensity: ${avgPct}% 1RM`,
        body: isEs
          ? avgPct >= 85
            ? 'El bloque es exigente a nivel de intensidad relativa.'
            : 'Intensidad de bloque en zona de construcción / técnica-trabajo.'
          : avgPct >= 85
            ? 'The block is demanding on relative intensity.'
            : 'Block intensity sits in a building / technique-work zone.',
        action: isEs
          ? avgPct >= 85
            ? 'Alterna semanas de calidad o reduce la densidad de series pesadas.'
            : 'Puedes planificar un microciclo de intensidad más adelante si el objetivo lo pide.'
          : avgPct >= 85
            ? 'Alternate quality weeks or reduce heavy-set density.'
            : 'You can plan a higher-intensity microcycle later if the goal requires it.',
        priority: avgPct >= 85 ? 4 : 1,
      }),
    );
  }

  const top = exerciseVolumes[0];
  if (top && top.pct >= 18) {
    const labels = exerciseVolumes
      .slice(0, 2)
      .map((e) => e.label)
      .join(' / ');
    insights.push(
      insight({
        id: 'dominant-lifts',
        tone: 'info',
        title: isEs ? `Dominan ${labels} en el mesociclo` : `Dominated by ${labels} across the mesocycle`,
        body: isEs
          ? 'Esos patrones concentran la mayor parte del volumen del programa.'
          : 'Those patterns hold most of the program volume.',
        action: isEs
          ? 'Revisa si falta volumen en el patrón opuesto (p. ej. arranque vs envión).'
          : 'Check whether the opposing pattern needs volume (e.g. snatch vs clean & jerk).',
        priority: 2,
      }),
    );
  }

  const intPct = purposePct(purpose, 'intensity');
  if (intPct >= 35) {
    insights.push(
      insight({
        id: 'program-intensity-share',
        tone: 'info',
        title: isEs
          ? `${intPct}% series de intensidad en el programa`
          : `${intPct}% intensity sets across the program`,
        body: isEs
          ? 'El mesociclo dedica una porción alta a trabajo de intensidad.'
          : 'The mesocycle dedicates a high share to intensity work.',
        action: isEs
          ? 'Equilibra con días técnicos claros para no saturar el sistema nervioso.'
          : 'Balance with clear technical days so you do not saturate the nervous system.',
        priority: 2,
      }),
    );
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
    return isEs
      ? `Prioriza velocidad y calidad de movimiento (${pct}% series técnicas)`
      : `Prioritizes speed and movement quality (${pct}% technique sets)`;
  }
  if (dom === 'intensity') {
    return isEs
      ? `Enfatiza producción de fuerza e intensidad (${pct}% series)`
      : `Emphasizes force production and intensity (${pct}% sets)`;
  }
  return isEs
    ? `Enfoque de trabajo / construcción (${pct}% series)`
    : `Work / building focus (${pct}% sets)`;
}
