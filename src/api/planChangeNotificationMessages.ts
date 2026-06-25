export function buildPlanChangeMessages(params: {
  programName: string;
  coachName: string;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
  changedAt: Date;
}): { messageEs: string; messageEn: string } {
  const localeEs = params.changedAt.toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const localeEn = params.changedAt.toLocaleString('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const dayEs = params.dayLabel?.trim()
    ? `Semana ${params.weekNumber} · ${params.dayLabel.trim()}`
    : `Semana ${params.weekNumber} · Día ${params.dayNumber}`;
  const dayEn = params.dayLabel?.trim()
    ? `Week ${params.weekNumber} · ${params.dayLabel.trim()}`
    : `Week ${params.weekNumber} · Day ${params.dayNumber}`;
  return {
    messageEs: `Tu coach ${params.coachName} actualizó ${dayEs} de «${params.programName}» el ${localeEs}.`,
    messageEn: `Your coach ${params.coachName} updated ${dayEn} of "${params.programName}" on ${localeEn}.`,
  };
}
