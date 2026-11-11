import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCacheContext } from '../context/CacheContext';
import { Collection, LoadProgress, loadAll, syncCollection } from '../services/cardsService';
import { GitHubError } from '../services/github';
import { getSettings } from '../services/storage';

// Карточки любого раздела из кэша с фоновой сверкой SHA, при пустом кэше — полная загрузка папки
export function useEventCards<T extends { slug: string }>(collection: Collection<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [githubError, setGithubError] = useState<GitHubError | null>(null);
  const { cacheVersion, forceReload } = useCacheContext();
  const isFocused = useRef(false);

  const load = useCallback(async () => {
    const settings = await getSettings();
    if (!settings) return;

    const cached = await collection.cache.get();
    if (cached) {
      setItems(cached);
      setLoading(false);
      try {
        if (await syncCollection(collection, settings)) {
          const updated = await collection.cache.get();
          if (updated && isFocused.current) setItems(updated);
        }
      } catch {}
      return;
    }

    setLoading(true);
    setProgress(null);
    setGithubError(null);
    try {
      setItems(await loadAll(collection, settings, p => setProgress(p)));
    } catch (e) {
      if (e instanceof GitHubError) setGithubError(e);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [collection]);

  const refresh = useCallback(async () => {
    const settings = await getSettings();
    if (!settings) return;
    setRefreshing(true);
    setGithubError(null);
    try {
      setItems(await loadAll(collection, settings));
    } catch (e) {
      if (e instanceof GitHubError) setGithubError(e);
    } finally {
      setRefreshing(false);
    }
  }, [collection]);

  useFocusEffect(useCallback(() => {
    isFocused.current = true;
    load();
    return () => { isFocused.current = false; };
  }, [load]));

  useEffect(() => {
    if (isFocused.current) load();
  }, [cacheVersion, load]);

  const replaceItem = useCallback((updated: T) => {
    setItems(prev => prev.map(i => (i.slug === updated.slug ? updated : i)));
  }, [collection]);

  return { items, loading, refreshing, progress, githubError, refresh, forceReload, replaceItem };
}
