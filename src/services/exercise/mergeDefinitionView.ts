import type {
  CoachExerciseOverride,
  ExerciseDefinition,
  ExerciseLifecycleStatus,
  MergedDefinitionView,
} from '../../models/exercise';
import { inferLifecycleStatus } from '../../models/exercise/lifecycle';

export function mergeDefinitionView(
  def: ExerciseDefinition,
  coachOverride?: CoachExerciseOverride | null,
): MergedDefinitionView {
  const lifecycleStatus = inferLifecycleStatus(def);
  const hiddenByCoach = Boolean(coachOverride?.override.hidden);
  const effectiveDisplayName = coachOverride?.override.displayName?.trim() || def.displayName;

  return {
    ...def,
    lifecycleStatus,
    parentDefinitionId: def.parentDefinitionId ?? null,
    version: def.version ?? 1,
    effectiveDisplayName,
    isOfficial: !def.coachId && lifecycleStatus === 'official',
    isCoachFork: Boolean(def.parentDefinitionId && def.coachId),
    coachOverride: coachOverride ?? null,
    hiddenByCoach,
    objective: coachOverride?.override.objective ?? def.objective,
    loadAnchor: coachOverride?.override.loadAnchor ?? def.loadAnchor,
    displayName: effectiveDisplayName,
  };
}

export function mergeCatalogViews(
  definitions: ExerciseDefinition[],
  overrides: CoachExerciseOverride[],
  coachId: string,
): MergedDefinitionView[] {
  const overrideByBase = new Map(overrides.filter((o) => o.coachId === coachId).map((o) => [o.baseDefinitionId, o]));

  const official = definitions.filter((d) => !d.coachId);
  const coachOwned = definitions.filter((d) => d.coachId === coachId);

  const mergedOfficial = official
    .map((d) => mergeDefinitionView(d, overrideByBase.get(d.id)))
    .filter((m) => !m.hiddenByCoach);

  const mergedCoach = coachOwned.map((d) => mergeDefinitionView(d, null));

  const byId = new Map<string, MergedDefinitionView>();
  for (const m of mergedOfficial) byId.set(m.id, m);
  for (const m of mergedCoach) byId.set(m.id, m);

  return [...byId.values()].sort((a, b) => a.effectiveDisplayName.localeCompare(b.effectiveDisplayName));
}

export function lifecycleBadgeLabel(status: ExerciseLifecycleStatus, isEs: boolean): string {
  const map: Record<ExerciseLifecycleStatus, [string, string]> = {
    official: ['Oficial', 'Official'],
    coach_modified: ['Coach', 'Coach'],
    experimental: ['Experimental', 'Experimental'],
    deprecated: ['Deprecado', 'Deprecated'],
    ai_suggested: ['IA', 'AI'],
  };
  return isEs ? map[status][0] : map[status][1];
}
