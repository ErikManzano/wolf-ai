/**
 * Parse docs/exercises/CONCENTRADO 2.md → canonical JSON + inventory report.
 * Usage: npx tsx scripts/parse-concentrado.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockExercises } from '../src/data/loadMockData';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MD_PATH = join(ROOT, 'docs/exercises/CONCENTRADO 2.md');
const JSON_PATH = join(ROOT, 'src/data/exercises-concentrado.json');
const REPORT_PATH = join(ROOT, 'docs/exercises/concentrado-inventory.md');

export type ConcentradoSection = 'strength' | 'warmup' | 'foam' | 'bodyweight';
export type ConcentradoMuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body';

export type ConcentradoEquipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'band'
  | 'bodyweight'
  | 'foam_roller'
  | 'med_ball';

export interface ConcentradoExercise {
  id: string;
  nameEn: string;
  nameEs: string;
  section: ConcentradoSection;
  muscleGroup: ConcentradoMuscleGroup;
  equipment: ConcentradoEquipment;
  cuesEn: string;
  cuesEs: string;
  variations?: string[];
  mapsToLegacyId?: string | null;
}

const MUSCLE_HEADERS: Record<string, ConcentradoMuscleGroup> = {
  pecho: 'chest',
  espalda: 'back',
  hombros: 'shoulders',
  antebrazos: 'forearms',
  triceps: 'triceps',
  tríceps: 'triceps',
  biceps: 'biceps',
  bíceps: 'biceps',
  piernas: 'quads',
  pantorrillas: 'calves',
  gluteos: 'glutes',
  glúteos: 'glutes',
  nalgas: 'glutes',
  abdomen: 'core',
};

const WL_NAME_ALIASES: Record<string, string> = {
  'front squat': 'ex-028',
  'front squats': 'ex-028',
  'sentadilla frontal': 'ex-028',
  'back squat': 'ex-027',
  'sentadilla trasera': 'ex-027',
  'overhead squat': 'ex-013',
  'overhead squat progression': 'ex-013',
  'sentadilla con barra sobre cabeza': 'ex-013',
  'push press': 'ex-024',
  'power clean': 'ex-017',
  'high pull snatch grip': 'ex-009',
  'snatch high pull': 'ex-009',
  'clean high pull': 'ex-021',
  'romanian deadlift': 'ex-032',
  'peso muerto rumano': 'ex-032',
};

/** Strip OCR export wrapper (`6. 1.-**Name`) but keep bodyweight lines (`1. Name:`). */
function normalizeLine(raw: string): string {
  const line = raw.trim();
  if (/^\d+\.\s+\d+\./.test(line)) {
    return line.replace(/^\d+\.\s+/, '');
  }
  return line;
}

function detectMuscleHeader(line: string): ConcentradoMuscleGroup | null {
  const lower = line.toLowerCase().replace(/\*/g, '').trim();
  for (const [key, group] of Object.entries(MUSCLE_HEADERS)) {
    if (lower === key || lower.endsWith(key) || lower.includes(key)) {
      return group;
    }
  }
  return null;
}

