/** Motor-situation row for praxiogram analysis (coach documentation). */

export type PraxiogramFieldKey =
  | 'situacionMotriz'
  | 'contextoTecnico'
  | 'accionMotrizPrincipal'
  | 'accionesSecundarias'
  | 'relacionMotriz'
  | 'espacio'
  | 'tiempo'
  | 'finalidadTactica';

export interface PraxiogramRow {
  id: string;
  situacionMotriz: string;
  contextoTecnico: string;
  accionMotrizPrincipal: string;
  accionesSecundarias: string;
  relacionMotriz: string;
  espacio: string;
  tiempo: string;
  finalidadTactica: string;
}

/** Payload shape prepared for future API persistence. */
export interface PraxiogramDocument {
  id?: string;
  title: string;
  sportContext?: string;
  rows: PraxiogramRow[];
  updatedAt?: string;
}

export type PraxiogramStatus = 'draft' | 'published';

export interface PraxiogramRecord extends PraxiogramDocument {
  id: string;
  status: PraxiogramStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PraxiogramListItem {
  id: string;
  title: string;
  sportContext: string;
  status: PraxiogramStatus;
  situationCount: number;
  completeCount: number;
  pendingCount: number;
  updatedAt: string;
}

export function createPraxiogramRow(partial?: Partial<PraxiogramRow>): PraxiogramRow {
  return {
    id: partial?.id ?? `prx-${crypto.randomUUID()}`,
    situacionMotriz: partial?.situacionMotriz ?? '',
    contextoTecnico: partial?.contextoTecnico ?? '',
    accionMotrizPrincipal: partial?.accionMotrizPrincipal ?? '',
    accionesSecundarias: partial?.accionesSecundarias ?? '',
    relacionMotriz: partial?.relacionMotriz ?? '',
    espacio: partial?.espacio ?? '',
    tiempo: partial?.tiempo ?? '',
    finalidadTactica: partial?.finalidadTactica ?? '',
  };
}

/** Initial demo rows supplied for Judo motor situations. */
export const PRAXIOGRAM_SEED_ROWS: PraxiogramRow[] = [
  createPraxiogramRow({
    id: 'prx-seed-1',
    situacionMotriz: 'Combate de pie',
    contextoTecnico: 'Agarre inicial (gi / no-gi)',
    accionMotrizPrincipal: 'Lucha por grips, control de postura',
    accionesSecundarias: 'Fintas, empujes, tirones',
    relacionMotriz: 'Oposición directa',
    espacio: 'Tatami vertical',
    tiempo: 'Intermitente',
    finalidadTactica: 'Generar desequilibrio',
  }),
  createPraxiogramRow({
    id: 'prx-seed-2',
    situacionMotriz: 'Entrada a derribo',
    contextoTecnico: 'Desequilibrio previo',
    accionMotrizPrincipal: 'Single leg / double leg',
    accionesSecundarias: 'Cambio de nivel, paso profundo',
    relacionMotriz: 'Oposición directa',
    espacio: 'Tatami',
    tiempo: 'Explosivo',
    finalidadTactica: 'Llevar al suelo con ventaja',
  }),
];

export function buildPraxiogramDocument(
  rows: PraxiogramRow[],
  meta?: Pick<PraxiogramDocument, 'id' | 'title' | 'sportContext'>,
): PraxiogramDocument {
  return {
    id: meta?.id,
    title: meta?.title ?? 'Praxiograma',
    sportContext: meta?.sportContext,
    rows,
    updatedAt: new Date().toISOString(),
  };
}

const PRAXIOGRAM_FIELD_KEYS: PraxiogramFieldKey[] = [
  'situacionMotriz',
  'contextoTecnico',
  'accionMotrizPrincipal',
  'accionesSecundarias',
  'relacionMotriz',
  'espacio',
  'tiempo',
  'finalidadTactica',
];

export function isPraxiogramRowComplete(row: PraxiogramRow): boolean {
  return PRAXIOGRAM_FIELD_KEYS.every((key) => row[key].trim().length > 0);
}

export function countPraxiogramRowStats(rows: PraxiogramRow[]) {
  let complete = 0;
  let pending = 0;
  for (const row of rows) {
    if (isPraxiogramRowComplete(row)) complete += 1;
    else pending += 1;
  }
  return { complete, pending, total: rows.length };
}
