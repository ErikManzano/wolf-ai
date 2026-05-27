import type { Athlete } from '../training';
import type { ExerciseDefinition } from './definition';
import type { ExerciseRelationshipRule } from './relationship';

export interface LoadPrescriptionContext {
  athlete: Athlete;
  definition: ExerciseDefinition;
  rules: ExerciseRelationshipRule[];
  calibrations?: { relationshipRuleId: string; ratioMean: number }[];
}

export interface ResolvedLoadSuggestion {
  suggestedPercentage: number;
  ratioMean: number;
  ratioMin: number;
  ratioMax: number;
  ruleId?: string;
  methodology?: string;
  source: 'relationship' | 'objective_default' | 'calibration';
}

export interface PrescriptionEvent {
  id: string;
  athleteProfileId: string;
  definitionId: string;
  prescribedPct: number;
  completed?: boolean;
  rpe?: number;
  recordedAt: string;
}

/** Feature vector for future ML / clustering (phase 4). */
export interface ExerciseFeatureVector {
  definitionId: string;
  signature: string;
  familyOneHot: Record<string, number>;
  variationOneHot: Record<string, number>;
  objectiveOneHot: Record<string, number>;
  modifierCount: number;
  kindSingle: number;
  kindComplex: number;
}
