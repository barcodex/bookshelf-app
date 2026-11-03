import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCacheContext } from '../context/CacheContext';
import { LoadProgress, loadAll, syncCollection } from '../services/cardsService';
import { GitHubError } from '../services/github';
import { concertsCollection } from '../services/concertsService';
import { getSettings } from '../services/storage';
import { ConcertFormData } from '../types/concert';

// Концерты из кэша с фоновой сверкой SHA, при пустом кэше — полная загрузка папки concerts/
export function useConcerts() {
  const [concerts, setConcerts] = useState<ConcertFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [githubError, setGithubError] = useState<GitHubError | null>(null);
  const { cacheVersion, forceReload } = useCacheContext();
  const isFocused = useRef(false);

  const load = useCallback(async () => {
    const settings = await getSettings();
    if (!settings) return;

    const cached = await concertsCollection.cache.get();
    if (cached) {
      setConcerts(cached);
      setLoading(false);
      try {
        if (await syncCollection(concertsCollection, settings)) {
          const updated = await concertsCollection.cache.get();
          if (updated && isFocused.current) setConcerts(updated);
        }
      } catch {}
      return;
    }

    setLoading(true);
    setProgress(null);
    setGithubError(null);
    try {
      setConcerts(await loadAll(concertsCollection, settings, p => setProgress(p)));
    } catch (e) {
      if (e instanceof GitHubError) setGithubError(e);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const settings = await getSettings();
    if (!settings) return;
    setRefreshing(true);
    setGithubError(null);
    try {
      setConcerts(await loadAll(concertsCollection, settings));
    } catch (e) {
      if (e instanceof GitHubError) setGithubError(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    isFocused.current = true;
    load();
    return () => { isFocused.current = false; };
  }, [load]));

  useEffect(() => {
    if (isFocused.current) load();
  }, [cacheVersion, load]);

  const replaceConcert = useCallback((updated: ConcertFormData) => {
    setConcerts(prev => prev.map(c => (c.slug === updated.slug ? updated : c)));
  }, []);

  return { concerts, loading, refreshing, progress, githubError, refresh, forceReload, replaceConcert };
}
