import { BookFormData, BookMedia } from '../types/book';

// Таблица транслитерации для авто-генерации slug
const TRANSLIT: Record<string, string> = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z',
  и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r',
  с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh',
  щ:'shch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
};

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(c => TRANSLIT[c] ?? (c.match(/[a-z0-9]/) ? c : '-'))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function autoSlug(author: string, title: string): string {
  const lastName = author.trim().split(/\s+/).pop() ?? author;
  return [lastName, title]
    .map(toSlug)
    .filter(Boolean)
    .join('-');
}

export function serialize(data: BookFormData): string {
  const fm = [
    '---',
    `title: ${data.title}`,
    `original_title: ${data.original_title || data.title}`,
    `author: ${data.author}`,
    `year: ${data.year}`,
    `original_language: ${data.original_language}`,
    data.media            ? `media: ${data.media}`                    : null,
    data.source           ? `source: ${data.source}`                  : null,
    data.tags.length      ? `tags: ${data.tags.join(', ')}`           : null,
    data.rating           ? `rating: ${data.rating}`                  : null,
    `date_started: ${data.date_started}`,
    `date_finished: ${data.date_finished}`,
    '---',
  ].filter(Boolean).join('\n');

  return `${fm}\n\n## Резюме\n\n${data.summary}\n\n## Отзыв\n\n${data.review}\n`;
}

export function parse(raw: string, slug: string): BookFormData {
  const parts = raw.split(/^---$/m);
  if (parts.length < 3) throw new Error('Некорректный формат файла');

  const fmLines = parts[1].trim().split('\n');
  const fm: Record<string, string> = {};
  for (const line of fmLines) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }

  const body = parts.slice(2).join('---');
  const summaryMatch = body.match(/##\s+Резюме\s*\n([\s\S]*?)(?=\n##(?!#)|$)/);
  const reviewMatch = body.match(/##\s+Отзыв\s*\n([\s\S]*?)(?=\n##(?!#)|$)/);

  return {
    slug,
    title: fm.title ?? '',
    original_title: fm.original_title ?? '',
    author: fm.author ?? '',
    year: fm.year ?? '',
    original_language: fm.original_language ?? 'ru',
    media: (fm.media ?? '') as BookMedia,
    source: fm.source ?? '',
    tags: fm.tags ? fm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    rating: fm.rating ? parseInt(fm.rating, 10) : 0,
    date_started: fm.date_started ?? '',
    date_finished: fm.date_finished ?? '',
    summary: summaryMatch ? summaryMatch[1].trim() : '',
    review: reviewMatch ? reviewMatch[1].trim() : '',
  };
}
