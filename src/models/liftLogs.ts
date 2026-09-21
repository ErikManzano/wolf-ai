export type PrLiftId =
  | 'snatch'
  | 'clean_jerk'
  | 'power_snatch'
  | 'power_clean'
  | 'back_squat'
  | 'front_squat'
  | 'deadlift'
  | 'push_press'
  | 'snatch_pull'
  | 'clean_pull'
  | 'rdl';

export type AthleteLiftLog = {
  id: string;
  athleteProfileId: string;
  liftId: PrLiftId;
  kg: number;
  reps: number;
  loggedAt: string;
  notes?: string;
  createdByUserId?: string;
};

export type CreateAthleteLiftLogInput = {
  liftId: PrLiftId;
  kg: number;
  reps: number;
  notes?: string;
  loggedAt?: string;
};
