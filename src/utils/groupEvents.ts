import { EventFormData } from '../types/event';
import { undatedBg, yearBg } from './theme';

export type EventGroup = {
  kind: 'year' | 'undated';
  year: string;
  data: EventFormData[];
  backgroundColor: string;
};

const byTitle = (a: EventFormData, b: EventFormData) => a.title.localeCompare(b.title, 'ru');

// События по годам, свежие сверху; без даты — отдельной секцией в конце
export function buildEventGroups(items: EventFormData[]): EventGroup[] {
  const dated = items
    .filter(i => i.date_attended)
    .sort((a, b) => b.date_attended.localeCompare(a.date_attended) || byTitle(a, b));

  const map = new Map<string, EventFormData[]>();
  for (const item of dated) {
    const year = item.date_attended.slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(item);
  }
  const groups: EventGroup[] = Array.from(map.entries()).map(([year, data], i) => ({
    kind: 'year',
    year,
    data,
    backgroundColor: yearBg(i),
  }));

  const undated = items.filter(i => !i.date_attended).sort(byTitle);
  if (undated.length > 0) {
    groups.push({ kind: 'undated', year: 'undated', data: undated, backgroundColor: undatedBg() });
  }
  return groups;
}
