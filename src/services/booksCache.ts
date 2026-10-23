import { BookFormData, emptyBook } from '../types/book';
import { createCardCache } from './cardCache';

export const booksCache = createCardCache<BookFormData>(
  'bookshelf_books_cache',
  'bookshelf_commit_sha',
  emptyBook,
);

export async function getCachedBooks(): Promise<BookFormData[] | null> {
  const books = await booksCache.get();
  // Пустой кэш книг считаем отсутствующим — экраны перечитают репозиторий
  return books && books.length > 0 ? books : null;
}

export const getCachedCommitSha = booksCache.getCommitSha;
export const setCachedBooks = booksCache.set;
export const deleteCachedBook = booksCache.remove;
export const upsertCachedBook = booksCache.upsert;
export const updateCachedCommitSha = booksCache.updateCommitSha;
export const clearBooksCache = booksCache.clear;
