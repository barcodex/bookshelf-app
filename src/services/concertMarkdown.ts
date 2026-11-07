import { ConcertFormData } from '../types/concert';
import { cardBody, parseCard, parseTags, toSlug } from './markdown';

// Принимает ссылку на артиста (с ?si=…, /intl-xx/) или spotify:artist:ID, возвращает каноничную ссылку
export function normalizeSpotify(value: string): string {
  const v = value.trim();
  const id = v.match(/(?:artist[/:])([A-Za-z0-9]{22})\b/)?.[1];
  return id ? `https://open.spotify.com/artist/${id}` : v;
}

// Имя файла: артист и дата концерта — одну группу можно увидеть не раз
export function concertSlug(artist: string, date: string): string {
  return [artist, date].map(toSlug).filter(Boolean).join('-');
}

export function serializeConcert(data: ConcertFormData): string {
  const fm = [
    '---',
    `artist: ${data.artist}`,
    data.kind === 'standup' ? 'kind: standup'                         : null,
    data.support.length ? `support: ${data.support.join(', ')}`        : null,
    `venue: ${data.venue}`,
    data.spotify.trim() ? `spotify: ${normalizeSpotify(data.spotify)}` : null,
    data.tags.length    ? `tags: ${data.tags.join(', ')}`              : null,
    data.rating         ? `rating: ${data.rating}`                     : null,
    `date_attended: ${data.date_attended}`,
    '---',
  ].filter(Boolean).join('\n');

  return `${fm}\n\n${cardBody(data.summary, data.review)}`;
}

export function parseConcert(raw: string, slug: string): ConcertFormData {
  const { fm, summary, review } = parseCard(raw);
  return {
    slug,
    kind: fm.kind === 'standup' ? 'standup' : 'concert',
    artist: fm.artist ?? '',
    support: parseTags(fm.support),
    venue: fm.venue ?? '',
    spotify: fm.spotify ?? '',
    tags: parseTags(fm.tags),
    rating: fm.rating ? parseInt(fm.rating, 10) : 0,
    date_attended: fm.date_attended ?? '',
    summary,
    review,
  };
}