function isSpanishTitle(title: string): boolean {
  return /[áéíóúñü]/i.test(title) || /\b(de|con|para|sentado|recostado|pierna|brazo)\b/i.test(title);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(name: string): string {
  return normalizeName(name).replace(/\s+/g, '-').slice(0, 48);
}

function cleanExerciseTitle(raw: string): string {
  return raw
    .replace(/\s*x\s*\d+.*$/i, '')
    .replace(/\s*-\s*$/, '')
    .replace(/\.\s*$/, '')
    .trim();
}

function inferEquipment(nameEn: string, cues: string, section: ConcentradoSection): ConcentradoEquipment {
  const text = `${nameEn} ${cues}`.toLowerCase();
  if (section === 'foam') return 'foam_roller';
  if (/\bfoam roller\b/.test(text)) return 'foam_roller';
  if (/\b(medicine ball|med ball|balon medicinal)\b/.test(text)) return 'med_ball';
  if (/\b(kettlebell|kettle bell)\b/.test(text)) return 'kettlebell';
  if (/\b(dumbbell|dumbell|mancuerna)\b/.test(text)) return 'dumbbell';
  if (/\b(barbell|barra)\b/.test(text)) return 'barbell';
  if (/\b(band|banda)\b/.test(text)) return 'band';
  if (/\b(machine|maquina|máquina|pec dec|cable)\b/.test(text)) return 'machine';
  if (section === 'bodyweight' || section === 'warmup') return 'bodyweight';
  return 'barbell';
}

function detectLegacyId(nameEn: string, nameEs: string): string | null {
  const en = normalizeName(nameEn);
  const es = normalizeName(nameEs);
  for (const [alias, id] of Object.entries(WL_NAME_ALIASES)) {
    if (en === alias || es === alias || en.includes(alias) || es.includes(alias)) {
      return id;
    }
  }
  for (const ex of mockExercises) {
    const legacy = normalizeName(ex.name);
    const legacyEs = normalizeName(ex.nameEs ?? '');
    if (en === legacy || es === legacy || en === legacyEs || es === legacyEs) {
      return ex.id;
    }
    if (legacy.length > 8 && (en.includes(legacy) || legacy.includes(en))) {
      return ex.id;
    }
  }
  return null;
}

const EN_HEADER = /^(\d+)\.-?\s*\*\*(.+?)\*\*\s*[:.\-]?\s*(.*)$/i;
const EN_HEADER_PLAIN = /^(\d+)\.-?\s*([A-Za-z][^:]{2,80})\s*[:.\-]\s*(.*)$/i;
const ES_HEADER = /^(\d+)\.(\d+)\.?\s*-?\s*\*\*(.+?)\*\*\s*[:.\-]?\s*(.*)$/i;
const ES_HEADER_PLAIN = /^(\d+)\.(\d+)\.?\s*-?\s*([A-Za-zÁÉÍÓÚáéíóú][^:]{2,80})\s*[:.\-]\s*(.*)$/i;
const BW_EN = /^(\d+)\.\s+([A-Za-z][^:]+):\s*(.*)$/;
const BW_ES = /^(\d+)\.\s+([A-Za-zÁÉÍÓÚáéíóú][^:]+):\s*(.*)$/;

interface RawEntry {
  pairKey: string;
  lang: 'en' | 'es';
  name: string;
  cues: string;
  line: number;
  section: ConcentradoSection;
  muscleGroup: ConcentradoMuscleGroup;
  variations?: string[];
}

function parseMd(content: string): RawEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: RawEntry[] = [];
  let started = false;
  let section: ConcentradoSection = 'warmup';
  let muscleGroup: ConcentradoMuscleGroup = 'full_body';
  let currentVariations: string[] = [];
  let pendingEn: RawEntry | null = null;
  let bwPairIndex = 0;

  const pushEntry = (entry: RawEntry) => {
    entries.push(entry);
    if (entry.lang === 'en') pendingEn = entry;
    else if (pendingEn && pendingEn.pairKey === entry.pairKey) pendingEn = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = normalizeLine(lines[i]);
    if (!line) continue;

    if (!started) {
      if (/dynamic warm up|calentamiento din/i.test(line)) started = true;
      else continue;
    }

    if (/body weight training/i.test(line)) {
      section = 'bodyweight';
      muscleGroup = 'full_body';
      bwPairIndex = 0;
      continue;
    }
    if (/foam roller/i.test(line) && !/^\d/.test(line)) {
      section = 'foam';
      muscleGroup = 'full_body';
      continue;
    }
    if (/warm with resistance|upper body with resistance|lower body with resistance/i.test(line)) {
      section = 'strength';
      muscleGroup = 'full_body';
      continue;
    }
    if (/dynamic warm up|calentamiento din/i.test(line) && section !== 'bodyweight') {
      section = 'warmup';
      muscleGroup = 'full_body';
      continue;
    }

    const headerMuscle = detectMuscleHeader(line);
    if (headerMuscle && line.length < 48) {
      section = 'strength';
      muscleGroup = headerMuscle;
      continue;
    }

    if (/^variaciones?$/i.test(line) || /^variations$/i.test(line)) continue;
    if (line.startsWith('* ') || line.startsWith('- ')) {
      const bullet = line.replace(/^[*-]\s+/, '').trim();
      if (entries.length > 0) {
        const last = entries[entries.length - 1];
        last.cues = [last.cues, bullet].filter(Boolean).join(' ');
      }
      currentVariations.push(bullet);
      continue;
    }

    const pairScope = `${section}:${muscleGroup}`;

    const esMatch = line.match(ES_HEADER) ?? line.match(ES_HEADER_PLAIN);
    if (esMatch) {
      const [, major, , title, rest] = esMatch;
      pushEntry({
        pairKey: `${pairScope}:${major}`,
        lang: 'es',
        name: cleanExerciseTitle(title),
        cues: rest.trim(),
        line: i + 1,
        section,
        muscleGroup,
      });
      continue;
    }

    const enMatch = line.match(EN_HEADER) ?? line.match(EN_HEADER_PLAIN);
    if (enMatch) {
      const [, num, title, rest] = enMatch;
      const entry: RawEntry = {
        pairKey: `${pairScope}:${num}`,
        lang: 'en',
        name: cleanExerciseTitle(title),
        cues: rest.trim(),
        line: i + 1,
        section,
        muscleGroup,
        variations: currentVariations.length ? [...currentVariations] : undefined,
      };
      currentVariations = [];
      pushEntry(entry);
      continue;
    }

    const bwMatch = line.match(/^(\d+)\.\s+(.+?):\s*(.*)$/);
    if (bwMatch && section === 'bodyweight') {
      const [, , title, rest] = bwMatch;
      const lang: 'en' | 'es' = isSpanishTitle(title) ? 'es' : 'en';
      if (lang === 'en') bwPairIndex += 1;
      const key = `bw:${bwPairIndex}`;
      pushEntry({
        pairKey: key,
        lang,
        name: cleanExerciseTitle(title),
        cues: rest.trim(),
        line: i + 1,
        section,
        muscleGroup,
      });
    }
  }
  return entries;
}

