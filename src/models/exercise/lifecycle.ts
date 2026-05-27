export type ExerciseLifecycleStatus =
  | 'official'
  | 'coach_modified'
  | 'experimental'
  | 'deprecated'
  | 'ai_suggested';

export type ExerciseVisibility = 'public' | 'coach_only' | 'hidden';

export function inferLifecycleStatus(def: {
  coachId?: string | null;
  lifecycleStatus?: ExerciseLifecycleStatus | null;
  parentDefinitionId?: string | null;
}): ExerciseLifecycleStatus {
  if (def.lifecycleStatus) return def.lifecycleStatus;
  if (def.parentDefinitionId && def.coachId) return 'coach_modified';
  if (def.coachId) return 'experimental';
  return 'official';
}
