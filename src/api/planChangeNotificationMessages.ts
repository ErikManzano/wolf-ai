export function buildPlanChangeMessages(params: {
  programName: string;
  coachName: string;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
  changedAt: Date;
  editCount?: number;
  summaryEs?: string[];
  summaryEn?: string[];
}): { messageEs: string; messageEn: string } {
  const dayEs = params.dayLabel?.trim()
    ? `Semana ${params.weekNumber} · ${params.dayLabel.trim()}`
    : `Semana ${params.weekNumber} · Día ${params.dayNumber}`;
  const dayEn = params.dayLabel?.trim()
    ? `Week ${params.weekNumber} · ${params.dayLabel.trim()}`
    : `Week ${params.weekNumber} · Day ${params.dayNumber}`;

  const editCount = params.editCount ?? 1;
  const batchSuffixEs =
    editCount > 1 ? ` (${editCount} guardados)` : '';
  const batchSuffixEn =
    editCount > 1 ? ` (${editCount} saves)` : '';

  const summaryEs = params.summaryEs?.filter(Boolean) ?? [];
  const summaryEn = params.summaryEn?.filter(Boolean) ?? [];

  const detailEs =
    summaryEs.length > 0
      ? `: ${summaryEs.slice(0, 3).join('; ')}${summaryEs.length > 3 ? '…' : ''}`
      : '';
  const detailEn =
    summaryEn.length > 0
      ? `: ${summaryEn.slice(0, 3).join('; ')}${summaryEn.length > 3 ? '…' : ''}`
      : '';

  return {
    messageEs: `${params.coachName} actualizó ${dayEs} de «${params.programName}»${detailEs}${batchSuffixEs}`,
    messageEn: `${params.coachName} updated ${dayEn} of "${params.programName}"${detailEn}${batchSuffixEn}`,
  };
}
