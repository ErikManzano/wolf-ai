import type { PrLiftId } from '../../models/liftLogs';

export type { PrLiftId };

export type PrLiftGroupId = 'weightlifting' | 'strength' | 'pulls';

export type OneRmAnchorKey = 'snatch' | 'cleanJerk' | 'backSquat' | 'frontSquat';

export type PrLiftDef = {
  id: PrLiftId;
  group: PrLiftGroupId;
  labelEs: string;
  labelEn: string;
  shortEs: string;
  shortEn: string;
  oneRmKey?: OneRmAnchorKey;
};

export const PR_LIFT_GROUP_ORDER: PrLiftGroupId[] = ['weightlifting', 'strength', 'pulls'];

export const PR_LIFT_GROUPS: Record<PrLiftGroupId, { id: PrLiftGroupId; labelEs: string; labelEn: string }> = {
  weightlifting: { id: 'weightlifting', labelEs: 'Halterofilia', labelEn: 'Weightlifting' },
  strength: { id: 'strength', labelEs: 'Fuerza', labelEn: 'Strength' },
  pulls: { id: 'pulls', labelEs: 'Pulls', labelEn: 'Pulls' },
};

export const PR_LIFTS: Record<PrLiftId, PrLiftDef> = {
  snatch: {
    id: 'snatch',
    group: 'weightlifting',
    labelEs: 'Snatch',
    labelEn: 'Snatch',
    shortEs: 'SN',
    shortEn: 'SN',
    oneRmKey: 'snatch',
  },
  clean_jerk: {
    id: 'clean_jerk',
    group: 'weightlifting',
    labelEs: 'Clean & Jerk',
    labelEn: 'Clean & Jerk',
    shortEs: 'C&J',
    shortEn: 'C&J',
    oneRmKey: 'cleanJerk',
  },
  power_snatch: {
    id: 'power_snatch',
    group: 'weightlifting',
    labelEs: 'Power snatch',
    labelEn: 'Power snatch',
    shortEs: 'PS',
    shortEn: 'PS',
  },
  power_clean: {
    id: 'power_clean',
    group: 'weightlifting',
    labelEs: 'Power clean',
    labelEn: 'Power clean',
    shortEs: 'PC',
    shortEn: 'PC',
  },
  back_squat: {
    id: 'back_squat',
    group: 'strength',
    labelEs: 'Sentadilla atrás',
    labelEn: 'Back squat',
    shortEs: 'BS',
    shortEn: 'BS',
    oneRmKey: 'backSquat',
  },
  front_squat: {
    id: 'front_squat',
    group: 'strength',
    labelEs: 'Sentadilla frontal',
    labelEn: 'Front squat',
    shortEs: 'FS',
    shortEn: 'FS',
    oneRmKey: 'frontSquat',
  },
  deadlift: {
    id: 'deadlift',
    group: 'strength',
    labelEs: 'Peso muerto',
    labelEn: 'Deadlift',
    shortEs: 'DL',
    shortEn: 'DL',
  },
  push_press: {
    id: 'push_press',
    group: 'strength',
    labelEs: 'Push press',
    labelEn: 'Push press',
    shortEs: 'PP',
    shortEn: 'PP',
  },
  snatch_pull: {
    id: 'snatch_pull',
    group: 'pulls',
    labelEs: 'Snatch pull',
    labelEn: 'Snatch pull',
    shortEs: 'SP',
    shortEn: 'SP',
  },
  clean_pull: {
    id: 'clean_pull',
    group: 'pulls',
    labelEs: 'Clean pull',
    labelEn: 'Clean pull',
    shortEs: 'CP',
    shortEn: 'CP',
  },
  rdl: {
    id: 'rdl',
    group: 'pulls',
    labelEs: 'RDL',
    labelEn: 'RDL',
    shortEs: 'RDL',
    shortEn: 'RDL',
  },
};

export const PR_LIFT_IDS = Object.keys(PR_LIFTS) as PrLiftId[];

export const ANCHOR_LIFT_BY_ONE_RM: Record<OneRmAnchorKey, PrLiftId> = {
  snatch: 'snatch',
  cleanJerk: 'clean_jerk',
  backSquat: 'back_squat',
  frontSquat: 'front_squat',
};

export function isPrLiftId(value: string): value is PrLiftId {
  return Object.prototype.hasOwnProperty.call(PR_LIFTS, value);
}

export function liftLabel(id: PrLiftId, isEs: boolean): string {
  const def = PR_LIFTS[id];
  return isEs ? def.labelEs : def.labelEn;
}

export function liftShort(id: PrLiftId, isEs: boolean): string {
  const def = PR_LIFTS[id];
  return isEs ? def.shortEs : def.shortEn;
}

export function liftsInGroup(group: PrLiftGroupId): PrLiftDef[] {
  return PR_LIFT_IDS.map((id) => PR_LIFTS[id]).filter((lift) => lift.group === group);
}
