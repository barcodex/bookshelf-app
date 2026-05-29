import { BookFormData } from '../types/book';

interface Cache {
  books: BookFormData[];
  commitSha: string;
}

const KEY = 'bookshelf_cache';

export function getCachedBooks(): Cache | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cache) : null;
  } catch {
    return null;
  }
}

export function getCachedCommitSha(): string | null {
  return getCachedBooks()?.commitSha ?? null;
}

export function setCachedBooks(books: BookFormData[], commitSha: string): void {
  localStorage.setItem(KEY, JSON.stringify({ books, commitSha }));
}

export function clearBooksCache(): void {
  localStorage.removeItem(KEY);
}
