import { BookFormData } from '../types/book';
import { booksCache } from './booksCache';
import { Collection, LoadProgress, applyUpdate, loadAll, saveCard } from './cardsService';
import { parse, serialize } from './markdown';
import { Settings } from './storage';

export type { LoadProgress } from './cardsService';
export { todayIso } from './cardsService';

export const booksCollection: Collection<BookFormData> = {
  folder: 'books',
  parse,
  serialize,
  cache: booksCache,
};

export function loadAllBooks(settings: Settings, onProgress?: (p: LoadProgress) => void): Promise<BookFormData[]> {
  return loadAll(booksCollection, settings, onProgress);
}

export function applyIncrementalUpdate(settings: Settings, oldSha: string, newSha: string): Promise<void> {
  return applyUpdate(booksCollection, settings, oldSha, newSha);
}

// Сохраняет существующую карточку и обновляет кэш; возвращает SHA коммита
export function saveBook(settings: Settings, book: BookFormData): Promise<string> {
  return saveCard(booksCollection, settings, book);
}
