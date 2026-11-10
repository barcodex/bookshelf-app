import { EventFormData } from '../types/event';
import { cardBody, parseCard, parseTags, toSlug } from './markdown';

export interface EventSchema {
  kinds: string[];         // первый — вид по умолчанию
  originalTitle: boolean;  // есть ли поле original_title
  company: boolean;        // есть ли поле company
}

// Ссылка без схемы («kunsthaus.ch/…») дополняется https://
export function normalizeLink(value: string): string {
  const v = value.trim();
  if (!v) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

// Имя файла: название и дата — на одну постановку можно сходить не раз
export function eventSlug(title: string, date: string): string {
  return [title, date].map(toSlug).filter(Boolean).join('-');
}

export function serializeEvent(schema: EventSchema, data: EventFormData): string {
  const originalTitle = data.original_title.trim();
  const fm = [
    '---',
    `title: ${data.title}`,
    schema.originalTitle && originalTitle && originalTitle !== data.title ? `original_title: ${originalTitle}` : null,
    // Вид пишется, только если в разделе их несколько (театр); у выставок и лекций он один
    schema.kinds.length > 1 ? `kind: ${schema.kinds.includes(data.kind) ? data.kind : schema.kinds[0]}` : null,
    data.author.trim()                    ? `author: ${data.author.trim()}`    : null,
    schema.company && data.company.trim() ? `company: ${data.company.trim()}`  : null,
    `venue: ${data.venue}`,
    data.link.trim()                      ? `link: ${normalizeLink(data.link)}` : null,
    data.tags.length                      ? `tags: ${data.tags.join(', ')}`    : null,
    data.rating                           ? `rating: ${data.rating}`           : null,
    `date_attended: ${data.date_attended}`,
    '---',
  ].filter(Boolean).join('\n');

  return `${fm}\n\n${cardBody(data.summary, data.review)}`;
}

export function parseEvent(schema: EventSchema, raw: string, slug: string): EventFormData {
  const { fm, summary, review } = parseCard(raw);
  return {
    slug,
    kind: fm.kind && schema.kinds.includes(fm.kind) ? fm.kind : schema.kinds[0],
    title: fm.title ?? '',
    original_title: fm.original_title ?? '',
    author: fm.author ?? '',
    company: fm.company ?? '',
    venue: fm.venue ?? '',
    link: fm.link ?? '',
    tags: parseTags(fm.tags),
    rating: fm.rating ? parseFloat(fm.rating) || 0 : 0,
    date_attended: fm.date_attended ?? '',
    summary,
    review,
  };
}
