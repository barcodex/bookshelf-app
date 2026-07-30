import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookFormData } from '../types/book';

const BOOKS_KEY = 'bookshelf_books_cache';
const COMMIT_SHA_KEY = 'bookshelf_commit_sha';
const LAST_SHA_CHECK_KEY = 'bookshelf_last_sha_check';
const SHA_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export async function getCachedBooks(): Promise<BookFormData[] | null> {
  try {
    const raw = await AsyncStorage.getItem(BOOKS_KEY);
    if (!raw) return null;
    const books = JSON.parse(raw) as BookFormData[];
    return books.length > 0 ? books : null;
  } catch {
    return null;
  }
}

export async function getCachedCommitSha(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(COMMIT_SHA_KEY);
  } catch {
    return null;
  }
}

export async function setCachedBooks(books: BookFormData[], commitSha: string): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books)),
      AsyncStorage.setItem(COMMIT_SHA_KEY, commitSha),
    ]);
  } catch {}
}

export async function deleteCachedBook(slug: string): Promise<void> {
  try {
    const books = await getCachedBooks();
    if (books) {
      const filtered = books.filter(b => b.slug !== slug);
      await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(filtered));
    }
  } catch {}
}

export async function upsertCachedBook(book: BookFormData): Promise<void> {
  try {
    const books = await getCachedBooks() || [];
    const index = books.findIndex(b => b.slug === book.slug);
    if (index >= 0) {
      books[index] = book;
    } else {
      books.push(book);
    }
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  } catch {}
}

export async function updateCachedCommitSha(sha: string): Promise<void> {
  try {
    await AsyncStorage.setItem(COMMIT_SHA_KEY, sha);
  } catch {}
}

export async function shouldCheckSha(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SHA_CHECK_KEY);
    if (!raw) return true;
    return Date.now() - parseInt(raw, 10) > SHA_CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

export async function recordShaCheck(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SHA_CHECK_KEY, Date.now().toString());
  } catch {}
}

export async function clearBooksCache(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(BOOKS_KEY),
      AsyncStorage.removeItem(COMMIT_SHA_KEY),
      AsyncStorage.removeItem(LAST_SHA_CHECK_KEY),
    ]);
  } catch {}
}
