// Картинки карточек: постер и свои изображения лежат файлами в репозитории,
// в <раздел>/images/<slug>/, а во frontmatter карточки записаны только их имена.
// Пока всё это работает только в вебе: на телефоне нужны отдельные пакеты Expo.
import { openDB } from 'idb';
import { Platform } from 'react-native';
import { CommitFile, getRawFile } from './github';
import { Settings, getSettings } from './storage';

export const imagesSupported = Platform.OS === 'web';

export function imagePath(folder: string, slug: string, name: string): string {
  return `${folder}/images/${slug}/${name}`;
}

// Имена уникальны, поэтому картинку по пути можно кэшировать навсегда:
// заменённый постер получает новое имя, а не перезаписывает старый файл
export function newImageName(kind: 'poster' | 'image'): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const rand = Math.random().toString(16).slice(2, 6);
  return `${kind === 'poster' ? 'poster-' : ''}${date}-${rand}.jpg`;
}

// ── Ещё не сохранённые картинки ─────────────────────────────────────────
// Форма хранит в карточке только имя файла, а сами данные лежат здесь до сохранения

const pending = new Map<string, Blob>();

export function addPending(name: string, blob: Blob) {
  pending.set(name, blob);
}

export function isPending(name: string): boolean {
  return pending.has(name);
}

// ── Кэш скачанных картинок ──────────────────────────────────────────────

const dbPromise = imagesSupported && typeof indexedDB !== 'undefined'
  ? openDB('repo-images', 1, { upgrade: db => { db.createObjectStore('images'); } }).catch(() => null)
  : Promise.resolve(null);

const urls = new Map<string, string>();       // путь → object URL в этой вкладке
const loading = new Map<string, Promise<string>>();

async function cacheBlob(path: string, blob: Blob) {
  try {
    const db = await dbPromise;
    await db?.put('images', blob, path);
  } catch {}
}

function objectUrl(key: string, blob: Blob): string {
  const existing = urls.get(key);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  return url;
}

// Адрес картинки для <Image>: из ещё не сохранённых, из кэша или с GitHub
export async function imageUrl(path: string, name: string, settings?: Settings | null): Promise<string> {
  const draft = pending.get(name);
  if (draft) return objectUrl(`pending:${name}`, draft);
  const ready = urls.get(path);
  if (ready) return ready;
  const inFlight = loading.get(path);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const db = await dbPromise;
      const cached: Blob | undefined = await db?.get('images', path);
      if (cached) return objectUrl(path, cached);
    } catch {}
    const s = settings ?? await getSettings();
    if (!s) throw new Error('no settings');
    const blob = await getRawFile(s, path);
    await cacheBlob(path, blob);
    return objectUrl(path, blob);
  })();
  loading.set(path, promise);
  try {
    return await promise;
  } finally {
    loading.delete(path);
  }
}

// ── Подготовка картинок ─────────────────────────────────────────────────

export const POSTER_MAX_SIDE = 600;
export const IMAGE_MAX_SIDE = 1600;

// Уменьшает картинку до maxSide по длинной стороне (не увеличивает) и сохраняет в JPEG.
// Перекодирование заодно убирает EXIF с геометками.
export async function prepareImage(blob: Blob, maxSide: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  // Прозрачный фон PNG в JPEG стал бы чёрным
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.85));
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

// Картинка из буфера обмена (то, что скопировано через «Копировать изображение»)
export async function readClipboardImage(): Promise<Blob | null> {
  if (!navigator.clipboard?.read) return null;
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find(t => t.startsWith('image/'));
    if (type) return item.getType(type);
  }
  return null;
}

// Выбор файлов с диска
export function pickImageFiles(multiple: boolean): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.click();
  });
}

// ── Запись в репозиторий ────────────────────────────────────────────────

type WithImages = { slug: string; poster: string; images: string[] };

const allNames = (card: WithImages | undefined) =>
  card ? [card.poster, ...card.images].filter(Boolean) : [];

// Файлы для коммита: новые картинки и удаление тех, что убрали из карточки
export async function imageCommitFiles(
  folder: string,
  next: WithImages,
  previous?: WithImages,
): Promise<CommitFile[]> {
  const files: CommitFile[] = [];
  for (const name of allNames(next)) {
    const blob = pending.get(name);
    if (blob) files.push({ path: imagePath(folder, next.slug, name), base64: await blobToBase64(blob) });
  }
  const kept = new Set(allNames(next));
  for (const name of allNames(previous)) {
    if (!kept.has(name) && !pending.has(name)) {
      files.push({ path: imagePath(folder, previous!.slug, name), remove: true });
    }
  }
  return files;
}

// После коммита: сохранённые картинки переезжают из черновиков в кэш, чтобы не скачивать их снова
export async function commitPending(folder: string, card: WithImages) {
  for (const name of allNames(card)) {
    const blob = pending.get(name);
    if (!blob) continue;
    const path = imagePath(folder, card.slug, name);
    await cacheBlob(path, blob);
    const draftUrl = urls.get(`pending:${name}`);
    if (draftUrl) {
      urls.delete(`pending:${name}`);
      urls.set(path, draftUrl);
    }
    pending.delete(name);
  }
}
