import type { ExerciseComposition, SegmentComposition, SingleComposition } from '../../models/exercise';
import type { ExerciseTaxonomyBundle } from '../../models/exercise';
import { isComplexComposition, isSingleComposition } from '../../models/exercise';

type Locale = 'es' | 'en';

function label(
  bundle: ExerciseTaxonomyBundle,
  kind: 'families' | 'variations' | 'startPositions' | 'modifiers',
  code: string,
  locale: Locale,
): string {
  const list = bundle[kind];
  const item = list.find((x) => x.code === code);
  if (!item) return code;
  return locale === 'es' ? item.labelEs : item.labelEn;
}

function segmentName(seg: SegmentComposition, bundle: ExerciseTaxonomyBundle, locale: Locale): string {
  const parts: string[] = [];
  if (seg.variation !== 'classic') {
    parts.push(label(bundle, 'variations', seg.variation, locale));
  }
  parts.push(label(bundle, 'families', seg.family, locale));
  if (seg.startPosition !== 'floor' && seg.startPosition !== 'rack') {
    parts.push(label(bundle, 'startPositions', seg.startPosition, locale));
  }
  for (const m of seg.modifiers) {
    parts.push(label(bundle, 'modifiers', m, locale));
  }
  return parts.join(' ');
}

function singleName(s: SingleComposition, bundle: ExerciseTaxonomyBundle, locale: Locale): string {
  return segmentName(
    {
      family: s.family,
      variation: s.variation,
      startPosition: s.startPosition,
      modifiers: s.modifiers,
    },
    bundle,
    locale,
  );
}

export function composeDisplayName(
  composition: ExerciseComposition,
  bundle: ExerciseTaxonomyBundle,
  locale: Locale = 'en',
): string {
  if (isComplexComposition(composition)) {
    return composition.segments.map((s) => segmentName(s, bundle, locale)).join(' + ');
  }
  if (isSingleComposition(composition)) {
    return singleName(composition, bundle, locale);
  }
  return 'Exercise';
}

export function buildSearchText(displayName: string, composition: ExerciseComposition): string {
  const parts = [displayName.toLowerCase()];
  if (isSingleComposition(composition)) {
    parts.push(composition.family, composition.variation, composition.startPosition, ...composition.modifiers);
  } else if (isComplexComposition(composition)) {
    for (const s of composition.segments) {
      parts.push(s.family, s.variation, s.startPosition, ...s.modifiers);
    }
  }
  return [...new Set(parts)].join(' ');
}
