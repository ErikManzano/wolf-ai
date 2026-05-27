import type { ExerciseComposition } from './composition';

export interface ExerciseDefinitionVersion {
  id: string;
  definitionId: string;
  version: number;
  composition: ExerciseComposition;
  displayName: string;
  signature: string;
  changedBy?: string | null;
  changeReason?: string | null;
  createdAt: string;
}
