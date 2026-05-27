import type { LoadPrescriptionContext, ResolvedLoadSuggestion } from '../../models/exercise';
import { isSingleComposition } from '../../models/exercise';
import { getExerciseTaxonomy } from './taxonomyLoader';

export function resolveLoadSuggestion(ctx: LoadPrescriptionContext): ResolvedLoadSuggestion | null {
  const bundle = getExerciseTaxonomy();
  const obj = bundle.objectives.find((o) => o.code === ctx.definition.objective);
  const defaultPct = obj ? Math.round((obj.intensityMin + obj.intensityMax) / 2) : 75;

  const comp = ctx.definition.composition;
  if (!isSingleComposition(comp)) {
    return {
      suggestedPercentage: defaultPct,
      ratioMean: 1,
      ratioMin: 1,
      ratioMax: 1,
      source: 'objective_default',
    };
  }

  const family = comp.family;
  const matching = ctx.rules.filter(
    (r) =>
      r.isActive &&
      r.toRef.type === 'family' &&
      r.toRef.code === family &&
      (!r.athleteLevel || r.athleteLevel === ctx.athlete.level),
  );

  if (matching.length === 0) {
    return {
      suggestedPercentage: defaultPct,
      ratioMean: 1,
      ratioMin: 1,
      ratioMax: 1,
      source: 'objective_default',
    };
  }

  const rule = matching.sort((a, b) => b.confidence - a.confidence)[0]!;
  const cal = ctx.calibrations?.find((c) => c.relationshipRuleId === rule.id);
  const ratioMean = cal?.ratioMean ?? rule.ratioMean;

  const fromFamily = rule.fromRef.type === 'family' ? rule.fromRef.code : family;
  let anchorPct = defaultPct;
  if (fromFamily === 'snatch') anchorPct = 100;
  else if (fromFamily === 'clean') anchorPct = 100;
  else if (fromFamily === 'squat') anchorPct = 100;

  const suggestedPercentage = Math.round(anchorPct * ratioMean);

  return {
    suggestedPercentage: Math.min(120, Math.max(40, suggestedPercentage)),
    ratioMean,
    ratioMin: cal ? cal.ratioMean * 0.95 : rule.ratioMin,
    ratioMax: cal ? cal.ratioMean * 1.05 : rule.ratioMax,
    ruleId: rule.id,
    methodology: rule.methodology,
    source: cal ? 'calibration' : 'relationship',
  };
}
