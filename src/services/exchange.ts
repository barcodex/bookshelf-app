// Обмен карточками между дневниками: экспорт обезличенных карточек в JSON и импорт в свой репозиторий.
// Формат файла описан в docs/export-format.md.
import { booksCollection } from './booksService';
import { Collection, loadAll } from './cardsService';
import { concertsCollection } from './concertsService';
import { commitFiles, getLatestCommitSha } from './github';
import { cardBody, parseCard, toSlug } from './markdown';
import { moviesCollection } from './moviesService';
import { Settings } from './storage';
import { exhibitionsSection, lecturesSection, theatreSection } from '../utils/eventSections';
import { SectionId } from '../utils/sections';

export const EXPORT_FORMAT = 'culture-diary-export';
export const EXPORT_VERSION = 1;

export interface ExportedCard {
  section: string;                 // папка в репозитории: books, movies, concerts, theatre, exhibitions, lectures
  slug: string;                    // имя файла без .md
  fields: Record<string, string>;  // фронтматтер без личных полей, значения как в .md
  summary: string;                 // текст раздела «Резюме» (markdown)
}

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exported_at: string;
  cards: ExportedCard[];
}

type AnyCard = { slug: string; [key: string]: unknown };

export interface ExchangeSection {
  id: SectionId;
  folder: string;
  collection: Collection<any>;
  personal: string[];                                 // поля, которые не уходят из дневника
  matchKeys: (fm: Record<string, string>) => string[]; // как узнать ту же карточку под другим именем файла
  date: (fm: Record<string, string>) => string;       // дата для фильтра по году
  title: (fm: Record<string, string>) => string;
}

// Оценка и отзыв личные везде; в карточке их нет в fields, а «Отзыв» не экспортируется вовсе
const COMMON_PERSONAL = ['rating'];

const key = (...parts: (string | undefined)[]) =>
  parts.every(p => p && p.trim()) ? parts.map(p => toSlug(p!)).join('|') : '';
const keys = (...list: string[]) => [...new Set(list.filter(Boolean))];

const eventSection = (id: SectionId, s: typeof theatreSection): ExchangeSection => ({
  id,
  folder: s.collection.folder,
  collection: s.collection,
  personal: COMMON_PERSONAL,
  matchKeys: fm => keys(key(fm.title, fm.date_attended), key(fm.original_title, fm.date_attended)),
  date: fm => fm.date_attended ?? '',
  title: fm => fm.title ?? '',
});

export const exchangeSections: ExchangeSection[] = [
  {
    id: 'books',
    folder: booksCollection.folder,
    collection: booksCollection,
    // Даты чтения, носитель и источник у каждого свои
    personal: [...COMMON_PERSONAL, 'media', 'source', 'date_started', 'date_finished', 'date_abandoned', 'abandoned_at'],
    matchKeys: fm => keys(key(fm.author, fm.title), key(fm.author, fm.original_title)),
    date: fm => fm.date_finished || fm.date_abandoned || fm.date_started || '',
    title: fm => [fm.author, fm.title].filter(Boolean).join(' — '),
  },
  {
    id: 'films',
    folder: moviesCollection.folder,
    collection: moviesCollection,
    // Когда и где смотрел и «не досмотрено» — личное
    personal: [...COMMON_PERSONAL, 'abandoned', 'date_watched', 'where_watched'],
    matchKeys: fm => keys(
      fm.imdb?.match(/tt\d{5,}/)?.[0] ?? '',
      key(fm.title, fm.year),
      key(fm.original_title, fm.year),
    ),
    date: fm => fm.date_watched ?? '',
    title: fm => [fm.title, fm.year && `(${fm.year})`].filter(Boolean).join(' '),
  },
  eventSection('theatre', theatreSection),
  eventSection('exhibitions', exhibitionsSection),
  eventSection('lectures', lecturesSection),
  {
    id: 'concerts',
    folder: concertsCollection.folder,
    collection: concertsCollection,
    personal: COMMON_PERSONAL,
    matchKeys: fm => keys(key(fm.artist, fm.date_attended)),
    date: fm => fm.date_attended ?? '',
    title: fm => fm.artist ?? '',
  },
];

export const sectionByFolder = (folder: string) => exchangeSections.find(s => s.folder === folder);

// Карточки раздела: из кэша, а если его ещё нет — загрузка папки
export async function loadSection(section: ExchangeSection, settings: Settings): Promise<AnyCard[]> {
  const cached = await section.collection.cache.get();
  if (cached && cached.length > 0) return cached;
  return loadAll(section.collection, settings);
}

// ── Экспорт ─────────────────────────────────────────────────────────────

export function exportCard(section: ExchangeSection, item: AnyCard): ExportedCard {
  const { fm, summary } = parseCard(section.collection.serialize(item));
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (v && !section.personal.includes(k)) fields[k] = v;
  }
  return { section: section.folder, slug: item.slug, fields, summary };
}

export function buildExportFile(cards: ExportedCard[]): ExportFile {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exported_at: new Date().toISOString(), cards };
}

