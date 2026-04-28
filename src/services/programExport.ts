import type { Exercise, GeneratedProgram } from '../models/training';
import { normalizeBlockType } from './trainingEngine';

function exName(catalog: Exercise[], id: string): string {
  return catalog.find((e) => e.id === id)?.name ?? id;
}

/** Texto plano listo para WhatsApp, Sheets o imprimir */
export function exportProgramAsText(program: GeneratedProgram, catalog: Exercise[], lang: 'ES' | 'EN'): string {
  const es = lang === 'ES';
  const lines: string[] = [];
  lines.push(`══ ${program.name} ══`);
  lines.push(es ? `Atleta ID: ${program.athleteId}` : `Athlete ID: ${program.athleteId}`);
  lines.push(es ? `Semanas: ${program.totalWeeks} · Días/semana: ${program.daysPerWeek}` : `Weeks: ${program.totalWeeks} · Days/week: ${program.daysPerWeek}`);
  lines.push('');

  for (const week of program.weeks) {
    lines.push(`── ${es ? 'Semana' : 'Week'} ${week.weekNumber} ──`);
    for (const day of week.days) {
      lines.push(`  ${day.label} · K≈${day.session.kValue.toFixed(1)} · ${es ? 'Tonelaje' : 'Load'} ${day.session.load} kg`);
      day.session.exercises.forEach((block, bi) => {
        if (normalizeBlockType(block) === 'complex' && block.segments?.length) {
          const title = block.segments.map((s) => exName(catalog, s.exerciseId)).join(' + ');
          lines.push(`    [${bi + 1}] ${es ? 'COMPLEJO' : 'COMPLEX'}: ${title}`);
          block.sets.forEach((row) => {
            const detail = block.segments!
              .map((seg, i) => `${exName(catalog, seg.exerciseId)} ${row.segmentReps?.[i] ?? '?'}`)
              .join(' · ');
            lines.push(`        ${row.percentage}% — ${detail} · ${row.sets}× ${es ? 'series' : 'sets'}`);
          });
        } else {
          lines.push(`    [${bi + 1}] ${exName(catalog, block.exerciseId)}`);
          block.sets.forEach((row) => {
            lines.push(`        ${row.percentage}% × ${row.reps} × ${row.sets} ${es ? 'series' : 'sets'}`);
          });
        }
      });
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function exportProgramAsJson(program: GeneratedProgram): string {
  return JSON.stringify(program, null, 2);
}
