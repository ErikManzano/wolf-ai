/** Taxonomy codes for composable exercise definitions. */

export type ExerciseFamilyCode =
  | 'snatch'
  | 'clean'
  | 'jerk'
  | 'pull'
  | 'squat'
  | 'press'
  | 'accessory';

export type ExerciseVariationCode =
  | 'classic'
  | 'power'
  | 'hang'
  | 'block'
  | 'muscle'
  | 'tall'
  | 'pull'
  | 'high_pull'
  | 'complex';

export type StartPositionCode =
  | 'floor'
  | 'below_knee'
  | 'at_knee'
  | 'above_knee'
  | 'blocks'
  | 'rack'
  | 'straight_legs';

export type ExerciseModifierCode =
  | 'pause'
  | 'slow_eccentric'
  | 'four_stops'
  | 'overhead_squat'
  | 'tempo'
  | 'deficit'
  | 'front'
  | 'behind_neck';

export type TrainingObjectiveCode =
  | 'technique'
  | 'strength'
  | 'speed'
  | 'positional'
  | 'pulling_strength'
  | 'recovery';

export type ExerciseLoadAnchorCode = 'auto' | 'snatch' | 'clean_jerk' | 'back_squat' | 'front_squat';

export interface TaxonomyItem {
  code: string;
  labelEs: string;
  labelEn: string;
  sortOrder: number;
}

export interface TrainingObjectiveItem extends TaxonomyItem {
  intensityMin: number;
  intensityMax: number;
}

export interface ExerciseTaxonomyBundle {
  families: TaxonomyItem[];
  variations: TaxonomyItem[];
  startPositions: TaxonomyItem[];
  modifiers: TaxonomyItem[];
  objectives: TrainingObjectiveItem[];
}
