import type { Exercise } from '../../models/training';
import type {
  ExerciseComposition,
  ExerciseDefinition,
  ExerciseFamilyCode,
  ExerciseVariationCode,
  SegmentComposition,
  SingleComposition,
  StartPositionCode,
  TrainingObjectiveCode,
} from '../../models/exercise';
import { buildSearchText } from './composeDisplayName';
import { buildSignature } from './signature';

const CATEGORY_TO_FAMILY: Record<string, ExerciseFamilyCode> = {
  snatch: 'snatch',
  clean_jerk: 'clean',
  squat: 'squat',
  accessory: 'accessory',
};

const SUBTYPE_TO_VARIATION: Record<string, ExerciseVariationCode> = {
  classic: 'classic',
  power: 'power',
  pull: 'pull',
  complex: 'complex',
};

const GOAL_TO_OBJECTIVE: Record<string, TrainingObjectiveCode> = {
  technique: 'technique',
  strength: 'strength',
  power: 'speed',
};

function inferVariation(ex: Exercise): ExerciseVariationCode {
  const n = ex.name.toLowerCase();
  if (ex.subtype === 'pull' || n.includes('pull')) return n.includes('high') ? 'high_pull' : 'pull';
  if (n.includes('muscle')) return 'muscle';
  if (n.includes('tall')) return 'tall';
  if (n.includes('block')) return 'block';
  if (n.includes('hang')) return 'hang';
  if (ex.subtype === 'power' || n.includes('power')) return 'power';
  if (ex.complexity === 'complex' || ex.subtype === 'complex') return 'complex';
  return SUBTYPE_TO_VARIATION[ex.subtype] ?? 'classic';
}

function inferFamily(ex: Exercise): ExerciseFamilyCode {
  const n = ex.name.toLowerCase();
  if (ex.category === 'snatch') return 'snatch';
  if (ex.category === 'squat') return 'squat';
  if (ex.category === 'accessory') {
    if (n.includes('jerk') || n.includes('press')) return 'press';
    if (n.includes('deadlift') || n.includes('good morning')) return 'accessory';
    return 'accessory';
  }
  if (n.includes('jerk') && !n.includes('clean')) return 'jerk';
  if (n.includes('pull')) return 'pull';
  if (n.includes('clean')) return 'clean';
  return CATEGORY_TO_FAMILY[ex.category] ?? 'accessory';
}

function inferModifiers(ex: Exercise): SingleComposition['modifiers'] {
  const n = ex.name.toLowerCase();
  const mods: SingleComposition['modifiers'] = [];
  if (n.includes('pause')) mods.push('pause');
  if (n.includes('deficit')) mods.push('deficit');
  if (n.includes('overhead squat')) mods.push('overhead_squat');
  return mods;
}

export function legacyToSingleComposition(ex: Exercise): SingleComposition {
  return {
    kind: 'single',
    family: inferFamily(ex),
    variation: inferVariation(ex),
    startPosition: ex.startPosition as StartPositionCode,
    modifiers: inferModifiers(ex),
    tempo: null,
  };
}

export function fromLegacyExercise(ex: Exercise, displayName: string): Omit<ExerciseDefinition, 'createdAt' | 'updatedAt'> {
  let composition: ExerciseComposition;
  if (ex.complexity === 'complex' || ex.subtype === 'complex') {
    const parts = ex.name.split('+').map((p) => p.trim());
    const segments: SegmentComposition[] = parts.map((partName) => {
      const fake: Exercise = {
        ...ex,
        name: partName,
        complexity: 'single',
        subtype: 'classic',
      };
      const s = legacyToSingleComposition(fake);
      return {
        family: s.family,
        variation: s.variation,
        startPosition: s.startPosition,
        modifiers: s.modifiers,
      };
    });
    composition =
      segments.length >= 2
        ? { kind: 'complex', segments, linker: 'same_bar' }
        : legacyToSingleComposition(ex);
  } else {
    composition = legacyToSingleComposition(ex);
  }

  const objective = GOAL_TO_OBJECTIVE[ex.goal] ?? 'technique';
  const signature = buildSignature(composition);
  const family = composition.kind === 'single' ? composition.family : composition.segments[0]?.family ?? 'accessory';

  return {
    id: ex.id,
    coachId: null,
    kind: composition.kind === 'complex' ? 'complex' : 'single',
    family,
    variation: composition.kind === 'single' ? composition.variation : null,
    startPosition: composition.kind === 'single' ? composition.startPosition : null,
    objective,
    loadAnchor: ex.loadAnchor ?? 'auto',
    composition,
    displayName,
    signature,
    legacyExerciseId: ex.id,
    searchText: buildSearchText(displayName, composition),
    tags: [family, objective],
  };
}
