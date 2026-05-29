import { BookFormData } from '../types/book';

export type YearSection = {
  year: string;
  data: BookFormData[];
  backgroundColor: string;
};

// Предполагает, что books уже отсортированы по date_finished desc.
// При строковом сравнении "2023-12-15" > "2023-01-01" > "2023",
// поэтому книги с точной датой автоматически идут перед year-only в каждой группе.
export function groupByYear(books: BookFormData[]): YearSection[] {
  const map = new Map<string, BookFormData[]>();
  for (const book of books) {
    const year = book.date_finished.slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(book);
  }
  // Map сохраняет порядок вставки, а books уже отсортированы desc → годы идут от нового к старому
  return Array.from(map.entries()).map(([year, data], i) => ({
    year,
    data,
    backgroundColor: yearColor(i),
  }));
}

function yearColor(index: number): string {
  const v = Math.max(228, 252 - index * 6);
  return `rgb(${v},${v},${v})`;
}

export function isYearOnly(dateFinished: string): boolean {
  return /^\d{4}$/.test(dateFinished);
}

export function formatDisplayDate(dateFinished: string): string {
  if (isYearOnly(dateFinished)) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(
      new Date(dateFinished + 'T00:00:00')
    );
  } catch {
    return '';
  }
}
