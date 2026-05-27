import type { ExerciseDefinition } from './definition';
import type { ExerciseLifecycleStatus } from './lifecycle';
import type { CoachExerciseOverride } from './override';
import type { ExerciseFamilyCode, ExerciseTaxonomyBundle } from './taxonomy';

export interface RegistryBrowseQuery {
  q?: string;
  family?: ExerciseFamilyCode | 'all';
  status?: ExerciseLifecycleStatus | 'all';
  kind?: 'single' | 'complex' | 'all';
  includeDeprecated?: boolean;
  coachId?: string;
}

export interface RegistryTreeNode {
  id: string;
  type: 'family' | 'variation' | 'folder';
  code: string;
  label: string;
  children?: RegistryTreeNode[];
  count?: number;
}

export interface MergedDefinitionView extends ExerciseDefinition {
  lifecycleStatus: ExerciseLifecycleStatus;
  parentDefinitionId?: string | null;
  version: number;
  effectiveDisplayName: string;
  isOfficial: boolean;
  isCoachFork: boolean;
  coachOverride?: CoachExerciseOverride | null;
  hiddenByCoach?: boolean;
}

export interface RegistryBrowseResult {
  tree: RegistryTreeNode[];
  definitions: MergedDefinitionView[];
  taxonomy: ExerciseTaxonomyBundle;
  total: number;
}
