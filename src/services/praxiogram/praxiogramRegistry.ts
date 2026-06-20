import {
  createPraxiogramRow,
  PRAXIOGRAM_SEED_ROWS,
  type PraxiogramListItem,
  type PraxiogramRecord,
  type PraxiogramRow,
  type PraxiogramStatus,
  countPraxiogramRowStats,
} from '../../models/praxiogram';

const STORAGE_KEY = 'wolf_praxiograms_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function cloneRows(rows: PraxiogramRow[]): PraxiogramRow[] {
  return rows.map((row) => ({ ...row }));
}

function seedRecords(): PraxiogramRecord[] {
  const timestamp = nowIso();
  return [
    {
      id: 'praxiogram-judo-1',
      title: 'Judo — Situaciones de lucha',
      sportContext: 'Judo — Situaciones de lucha',
      status: 'draft',
      rows: cloneRows(PRAXIOGRAM_SEED_ROWS),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export function loadPraxiogramRecords(): PraxiogramRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = seedRecords();
      savePraxiogramRecords(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as PraxiogramRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = seedRecords();
      savePraxiogramRecords(seed);
      return seed;
    }
    return parsed;
  } catch {
    const seed = seedRecords();
    savePraxiogramRecords(seed);
    return seed;
  }
}

export function savePraxiogramRecords(records: PraxiogramRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getPraxiogramRecord(id: string): PraxiogramRecord | null {
  return loadPraxiogramRecords().find((record) => record.id === id) ?? null;
}

export function toPraxiogramListItem(record: PraxiogramRecord): PraxiogramListItem {
  const stats = countPraxiogramRowStats(record.rows);
  return {
    id: record.id,
    title: record.title,
    sportContext: record.sportContext ?? record.title,
    status: record.status,
    situationCount: stats.total,
    completeCount: stats.complete,
    pendingCount: stats.pending,
    updatedAt: record.updatedAt,
  };
}

export function listPraxiogramItems(): PraxiogramListItem[] {
  return loadPraxiogramRecords()
    .map(toPraxiogramListItem)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createPraxiogramRecord(input: {
  title: string;
  sportContext?: string;
  status?: PraxiogramStatus;
}): PraxiogramRecord {
  const timestamp = nowIso();
  const record: PraxiogramRecord = {
    id: `praxiogram-${crypto.randomUUID()}`,
    title: input.title.trim(),
    sportContext: (input.sportContext ?? input.title).trim(),
    status: input.status ?? 'draft',
    rows: [createPraxiogramRow()],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const next = [record, ...loadPraxiogramRecords()];
  savePraxiogramRecords(next);
  return record;
}

export function updatePraxiogramRecord(
  id: string,
  patch: Partial<Pick<PraxiogramRecord, 'title' | 'sportContext' | 'status' | 'rows'>>,
): PraxiogramRecord | null {
  const records = loadPraxiogramRecords();
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return null;

  const current = records[index]!;
  const updated: PraxiogramRecord = {
    ...current,
    ...patch,
    title: patch.title?.trim() || current.title,
    sportContext: patch.sportContext?.trim() || current.sportContext,
    rows: patch.rows ? cloneRows(patch.rows) : current.rows,
    updatedAt: nowIso(),
  };

  records[index] = updated;
  savePraxiogramRecords(records);
  return updated;
}

export function deletePraxiogramRecord(id: string): boolean {
  const records = loadPraxiogramRecords();
  const next = records.filter((record) => record.id !== id);
  if (next.length === records.length) return false;
  savePraxiogramRecords(next.length > 0 ? next : seedRecords());
  return true;
}

export function duplicatePraxiogramRecord(id: string): PraxiogramRecord | null {
  const source = getPraxiogramRecord(id);
  if (!source) return null;

  const timestamp = nowIso();
  const copy: PraxiogramRecord = {
    ...source,
    id: `praxiogram-${crypto.randomUUID()}`,
    title: `${source.title} (copy)`,
    status: 'draft',
    rows: cloneRows(source.rows),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  savePraxiogramRecords([copy, ...loadPraxiogramRecords()]);
  return copy;
}
