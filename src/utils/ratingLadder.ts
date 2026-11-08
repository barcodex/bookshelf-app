// «Лестница рейтинга»: все карточки раздела одним списком, между ними линии целых оценок 10…0.
// Рейтинг карточки задаётся её местом: n карточек между линиями k и k+1 получают
// k + n/(n+1), …, k + 1/(n+1) сверху вниз. Под линией 0 лежат карточки без оценки.
// Промежуток, в котором ничего не поменялось, сохраняет записанные оценки:
// так целые оценки из формы не превращаются в дробные, пока их не трогали.

export const TOP = 10;

export type LadderItem = { kind: 'line'; value: number } | { kind: 'card'; slug: string };

export interface Rated {
  slug: string;
  rating: number; // 0 = без оценки
}

export const itemKey = (it: LadderItem) => (it.kind === 'line' ? `line:${it.value}` : it.slug);

// Промежуток [k, k+1), в который попадает сохранённая оценка; 10 — в верхний [9, 10]
export const gapOf = (rating: number) => Math.min(TOP - 1, Math.floor(rating));

// Порядок по сохранённым оценкам; при равных оценках — порядок `cards` (вызывающий решает, какой)
export function buildLadder(cards: Rated[]): LadderItem[] {
  const seq: LadderItem[] = [{ kind: 'line', value: TOP }];
  for (let k = TOP - 1; k >= 0; k--) {
    cards
      .filter(c => c.rating > 0 && gapOf(c.rating) === k)
      .sort((a, b) => b.rating - a.rating)
      .forEach(c => seq.push({ kind: 'card', slug: c.slug }));
    seq.push({ kind: 'line', value: k });
  }
  cards.filter(c => !(c.rating > 0)).forEach(c => seq.push({ kind: 'card', slug: c.slug }));
  return seq;
}

// Содержимое каждого промежутка (ключ — нижняя линия) для сравнения «трогали или нет»
export function gapSignature(seq: LadderItem[]): Record<number, string> {
  const sig: Record<number, string> = {};
  let current: string[] = [];
  for (const it of seq) {
    if (it.kind === 'line') { sig[it.value] = current.join('\n'); current = []; }
    else current.push(it.slug);
  }
  return sig;
}

// Линии идут сверху вниз 10, 9, … 0, линия 10 первая; карточек над ней нет
export function isValid(seq: LadderItem[]): boolean {
  if (seq[0]?.kind !== 'line' || seq[0].value !== TOP) return false;
  let last = TOP + 1;
  for (const it of seq) {
    if (it.kind !== 'line') continue;
    if (it.value !== last - 1) return false;
    last = it.value;
  }
  return last === 0;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export function computeRatings(
  seq: LadderItem[],
  original: Record<string, number>,
  originalGaps: Record<number, string>,
): Record<string, number> {
  const result: Record<string, number> = {};
  let gap: string[] = [];
  let belowZero = false;
  for (const it of seq) {
    if (it.kind === 'card') {
      if (belowZero) result[it.slug] = 0;
      else gap.push(it.slug);
      continue;
    }
    if (it.value < TOP) {
      const untouched = originalGaps[it.value] === gap.join('\n');
      const n = gap.length;
      gap.forEach((slug, i) => {
        result[slug] = untouched ? original[slug] : round2(it.value + (n - i) / (n + 1));
      });
    }
    gap = [];
    if (it.value === 0) belowZero = true;
  }
  return result;
}

// Перемещает элемент на позицию `to` в списке без него; null, если так ставить нельзя
export function moveItem(seq: LadderItem[], key: string, to: number): LadderItem[] | null {
  const from = seq.findIndex(it => itemKey(it) === key);
  if (from < 0) return null;
  const rest = seq.filter((_, i) => i !== from);
  const next = [...rest.slice(0, to), seq[from], ...rest.slice(to)];
  if (next.every((it, i) => it === seq[i])) return null;
  return isValid(next) ? next : null;
}