export function exportFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `culture-diary-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

// ── Импорт ──────────────────────────────────────────────────────────────

export type ImportErrorCode = 'invalid_json' | 'wrong_format' | 'newer_version' | 'empty';

export class ImportFileError extends Error {
  constructor(public readonly code: ImportErrorCode) {
    super(code);
    this.name = 'ImportFileError';
  }
}

// Значения фронтматтера однострочные: перевод строки внутри значения дописал бы в карточку чужие поля
const oneLine = (v: unknown) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();

export function parseExportFile(text: string): ExportedCard[] {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportFileError('invalid_json');
  }
  if (!data || data.format !== EXPORT_FORMAT || !Array.isArray(data.cards)) throw new ImportFileError('wrong_format');
  if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) throw new ImportFileError('newer_version');

  const cards: ExportedCard[] = [];
  for (const raw of data.cards) {
    if (!raw || typeof raw !== 'object' || !raw.fields || typeof raw.fields !== 'object') continue;
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.fields)) {
      const name = k.trim();
      const value = oneLine(v);
      if (/^[a-z_]+$/.test(name) && value) fields[name] = value;
    }
    cards.push({
      section: String(raw.section ?? ''),
      // Имя файла только из безопасных символов: никаких «../» и подпапок
      slug: toSlug(String(raw.slug ?? '')),
      fields,
      summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    });
  }
  if (cards.length === 0) throw new ImportFileError('empty');
  return cards;
}

export type Resolution = 'skip' | 'fill' | 'replace';

export interface ImportItem {
  id: string;                 // порядковый номер в файле
  card: ExportedCard;
  section: ExchangeSection | null; // null — раздел неизвестен этой версии приложения
  title: string;
  date: string;
  existing: AnyCard | null;   // своя карточка, с которой совпала импортируемая
  targetSlug: string;
  duplicate: boolean;         // такая же карточка уже встречалась в этом файле
}

const buildRaw = (fm: Record<string, string>, summary: string, review: string) =>
  `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n${cardBody(summary, review)}`;

// Импортируемые поля без личных: даже если их кто-то дописал в файл руками, свои даты и оценку они не перетрут
function sharedFields(section: ExchangeSection, card: ExportedCard): Record<string, string> {
  return Object.fromEntries(Object.entries(card.fields).filter(([k]) => !section.personal.includes(k)));
}

// Сопоставляет карточки файла со своими: по имени файла или по ключевым полям
export function planImport(cards: ExportedCard[], existingBySection: Map<string, AnyCard[]>): ImportItem[] {
  const index = new Map<string, Map<string, AnyCard>>();
  for (const section of exchangeSections) {
    const map = new Map<string, AnyCard>();
    for (const item of existingBySection.get(section.folder) ?? []) {
      map.set(`slug:${item.slug}`, item);
      const { fm } = parseCard(section.collection.serialize(item));
      for (const k of section.matchKeys(fm)) map.set(k, item);
    }
    index.set(section.folder, map);
  }

  const seen = new Set<string>();
  return cards.map((card, i) => {
    const section = sectionByFolder(card.section) ?? null;
    const fields = card.fields;
    let existing: AnyCard | null = null;
    let targetSlug = card.slug;
    if (section) {
      const map = index.get(section.folder)!;
      const candidates = [`slug:${card.slug}`, ...section.matchKeys(fields)];
      existing = candidates.map(k => map.get(k)).find(Boolean) ?? null;
      if (existing) targetSlug = existing.slug;
      if (!targetSlug) targetSlug = `import-${i + 1}`;
    }
    const seenKey = `${card.section}/${targetSlug}`;
    const duplicate = seen.has(seenKey);
    seen.add(seenKey);
    return {
      id: String(i),
      card,
      section,
      title: section ? section.title(fields) || targetSlug : card.slug,
      date: section ? section.date(fields) : '',
      existing,
      targetSlug,
      duplicate,
    };
  });
}

const mergeTags = (a = '', b = '') =>
  [...new Set([...a.split(','), ...b.split(',')].map(t => t.trim()).filter(Boolean))].join(', ');

// Готовит содержимое файла; null — менять нечего
export function resolveItem(item: ImportItem, resolution: Resolution): AnyCard | null {
  const { section, card, existing } = item;
  if (!section || item.duplicate || resolution === 'skip') return null;
  const incoming = sharedFields(section, card);

  if (!existing) {
    return section.collection.parse(buildRaw(incoming, card.summary, ''), item.targetSlug);
  }

  const before = section.collection.serialize(existing);
  const cur = parseCard(before);
  const fm = { ...cur.fm };
  for (const [k, v] of Object.entries(incoming)) {
    if (k === 'tags') fm.tags = mergeTags(fm.tags, v);
    else if (resolution === 'replace' || !fm[k]) fm[k] = v;
  }
  const summary = card.summary && (resolution === 'replace' || !cur.summary) ? card.summary : cur.summary;
  // Отзыв и личные поля остаются своими в любом случае
  const merged = section.collection.parse(buildRaw(fm, summary, cur.review), existing.slug);
  return section.collection.serialize(merged) === before ? null : merged;
}

export interface ImportResult {
  commitSha: string | null;
  written: number;
}

export async function runImport(
  settings: Settings,
  items: ImportItem[],
  resolutions: Record<string, Resolution>,
): Promise<ImportResult> {
  const writes: { section: ExchangeSection; card: AnyCard }[] = [];
  for (const item of items) {
    const card = resolveItem(item, resolutions[item.id] ?? 'fill');
    if (card && item.section) writes.push({ section: item.section, card });
  }
  if (writes.length === 0) return { commitSha: null, written: 0 };

  // Если ветка ушла вперёд между чтением и записью, GitHub откажет, и импорт можно просто повторить
  const commitSha = await commitFiles(
    settings,
    await getLatestCommitSha(settings),
    writes.map(w => ({ path: `${w.section.folder}/${w.card.slug}.md`, content: w.section.collection.serialize(w.card) })),
    `Import ${writes.length} card${writes.length === 1 ? '' : 's'}`,
  );

  // Карточки сразу видны в лентах; SHA кэша не двигаем — сверка с веткой дочитает и чужие изменения, если были.
  // Кэш, который ещё ни разу не загружался, не трогаем — его заполнит полная загрузка
  for (const w of writes) {
    if (await w.section.collection.cache.getCommitSha() !== null) await w.section.collection.cache.upsert(w.card);
  }
  return { commitSha, written: writes.length };
}
