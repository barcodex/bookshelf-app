import { CardCache } from './cardCache';
import { CommitFile, GitHubError, commitFiles, getChangedFiles, getFile, getLatestCommitSha, listDirectory, saveFile } from './github';
import { carryOverFrontmatter } from './markdown';
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

  // Файлы читаем параллельно, а кэш меняем по очереди: upsert и remove — это «прочитать
  // весь кэш, поправить, записать», и одновременные вызовы затирали бы друг друга
  const ops = await Promise.all(
    changes.map(async change => {
      const removed: string[] = [];
      if (change.status === 'renamed' && change.previous_filename?.startsWith(prefix)
        && change.previous_filename !== change.filename) {
        removed.push(slugFromPath(collection, change.previous_filename));
      }
      // Файл переехал из папки раздела в другое место
      if (!change.filename.startsWith(prefix) || !change.filename.endsWith('.md')) return { removed, item: null };
      const slug = slugFromPath(collection, change.filename);
      if (change.status === 'removed') return { removed: [...removed, slug], item: null };
      const { content } = await getFile(settings, change.filename, newSha);
      return { removed, item: collection.parse(content, slug) };
    })
  );
  for (const op of ops) {
    for (const slug of op.removed) await collection.cache.remove(slug);
    if (op.item) await collection.cache.upsert(op.item);
  }

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

// Текст карточки для записи: serialize плюс строки frontmatter из прежнего файла, которых
// приложение не знает (их нет среди полей разобранной карточки)
export function cardContent<T extends { slug: string }>(
  collection: Collection<T>,
  item: T,
  original: string | undefined,
): string {
  const serialized = collection.serialize(item);
  if (original === undefined) return serialized;
  let known: Set<string>;
  try {
    known = new Set(Object.keys(collection.parse(original, item.slug)));
  } catch {
    return serialized;
  }
  return carryOverFrontmatter(original, serialized, key => !known.has(key));
}

// Переводит кэш с прежнего коммита на commitSha, подтягивая и свои, и чужие изменения.
// Просто записать новый SHA нельзя: если между ними были коммиты из другого места
// (правки вручную, другое устройство), кэш остался бы без них, и следующее сохранение
// перезаписало бы файлы устаревшими данными.
async function advanceCache<T extends { slug: string }>(
  collection: Collection<T>,
  settings: Settings,
  cachedSha: string,
  commitSha: string,
  saved: T[],
): Promise<void> {
  try {
    await applyUpdate(collection, settings, cachedSha, commitSha);
  } catch {
    // Не вышло сверить: кладём свои карточки, а SHA оставляем прежним — следующая сверка догонит
    for (const item of saved) await collection.cache.upsert(item);
  }
}

// Создаёт или перезаписывает карточку и обновляет кэш; возвращает SHA коммита
export async function saveCard<T extends { slug: string }>(
  collection: Collection<T>,
  settings: Settings,
  item: T,
): Promise<string> {
  const path = cardPath(collection, item.slug);
  let existing: { content: string; sha: string } | undefined;
  try {
    existing = await getFile(settings, path);
  } catch (e) {
    if (!(e instanceof GitHubError && e.type === 'not_found')) throw e;
  }
  const commitSha = await saveFile(settings, path, cardContent(collection, item, existing?.content), existing?.sha);
  // Кэш, который ещё ни разу не загружался, не трогаем — иначе в нём окажется одна эта карточка
  const cachedSha = await collection.cache.getCommitSha();
  if (cachedSha !== null) await advanceCache(collection, settings, cachedSha, commitSha, [item]);
  return commitSha;
}

// Как saveCard, но вместе с карточкой одним коммитом пишет и удаляет другие файлы (картинки)
export async function saveCardWithFiles<T extends { slug: string }>(
  collection: Collection<T>,
  settings: Settings,
  item: T,
  extra: CommitFile[],
): Promise<string> {
  if (extra.length === 0) return saveCard(collection, settings, item);
  const path = cardPath(collection, item.slug);
  for (let attempt = 0; ; attempt++) {
    const headSha = await getLatestCommitSha(settings);
    let original: string | undefined;
    try {
      original = (await getFile(settings, path, headSha)).content;
    } catch (e) {
      if (!(e instanceof GitHubError && e.type === 'not_found')) throw e;
    }
    try {
      const cachedSha = await collection.cache.getCommitSha();
      const commitSha = await commitFiles(
        settings,
        headSha,
        [{ path, content: cardContent(collection, item, original) }, ...extra],
        `${original === undefined ? 'Add' : 'Update'} ${path}`,
      );
      if (cachedSha !== null) await advanceCache(collection, settings, cachedSha, commitSha, [item]);
      return commitSha;
    } catch (e) {
      if (attempt < 2 && e instanceof GitHubError && e.status === 422) continue;
      throw e;
    }
  }
}

// Меняет поля сразу у нескольких карточек одним коммитом. Каждую карточку перед записью
// читает с GitHub на том коммите, поверх которого пишет, и меняет в ней только поля из patch.
// Кэш для этого не используется: он может отставать или быть собран старой версией
// приложения, не знающей части полей, и тогда запись из него стёрла бы эти поля.
// Возвращает обновлённые карточки (пустой список, если менять нечего).
export async function saveCardsPatch<T extends { slug: string }>(
  collection: Collection<T>,
  settings: Settings,
  patch: Record<string, Partial<T>>,
  message: string,
): Promise<T[]> {
  for (let attempt = 0; ; attempt++) {
    const headSha = await getLatestCommitSha(settings);
    const files: { path: string; content: string }[] = [];
    const updated: T[] = [];
    for (let i = 0; i < Object.keys(patch).length; i += BATCH_SIZE) {
      const slugs = Object.keys(patch).slice(i, i + BATCH_SIZE);
      await Promise.all(slugs.map(async slug => {
        const path = cardPath(collection, slug);
        let original: string;
        try {
          original = (await getFile(settings, path, headSha)).content;
        } catch (e) {
          // Карточку удалили или переименовали в другом месте — менять нечего
          if (e instanceof GitHubError && e.type === 'not_found') return;
          throw e;
        }
        const item = { ...collection.parse(original, slug), ...patch[slug], slug };
        files.push({ path, content: cardContent(collection, item, original) });
        updated.push(item);
      }));
    }
    if (files.length === 0) return [];
    try {
      const cachedSha = await collection.cache.getCommitSha();
      const commitSha = await commitFiles(settings, headSha, files, message);
      if (cachedSha !== null) await advanceCache(collection, settings, cachedSha, commitSha, updated);
      return updated;
    } catch (e) {
      // Ветка сдвинулась между чтением и записью — пробуем ещё раз на свежем состоянии
      if (attempt < 2 && e instanceof GitHubError && e.status === 422) continue;
      throw e;
    }
  }
}

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
