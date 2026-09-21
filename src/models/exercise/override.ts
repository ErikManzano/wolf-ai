import type { ExerciseLoadAnchorCode, TrainingObjectiveCode } from './taxonomy';

export interface OverridePatch {
  displayName?: string;
  loadAnchor?: ExerciseLoadAnchorCode;
  objective?: TrainingObjectiveCode;
  notes?: string;
  hidden?: boolean;
  methodology?: string;
  cues?: string[];
  videoUrl?: string | null;
  /** Carpeta personalizada del coach (`null` = quitar asignación). */
  customFamilyId?: string | null;
}

export interface CoachExerciseOverride {
  id: string;
  coachId: string;
  baseDefinitionId: string;
  override: OverridePatch;
  methodology?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
