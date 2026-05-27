import type { ExerciseLoadAnchorCode, ExerciseFamilyCode, TrainingObjectiveCode } from './taxonomy';
import type { ExerciseComposition } from './composition';
import type { ExerciseLifecycleStatus } from './lifecycle';

export type ExerciseDefinitionKind = 'single' | 'complex';

export interface ExerciseDefinition {
  id: string;
  coachId?: string | null;
  kind: ExerciseDefinitionKind;
  family?: ExerciseFamilyCode | null;
  variation?: string | null;
  startPosition?: string | null;
  objective: TrainingObjectiveCode;
  loadAnchor: ExerciseLoadAnchorCode;
  composition: ExerciseComposition;
  displayName: string;
  signature: string;
  legacyExerciseId?: string | null;
  searchText: string;
  tags: string[];
  lifecycleStatus?: ExerciseLifecycleStatus;
  parentDefinitionId?: string | null;
  version?: number;
  publishedAt?: string | null;
  deprecatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExerciseDefinitionInput {
  kind: ExerciseDefinitionKind;
  composition: ExerciseComposition;
  objective: TrainingObjectiveCode;
  loadAnchor: ExerciseLoadAnchorCode;
  tags?: string[];
}

export interface ComposePreviewResult {
  displayName: string;
  signature: string;
  warnings: string[];
}
