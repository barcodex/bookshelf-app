import { MovieFormData } from '../types/movie';
import { undatedBg, yearBg } from './theme';

export type MovieSectionKind = 'year' | 'undated';

export type MovieSection = {
  kind: MovieSectionKind;
  year: string;
  data: MovieFormData[];
  backgroundColor: string;
};

const byTitle = (a: MovieFormData, b: MovieFormData) => a.title.localeCompare(b.title, 'ru');

// Фильмы по годам просмотра, свежие сверху; без даты — отдельной секцией в конце.
// Недосмотренные («не осилил») остаются на своей дате.
export function buildMovieSections(movies: MovieFormData[], includeUndated = true): MovieSection[] {
  const watched = movies
    .filter(m => m.date_watched)
    .sort((a, b) => b.date_watched.localeCompare(a.date_watched) || byTitle(a, b));

  const map = new Map<string, MovieFormData[]>();
  for (const movie of watched) {
    const year = movie.date_watched.slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(movie);
  }
  const sections: MovieSection[] = Array.from(map.entries()).map(([year, data], i) => ({
    kind: 'year',
    year,
    data,
    backgroundColor: yearBg(i),
  }));

  const undated = movies.filter(m => !m.date_watched).sort(byTitle);
  if (includeUndated && undated.length > 0) {
    sections.push({ kind: 'undated', year: 'undated', data: undated, backgroundColor: undatedBg() });
  }
  return sections;
}

export function movieSubtitle(movie: MovieFormData): string {
  return [movie.director, movie.year].filter(Boolean).join(', ');
}
