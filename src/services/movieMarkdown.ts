import { MovieFormData } from '../types/movie';
import { cardBody, parseCard, parseTags } from './markdown';

// Принимает ссылку IMDb или голый идентификатор tt1234567, возвращает каноничную ссылку
export function normalizeImdb(value: string): string {
  const v = value.trim();
  const id = v.match(/\btt\d{5,}\b/)?.[0];
  return id ? `https://www.imdb.com/title/${id}/` : v;
}

export function serializeMovie(data: MovieFormData): string {
  const originalTitle = data.original_title.trim();
  const fm = [
    '---',
    `title: ${data.title}`,
    originalTitle && originalTitle !== data.title ? `original_title: ${originalTitle}` : null,
    `director: ${data.director}`,
    `year: ${data.year}`,
    data.imdb.trim()   ? `imdb: ${normalizeImdb(data.imdb)}`  : null,
    data.tags.length   ? `tags: ${data.tags.join(', ')}`      : null,
    data.rating        ? `rating: ${data.rating}`             : null,
    data.abandoned     ? 'abandoned: true'                    : null,
    `date_watched: ${data.date_watched}`,
    '---',
  ].filter(Boolean).join('\n');

  return `${fm}\n\n${cardBody(data.summary, data.review)}`;
}

export function parseMovie(raw: string, slug: string): MovieFormData {
  const { fm, summary, review } = parseCard(raw);
  return {
    slug,
    title: fm.title ?? '',
    original_title: fm.original_title ?? '',
    director: fm.director ?? '',
    year: fm.year ?? '',
    imdb: fm.imdb ?? '',
    tags: parseTags(fm.tags),
    rating: fm.rating ? parseInt(fm.rating, 10) : 0,
    abandoned: fm.abandoned === 'true',
    date_watched: fm.date_watched ?? '',
    summary,
    review,
  };
}
