import { BookFormData } from '../types/book';
import {
  deleteCachedBook,
  setCachedBooks,
  updateCachedCommitSha,
  upsertCachedBook,
} from './booksCache';
import { getChangedFiles, getFile, getLatestCommitSha, listDirectory } from './github';
import { parse } from './markdown';
import { Settings } from './storage';

const BATCH_SIZE = 20;

export type LoadProgress = { current: number; total: number };

function slugFromPath(path: string): string {
  return path.replace('books/', '').replace('.md', '');
}

export async function loadAllBooks(
  settings: Settings,
  onProgress?: (p: LoadProgress) => void,
): Promise<BookFormData[]> {
  const [files, commitSha] = await Promise.all([
    listDirectory(settings, 'books'),
    getLatestCommitSha(settings),
  ]);

  const mdFiles = files.filter(f => f.name.endsWith('.md'));
  console.log(`[booksService] loadAllBooks found ${mdFiles.length} markdown files. Commit: ${commitSha}`);
  console.log(`[booksService] Files: ${mdFiles.map(f => f.name).join(', ')}`);
  const total = mdFiles.length;
  const books: BookFormData[] = [];

  for (let i = 0; i < mdFiles.length; i += BATCH_SIZE) {
    const batch = mdFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async f => {
        const { content } = await getFile(settings, f.path);
        return parse(content, f.name.replace('.md', ''));
      })
    );
    books.push(...results);
    onProgress?.({ current: Math.min(i + BATCH_SIZE, total), total });
  }

  await setCachedBooks(books, commitSha);
  return books;
}

export async function applyIncrementalUpdate(
  settings: Settings,
  oldSha: string,
  newSha: string,
): Promise<void> {
  const changedFiles = await getChangedFiles(settings, oldSha, newSha);
  const bookChanges = changedFiles.filter(
    f => f.filename.startsWith('books/') && f.filename.endsWith('.md')
  );

  await Promise.all(
    bookChanges.map(async change => {
      const slug = slugFromPath(change.filename);
      if (change.status === 'removed') {
        await deleteCachedBook(slug);
      } else {
        const { content } = await getFile(settings, change.filename);
        await upsertCachedBook(parse(content, slug));
      }
    })
  );

  await updateCachedCommitSha(newSha);
}
