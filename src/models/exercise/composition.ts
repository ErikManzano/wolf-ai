import type {
  ExerciseFamilyCode,
  ExerciseModifierCode,
  ExerciseVariationCode,
  StartPositionCode,
} from './taxonomy';

export interface SegmentComposition {
  family: ExerciseFamilyCode;
  variation: ExerciseVariationCode;
  startPosition: StartPositionCode;
  modifiers: ExerciseModifierCode[];
}

export interface SingleComposition {
  kind: 'single';
  family: ExerciseFamilyCode;
  variation: ExerciseVariationCode;
  startPosition: StartPositionCode;
  modifiers: ExerciseModifierCode[];
  tempo?: string | null;
}

export interface ComplexComposition {
  kind: 'complex';
  segments: SegmentComposition[];
  linker: 'same_bar';
}

export type ExerciseComposition = SingleComposition | ComplexComposition;

export function isSingleComposition(c: ExerciseComposition): c is SingleComposition {
  return c.kind === 'single';
}

export function isComplexComposition(c: ExerciseComposition): c is ComplexComposition {
  return c.kind === 'complex';
}
