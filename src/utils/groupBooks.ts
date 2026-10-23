import { Language, toIntlLocale } from '../services/i18n';
import { BookFormData } from '../types/book';
import { abandonedBg, readingBg, undatedBg, yearBg } from './theme';

export type SectionKind = 'reading' | 'year' | 'undated' | 'abandoned';

export type YearSection = {
  kind: SectionKind;
  year: string;
  data: BookFormData[];
  backgroundColor: string;
};

// Предполагает, что books уже отсортированы по date_finished desc.
export function groupByYear(books: BookFormData[]): YearSection[] {
  const map = new Map<string, BookFormData[]>();
  for (const book of books) {
    const year = book.date_finished.slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(book);
  }
  return Array.from(map.entries()).map(([year, data], i) => ({
    kind: 'year' as SectionKind,
    year,
    data,
    backgroundColor: yearBg(i),
  }));
}

export function buildSections(books: BookFormData[]): YearSection[] {
  // Брошенные книги не попадают в таймлайн — только в отдельную секцию внизу
  const abandoned = books
    .filter(b => b.date_abandoned)
    .sort((a, b) => b.date_abandoned.localeCompare(a.date_abandoned));
  books = books.filter(b => !b.date_abandoned);

  const reading = books.filter(b => b.date_started && !b.date_finished);

  const finished = books
    .filter(b => b.date_finished)
    .sort((a, b) => b.date_finished.localeCompare(a.date_finished));

  const undated = books
    .filter(b => !b.date_started && !b.date_finished)
    .sort((a, b) => {
      const aLast = a.author.split(' ').pop() ?? '';
      const bLast = b.author.split(' ').pop() ?? '';
      const cmp = aLast.localeCompare(bLast, 'ru');
      if (cmp !== 0) return cmp;
      const cmp2 = a.author.localeCompare(b.author, 'ru');
      if (cmp2 !== 0) return cmp2;
      return a.title.localeCompare(b.title, 'ru');
    });

  const sections: YearSection[] = [];

  if (reading.length > 0) {
    sections.push({ kind: 'reading', year: 'reading', data: reading, backgroundColor: readingBg() });
  }

  sections.push(...groupByYear(finished));

  if (undated.length > 0) {
    sections.push({ kind: 'undated', year: 'undated', data: undated, backgroundColor: undatedBg() });
  }

  if (abandoned.length > 0) {
    sections.push({ kind: 'abandoned', year: 'abandoned', data: abandoned, backgroundColor: abandonedBg() });
  }

  return sections;
}

export function formatFullDate(date: string, language: Language): string {
  if (!date) return '';
  if (isYearOnly(date)) return date;
  try {
    return new Intl.DateTimeFormat(toIntlLocale(language), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
      new Date(date + 'T00:00:00')
    );
  } catch {
    return '';
  }
}

export function isYearOnly(date: string): boolean {
  return /^\d{4}$/.test(date);
}

export function formatDisplayDate(date: string, language: Language): string {
  if (!date || isYearOnly(date)) return '';
  try {
    return new Intl.DateTimeFormat(toIntlLocale(language), { day: 'numeric', month: 'long' }).format(
      new Date(date + 'T00:00:00')
    );
  } catch {
    return '';
  }
}
