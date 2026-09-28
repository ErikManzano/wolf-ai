export const PROGRAM_CONTEXT_PANEL_STORAGE_KEY = 'wolf_program_context_panel';

export function programContextPanelTitle(isEs: boolean): string {
  return isEs ? 'Análisis' : 'Insights';
}

export type ProgramContextTabId = 'athlete' | 'week' | 'day' | 'history' | 'exercise' | 'instances';

export type ProgramEditorMode = 'template' | 'instance';

export const PROGRAM_CONTEXT_TAB_STORAGE_KEY = 'wolf_program_context_tab';

/** Top ejercicios por tonnage en pestañas Semana / Día del panel contexto. */
export const PROGRAM_CONTEXT_EXERCISE_RANK_LIMIT = 5;

export function coachAthleteNotesStorageKey(athleteProfileId: string): string {
  return `wolf_coach_athlete_notes_${athleteProfileId}`;
}
