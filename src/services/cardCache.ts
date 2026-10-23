import AsyncStorage from '@react-native-async-storage/async-storage';

// Кэш карточек одного раздела (книги, фильмы…) и SHA коммита, на котором он собран
export interface CardCache<T extends { slug: string }> {
  get: () => Promise<T[] | null>;
  getCommitSha: () => Promise<string | null>;
  set: (items: T[], commitSha: string) => Promise<void>;
  remove: (slug: string) => Promise<void>;
  upsert: (item: T) => Promise<void>;
  updateCommitSha: (sha: string) => Promise<void>;
  clear: () => Promise<void>;
}

export function createCardCache<T extends { slug: string }>(
  itemsKey: string,
  shaKey: string,
  empty: T,
): CardCache<T> {
  const get = async (): Promise<T[] | null> => {
    try {
      const raw = await AsyncStorage.getItem(itemsKey);
      if (!raw) return null;
      // Дополняем поля, которых нет в кэше, сохранённом старой версией приложения
      return (JSON.parse(raw) as T[]).map(item => ({ ...empty, ...item }));
    } catch {
      return null;
    }
  };

  return {
    get,

    async getCommitSha() {
      try {
        return await AsyncStorage.getItem(shaKey);
      } catch {
        return null;
      }
    },

    async set(items, commitSha) {
      try {
        await Promise.all([
          AsyncStorage.setItem(itemsKey, JSON.stringify(items)),
          AsyncStorage.setItem(shaKey, commitSha),
        ]);
      } catch {}
    },

    async remove(slug) {
      try {
        const items = await get();
        if (items) {
          await AsyncStorage.setItem(itemsKey, JSON.stringify(items.filter(i => i.slug !== slug)));
        }
      } catch {}
    },

    async upsert(item) {
      try {
        const items = await get() || [];
        const index = items.findIndex(i => i.slug === item.slug);
        if (index >= 0) {
          items[index] = item;
        } else {
          items.push(item);
        }
        await AsyncStorage.setItem(itemsKey, JSON.stringify(items));
      } catch {}
    },

    async updateCommitSha(sha) {
      try {
        await AsyncStorage.setItem(shaKey, sha);
      } catch {}
    },

    async clear() {
      try {
        await Promise.all([
          AsyncStorage.removeItem(itemsKey),
          AsyncStorage.removeItem(shaKey),
        ]);
      } catch {}
    },
  };
}
