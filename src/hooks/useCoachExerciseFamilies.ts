import { useCallback, useEffect, useState } from 'react';
import type { CoachExerciseFamily } from '../models/exercise/coachFamily';
import {
  deleteCoachExerciseFamily,
  readCoachExerciseFamilies,
  subscribeCoachExerciseFamilies,
  upsertCoachExerciseFamily,
  writeCoachExerciseFamilies,
} from '../services/exercise/coachFamilyStore';

export function useCoachExerciseFamilies(coachId = 'user-coach') {
  const [families, setFamilies] = useState<CoachExerciseFamily[]>(() =>
    readCoachExerciseFamilies().filter((f) => f.coachId === coachId),
  );

  useEffect(() => {
    const sync = () => setFamilies(readCoachExerciseFamilies().filter((f) => f.coachId === coachId));
    sync();
    return subscribeCoachExerciseFamilies(sync);
  }, [coachId]);

  const saveFamily = useCallback(
    (input: Omit<CoachExerciseFamily, 'id' | 'coachId' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const all = readCoachExerciseFamilies();
      const next = upsertCoachExerciseFamily(all, { ...input, coachId });
      writeCoachExerciseFamilies(next);
      return next.find((f) => (input.id ? f.id === input.id : f.slug === (input.slug || input.labelEn))) ?? null;
    },
    [coachId],
  );

  const removeFamily = useCallback((id: string) => {
    const all = readCoachExerciseFamilies();
    writeCoachExerciseFamilies(deleteCoachExerciseFamily(all, id));
  }, []);

  return { families, saveFamily, removeFamily };
}
