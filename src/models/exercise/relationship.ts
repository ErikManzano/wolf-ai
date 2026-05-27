import type { AthleteLevel } from '../training';

export type RelationshipType =
  | 'overload'
  | 'technical'
  | 'predictive'
  | 'percentage'
  | 'fatigue_adjusted';

export type MethodologyCode = 'soviet' | 'bulgarian' | 'chinese' | 'custom' | 'empirical';

export interface EntityRef {
  type: 'family' | 'variation' | 'definition';
  code: string;
}

export interface ExerciseRelationshipRule {
  id: string;
  coachId?: string | null;
  fromRef: EntityRef;
  toRef: EntityRef;
  relationshipType: RelationshipType;
  ratioMin: number;
  ratioMax: number;
  ratioMean: number;
  confidence: number;
  methodology: MethodologyCode;
  athleteLevel?: AthleteLevel | null;
  notes?: string | null;
  isActive: boolean;
}

export interface AthleteLoadCalibration {
  athleteProfileId: string;
  relationshipRuleId: string;
  ratioMean: number;
  ratioMin: number;
  ratioMax: number;
  sampleCount: number;
  lastObservedAt: string;
}
