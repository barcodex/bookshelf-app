import { CardCache } from './cardCache';
import { GitHubError, getChangedFiles, getFile, getLatestCommitSha, listDirectory, saveFile } from './github';
import { Settings } from './storage';

const BATCH_SIZE = 20;

export type LoadProgress = { current: number; total: number };

// Раздел дневника: папка в репозитории, формат карточки и кэш
export interface Collection<T extends { slug: string }> {
  folder: string; // 'books', 'movies'
  parse: (raw: string, slug: string) => T;
  serialize: (item: T) => string;
  cache: CardCache<T>;
}

export function cardPath<T extends { slug: string }>(collection: Collection<T>, slug: string): string {
  return `${collection.folder}/${slug}.md`;
}

function slugFromPath<T extends { slug: string }>(collection: Collection<T>, path: string): string {
  return path.slice(collection.folder.length + 1).replace(/\.md$/, '');
}

export async function loadAll<T extends { slug: string }>(
  collection: Collection<T>,
  settings: Settings,
  onProgress?: (p: LoadProgress) => void,
): Promise<T[]> {
  const [files, commitSha] = await Promise.all([
    listDirectory(settings, collection.folder).catch(e => {
      // Папки раздела ещё нет — значит, карточек нет; её создаст первое сохранение
      if (e instanceof GitHubError && e.type === 'not_found') return [];
      throw e;
    }),
    getLatestCommitSha(settings),
  ]);

  const mdFiles = files.filter(f => f.name.endsWith('.md'));
  console.log(`[cardsService] ${collection.folder}: ${mdFiles.length} markdown files. Commit: ${commitSha}`);
  const total = mdFiles.length;
  const items: T[] = [];

  for (let i = 0; i < mdFiles.length; i += BATCH_SIZE) {
    const batch = mdFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async f => {
        const { content } = await getFile(settings, f.path);
        return collection.parse(content, f.name.replace('.md', ''));
      })
    );
    items.push(...results);
    onProgress?.({ current: Math.min(i + BATCH_SIZE, total), total });
  }

  await collection.cache.set(items, commitSha);
  return items;
}

export async function applyUpdate<T extends { slug: string }>(
  collection: Collection<T>,
  settings: Settings,
  oldSha: string,
  newSha: string,
): Promise<void> {
  const prefix = `${collection.folder}/`;
  const changedFiles = await getChangedFiles(settings, oldSha, newSha);
  const changes = changedFiles.filter(
    f => (f.filename.startsWith(prefix) && f.filename.endsWith('.md'))
      || (f.status === 'renamed' && f.previous_filename?.startsWith(prefix))
  );

  await Promise.all(
    changes.map(async change => {
      if (change.status === 'renamed' && change.previous_filename?.startsWith(prefix)) {
        const oldSlug = slugFromPath(collection, change.previous_filename);
        if (change.previous_filename !== change.filename) {
          await collection.cache.remove(oldSlug);
        }
      }
      // Файл переехал из папки раздела в другое место
      if (!change.filename.startsWith(prefix) || !change.filename.endsWith('.md')) return;
      const slug = slugFromPath(collection, change.filename);
      if (change.status === 'removed') {
        await collection.cache.remove(slug);
        return;
      }
      const { content } = await getFile(settings, change.filename);
      await collection.cache.upsert(collection.parse(content, slug));
    })
  );

  await collection.cache.updateCommitSha(newSha);
}

// Сравнивает SHA кэша с веткой и подтягивает изменения; true, если кэш обновился
export async function syncCollection<T extends { slug: string }>(
  collection: Collection<T>,
  settings: Settings,
  remoteSha?: string,
): Promise<boolean> {
  const cachedSha = await collection.cache.getCommitSha();
  if (cachedSha === null) return false;
  const latestSha = remoteSha ?? await getLatestCommitSha(settings);
  if (latestSha === cachedSha) return false;
  await applyUpdate(collection, settings, cachedSha, latestSha);
  return true;
}

// Создаёт или перезаписывает карточку и обновляет кэш; возвращает SHA коммита
export async function saveCard<T extends { slug: string }>(
  collection: Collection<T>,
  settings: Settings,
  item: T,
): Promise<string> {
  const path = cardPath(collection, item.slug);
  let sha: string | undefined;
  try {
    sha = (await getFile(settings, path)).sha;
  } catch (e) {
    if (!(e instanceof GitHubError && e.type === 'not_found')) throw e;
  }
  const commitSha = await saveFile(settings, path, collection.serialize(item), sha);
  // Кэш, который ещё ни разу не загружался, не трогаем — иначе в нём окажется одна эта карточка
  if (await collection.cache.getCommitSha() !== null) {
    await collection.cache.upsert(item);
    await collection.cache.updateCommitSha(commitSha);
  }
  return commitSha;
}

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
