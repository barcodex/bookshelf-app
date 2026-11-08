import { Language, t } from '../services/i18n';
import { ConcertFormData } from '../types/concert';
import { undatedBg, yearBg } from './theme';

export type ConcertSectionKind = 'year' | 'undated';

export type ConcertSection = {
  kind: ConcertSectionKind;
  year: string;
  data: ConcertFormData[];
  backgroundColor: string;
};

const byArtist = (a: ConcertFormData, b: ConcertFormData) => a.artist.localeCompare(b.artist, 'ru');

// Концерты по годам, свежие сверху; без даты — отдельной секцией в конце
export function buildConcertSections(concerts: ConcertFormData[], includeUndated = true): ConcertSection[] {
  const dated = concerts
    .filter(c => c.date_attended)
    .sort((a, b) => b.date_attended.localeCompare(a.date_attended) || byArtist(a, b));

  const map = new Map<string, ConcertFormData[]>();
  for (const concert of dated) {
    const year = concert.date_attended.slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(concert);
  }
  const sections: ConcertSection[] = Array.from(map.entries()).map(([year, data], i) => ({
    kind: 'year',
    year,
    data,
    backgroundColor: yearBg(i),
  }));

  const undated = concerts.filter(c => !c.date_attended).sort(byArtist);
  if (includeUndated && undated.length > 0) {
    sections.push({ kind: 'undated', year: 'undated', data: undated, backgroundColor: undatedBg() });
  }
  return sections;
}

// «Unibet Arena, Tallinn · + Soilwork, Orbit Culture», у стендапа впереди «Стендап»
export function concertSubtitle(concert: ConcertFormData, language: Language): string {
  return [
    concert.kind === 'standup' ? t(language, 'concert.kindStandup') : '',
    concert.venue,
    concert.support.length ? `+ ${concert.support.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

// «Концертов: 5 · стендап: 2» — стендап считается отдельно, для итогов года
export function concertCountLabel(concerts: ConcertFormData[], language: Language): string {
  const standup = concerts.filter(c => c.kind === 'standup').length;
  const music = t(language, 'concert.count').replace('{count}', String(concerts.length - standup));
  if (standup === 0) return music;
  const comedy = t(language, 'concert.countStandup').replace('{count}', String(standup));
  return concerts.length === standup ? comedy.charAt(0).toUpperCase() + comedy.slice(1) : `${music} · ${comedy}`;
}