function pairEntries(raw: RawEntry[]): ConcentradoExercise[] {
  const byKey = new Map<string, { en?: RawEntry; es?: RawEntry }>();
  for (const entry of raw) {
    const bucket = byKey.get(entry.pairKey) ?? {};
    if (entry.lang === 'en') bucket.en = entry;
    else bucket.es = entry;
    byKey.set(entry.pairKey, bucket);
  }

  const exercises: ConcentradoExercise[] = [];
  const seenSlugs = new Set<string>();

  for (const [, pair] of byKey) {
    if (!pair.en && !pair.es) continue;
    const nameEn = pair.en?.name ?? pair.es!.name;
    const nameEs = pair.es?.name ?? pair.en!.name;
    const cuesEn = pair.en?.cues ?? '';
    const cuesEs = pair.es?.cues ?? '';
    const ctx = pair.en ?? pair.es!;
    const { section, muscleGroup } = ctx;
    const slug = slugify(nameEn || nameEs);
    if (!slug || slug.length < 2) continue;

    const dedupeKey = `${section}:${muscleGroup}:${slug}`;
    if (seenSlugs.has(dedupeKey)) continue;
    seenSlugs.add(dedupeKey);

    const variations = pair.en?.variations;
    const mapsToLegacyId = detectLegacyId(nameEn, nameEs);
    const equipment = inferEquipment(nameEn, `${cuesEn} ${cuesEs}`, section);

    exercises.push({
      id: `ex-conc-${section.slice(0, 4)}-${muscleGroup}-${slug}`,
      nameEn,
      nameEs,
      section,
      muscleGroup,
      equipment,
      cuesEn,
      cuesEs,
      variations: variations?.length ? variations : undefined,
      mapsToLegacyId,
    });
  }

  return exercises;
}

function buildInventoryReport(exercises: ConcentradoExercise[]): string {
  const bySection: Record<string, number> = {};
  const byMuscle: Record<string, number> = {};
  const wlDupes = exercises.filter((e) => e.mapsToLegacyId);
  const ambiguous = exercises.filter((e) => !e.cuesEn && !e.cuesEs);
  const newOnly = exercises.filter((e) => !e.mapsToLegacyId);

  for (const ex of exercises) {
    bySection[ex.section] = (bySection[ex.section] ?? 0) + 1;
    byMuscle[ex.muscleGroup] = (byMuscle[ex.muscleGroup] ?? 0) + 1;
  }

  const lines = [
    '# CONCENTRADO 2 — Inventario parseado',
    '',
    `Generado: ${new Date().toISOString()}`,
    '',
    '## Resumen',
    '',
    `| Métrica | Valor |`,
    `|---|---|`,
    `| Total únicos | ${exercises.length} |`,
    `| Nuevos (sin id WL) | ${newOnly.length} |`,
    `| Enriquecen catálogo WL | ${wlDupes.length} |`,
    `| Sin cues (revisar) | ${ambiguous.length} |`,
    '',
    '## Por sección',
    '',
    ...Object.entries(bySection)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- **${k}**: ${v}`),
    '',
    '## Por grupo muscular',
    '',
    ...Object.entries(byMuscle)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- **${k}**: ${v}`),
    '',
    '## Duplicados WL (enriquecer, no re-sembrar)',
    '',
    ...wlDupes.map(
      (e) => `- \`${e.mapsToLegacyId}\` ← ${e.nameEn} / ${e.nameEs}`,
    ),
    '',
    '## Ítems ambiguos (sin cues EN/ES)',
    '',
    ...(ambiguous.length
      ? ambiguous.slice(0, 40).map((e) => `- ${e.id}: ${e.nameEn}`)
      : ['_Ninguno_']),
    ambiguous.length > 40 ? `\n_… y ${ambiguous.length - 40} más_` : '',
    '',
  ];
  return lines.filter(Boolean).join('\n');
}

function main() {
  const content = readFileSync(MD_PATH, 'utf8');
  const raw = parseMd(content);
  const exercises = pairEntries(raw);

  mkdirSync(dirname(JSON_PATH), { recursive: true });
  mkdirSync(dirname(REPORT_PATH), { recursive: true });

  writeFileSync(JSON_PATH, JSON.stringify(exercises, null, 2) + '\n', 'utf8');
  writeFileSync(REPORT_PATH, buildInventoryReport(exercises), 'utf8');

  console.log(`Parsed ${exercises.length} exercises → ${JSON_PATH}`);
  console.log(`Report → ${REPORT_PATH}`);
  console.log(`  WL enrichments: ${exercises.filter((e) => e.mapsToLegacyId).length}`);
  console.log(`  New accessory: ${exercises.filter((e) => !e.mapsToLegacyId).length}`);
}

main();
