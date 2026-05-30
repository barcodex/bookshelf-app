import { openDB } from 'idb';
import { BookFormData } from '../types/book';

const DB_NAME = 'bookshelf';
const DB_VERSION = 1;

function db() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('books')) {
        database.createObjectStore('books', { keyPath: 'slug' });
      }
      if (!database.objectStoreNames.contains('meta')) {
        database.createObjectStore('meta');
      }
    },
  });
}

export async function getCachedBooks(): Promise<BookFormData[] | null> {
  try {
    const books = await (await db()).getAll('books');
    return books.length > 0 ? books : null;
  } catch {
    return null;
  }
}

export async function getCachedCommitSha(): Promise<string | null> {
  try {
    return (await (await db()).get('meta', 'commitSha')) ?? null;
  } catch {
    return null;
  }
}

// Полная замена при первоначальной загрузке с GitHub
export async function setCachedBooks(books: BookFormData[], commitSha: string): Promise<void> {
  try {
    const database = await db();
    const tx = database.transaction(['books', 'meta'], 'readwrite');
    await tx.objectStore('books').clear();
    await Promise.all([
      ...books.map(b => tx.objectStore('books').put(b)),
      tx.objectStore('meta').put(commitSha, 'commitSha'),
    ]);
    await tx.done;
  } catch {}
}

// Точечное обновление/добавление одной книги после сохранения
export async function upsertCachedBook(book: BookFormData): Promise<void> {
  try {
    await (await db()).put('books', book);
  } catch {}
}

export async function updateCachedCommitSha(sha: string): Promise<void> {
  try {
    await (await db()).put('meta', sha, 'commitSha');
  } catch {}
}

export async function clearBooksCache(): Promise<void> {
  try {
    const database = await db();
    const tx = database.transaction(['books', 'meta'], 'readwrite');
    await Promise.all([
      tx.objectStore('books').clear(),
      tx.objectStore('meta').clear(),
    ]);
    await tx.done;
  } catch {}
}
