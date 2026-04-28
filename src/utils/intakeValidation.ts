import type { IntakeData } from '../context/AppContext';

export type IntakeResponses = IntakeData['responses'];

export type IntakeValidationResult = { valid: boolean; errors: Record<string, string> };

/** Acepta coma o punto decimal. */
export function parseFlexibleNumber(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.').replace(/%/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function t(es: string, en: string, lang: 'ES' | 'EN'): string {
  return lang === 'ES' ? es : en;
}

export function validateIntakeStep(step: 1 | 2 | 3, r: IntakeResponses, lang: 'ES' | 'EN'): IntakeValidationResult {
  const errors: Record<string, string> = {};

  if (step === 1) {
    const w = parseFlexibleNumber(r.weight);
    if (w === null) errors.weight = t('Introduce un peso v?lido (kg).', 'Enter a valid weight (kg).', lang);
    else if (w < 25 || w > 220) errors.weight = t('Peso entre 25 y 220 kg.', 'Weight must be between 25 and 220 kg.', lang);

    const h = parseFlexibleNumber(r.height);
    if (h === null) errors.height = t('Introduce una estatura v?lida (cm).', 'Enter a valid height (cm).', lang);
    else if (h < 100 || h > 250) errors.height = t('Estatura entre 100 y 250 cm.', 'Height must be between 100 and 250 cm.', lang);

    if (r.bodyFat.trim() !== '') {
      const bf = parseFlexibleNumber(r.bodyFat);
      if (bf === null) errors.bodyFat = t('% grasa corporal no v?lido.', 'Invalid body fat %.', lang);
      else if (bf < 3 || bf > 70) errors.bodyFat = t('% grasa entre 3 y 70.', 'Body fat must be between 3 and 70%.', lang);
    }
  }

  if (step === 2) {
    const sn = parseFlexibleNumber(r.snatch);
    if (sn === null) errors.snatch = t('Introduce un 1RM de snatch v?lido (kg).', 'Enter a valid snatch 1RM (kg).', lang);
    else if (sn < 15 || sn > 220) errors.snatch = t('Snatch entre 15 y 220 kg.', 'Snatch must be between 15 and 220 kg.', lang);

    const cj = parseFlexibleNumber(r.cleanJerk);
    if (cj === null) errors.cleanJerk = t('Introduce un 1RM de envi?n v?lido (kg).', 'Enter a valid clean & jerk 1RM (kg).', lang);
    else if (cj < 20 || cj > 280) errors.cleanJerk = t('C&J entre 20 y 280 kg.', 'Clean & jerk must be between 20 and 280 kg.', lang);

    if (sn !== null && cj !== null && sn > cj + 5) {
      errors.snatch = t(
        'El snatch no suele ser mucho mayor que el C&J; revisa los valores.',
        'Snatch is rarely much higher than C&J; check your numbers.',
        lang,
      );
    }
  }

  if (step === 3) {
    const bs = parseFlexibleNumber(r.backSquat);
    if (bs === null) errors.backSquat = t('Introduce un 1RM de sentadilla trasera v?lido.', 'Enter a valid back squat 1RM.', lang);
    else if (bs < 40 || bs > 350) errors.backSquat = t('Sentadilla trasera entre 40 y 350 kg.', 'Back squat must be between 40 and 350 kg.', lang);

    const fs = parseFlexibleNumber(r.frontSquat);
    if (fs === null) errors.frontSquat = t('Introduce un 1RM de sentadilla frontal v?lido.', 'Enter a valid front squat 1RM.', lang);
    else if (fs < 30 || fs > 300) errors.frontSquat = t('Sentadilla frontal entre 30 y 300 kg.', 'Front squat must be between 30 and 300 kg.', lang);

    const dl = parseFlexibleNumber(r.deadlift);
    if (dl === null) errors.deadlift = t('Introduce un 1RM de peso muerto v?lido.', 'Enter a valid deadlift 1RM.', lang);
    else if (dl < 40 || dl > 400) errors.deadlift = t('Peso muerto entre 40 y 400 kg.', 'Deadlift must be between 40 and 400 kg.', lang);

    if (bs !== null && fs !== null && fs > bs + 10) {
      errors.frontSquat = t(
        'La frontal no suele superar mucho a la trasera; revisa.',
        'Front squat is rarely much higher than back squat; check.',
        lang,
      );
    }

  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateFullIntake(r: IntakeResponses, lang: 'ES' | 'EN'): IntakeValidationResult {
  const errors: Record<string, string> = {};
  for (const step of [1, 2, 3] as const) {
    Object.assign(errors, validateIntakeStep(step, r, lang).errors);
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Primer paso que tiene alg?n error (para saltar al revisar). */
export function firstIntakeStepWithErrors(errors: Record<string, string>): 1 | 2 | 3 {
  if (errors.weight || errors.height || errors.bodyFat) return 1;
  if (errors.snatch || errors.cleanJerk) return 2;
  return 3;
}
