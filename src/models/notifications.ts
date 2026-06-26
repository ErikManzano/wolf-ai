/** Contexto de edición al guardar un programa coach (semana/día activos). */
export type ProgramEditContext = {
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
};

export type PlanChangeNotification = {
  id: string;
  recipientUserId: string;
  coachId: string;
  coachName: string;
  coachProgramId: string;
  programName: string;
  assignmentId?: string;
  athleteProfileId: string;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
  changedAt: string;
  readAt?: string | null;
  messageEs: string;
  messageEn: string;
  /** Guardados del coach agrupados en esta notificación (autosave). */
  editCount?: number;
  /** Detalle legible de cambios (bullets en UI). */
  summaryEs?: string[];
  summaryEn?: string[];
};
