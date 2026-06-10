import type { Athlete } from '../models/training';
import type { IntakeData } from '../context/AppContext';

/** Perfil Motor WL (`Athlete.id`) → atleta numérico en AppContext (Stats / PRs). */
export const WL_PROFILE_TO_APP_ATHLETE_ID: Record<string, number> = {
  'ath-erik': 1,
  'ath-you': 1,
};

export function appAthleteIdForWlProfile(wlId: string): number | undefined {
  return WL_PROFILE_TO_APP_ATHLETE_ID[wlId];
}

export function intakesForWlProfile(wlId: string, intakes: IntakeData[]): IntakeData[] {
  const aid = appAthleteIdForWlProfile(wlId);
  if (aid == null) return [];
  return intakes.filter((i) => i.athleteId === aid).sort((a, b) => a.date.localeCompare(b.date));
}

export function latestIntakeForWlProfile(wlId: string, intakes: IntakeData[]): IntakeData | null {
  const list = intakesForWlProfile(wlId, intakes);
  return list.length ? list[list.length - 1] : null;
}

function parseNum(s: string | undefined): number | undefined {
  const n = parseFloat(String(s ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Combina perfil WL (listo/fatiga/nivel) con el último formulario Stats (PRs y peso). */
export function mergeAthleteWithLatestIntake(base: Athlete, intake: IntakeData | null): Athlete {
  if (!intake?.responses) return base;
  const r = intake.responses;
  const weight = parseNum(r.weight);
  const sn = parseNum(r.snatch);
  const cj = parseNum(r.cleanJerk);
  const bs = parseNum(r.backSquat);
  const fs = parseNum(r.frontSquat);
  return {
    ...base,
    bodyweight: weight && weight > 0 ? weight : base.bodyweight,
    oneRM: {
      snatch: sn && sn > 0 ? sn : base.oneRM.snatch,
      cleanJerk: cj && cj > 0 ? cj : base.oneRM.cleanJerk,
      backSquat: bs && bs > 0 ? bs : base.oneRM.backSquat,
      frontSquat: fs && fs > 0 ? fs : base.oneRM.frontSquat,
    },
  };
}

export function parseIntakeDeadlift(intake: IntakeData | null): number | undefined {
  if (!intake?.responses) return undefined;
  return parseNum(intake.responses.deadlift);
}
