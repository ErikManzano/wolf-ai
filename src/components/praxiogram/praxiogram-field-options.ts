import type { PraxiogramFieldKey } from '../../models/praxiogram';

export type PraxiogramSelectOption = {
  valueEs: string;
  valueEn: string;
};

export const PRAXIOGRAM_SELECT_FIELDS = new Set<PraxiogramFieldKey>([
  'relacionMotriz',
  'espacio',
  'tiempo',
]);

export const PRAXIOGRAM_FIELD_OPTIONS: Partial<
  Record<PraxiogramFieldKey, PraxiogramSelectOption[]>
> = {
  relacionMotriz: [
    { valueEs: 'Oposición directa', valueEn: 'Direct opposition' },
    { valueEs: 'Dominio unilateral', valueEn: 'Unilateral dominance' },
    { valueEs: 'Cooperación', valueEn: 'Cooperation' },
    { valueEs: 'Cooperación–oposición', valueEn: 'Cooperation–opposition' },
  ],
  espacio: [
    { valueEs: 'Tatami vertical', valueEn: 'Vertical tatami' },
    { valueEs: 'Tatami', valueEn: 'Tatami' },
    { valueEs: 'Suelo', valueEn: 'Ground' },
    { valueEs: 'Espacio reducido', valueEn: 'Reduced space' },
    { valueEs: 'Espacio amplio', valueEn: 'Wide space' },
  ],
  tiempo: [
    { valueEs: 'Intermitente', valueEn: 'Intermittent' },
    { valueEs: 'Explosivo', valueEn: 'Explosive' },
    { valueEs: 'Continuo', valueEn: 'Continuous' },
    { valueEs: 'Cíclico', valueEn: 'Cyclic' },
  ],
};

export function optionLabel(option: PraxiogramSelectOption, isEs: boolean): string {
  return isEs ? option.valueEs : option.valueEn;
}

export function optionValue(option: PraxiogramSelectOption, isEs: boolean): string {
  return isEs ? option.valueEs : option.valueEn;
}
