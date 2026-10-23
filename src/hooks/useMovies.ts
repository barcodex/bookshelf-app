import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCacheContext } from '../context/CacheContext';
import { LoadProgress, loadAll, syncCollection } from '../services/cardsService';
import { GitHubError } from '../services/github';
import { moviesCollection } from '../services/moviesService';
import { getSettings } from '../services/storage';
import { MovieFormData } from '../types/movie';

// Фильмы из кэша с фоновой сверкой SHA, при пустом кэше — полная загрузка папки movies/
export function useMovies() {
  const [movies, setMovies] = useState<MovieFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [githubError, setGithubError] = useState<GitHubError | null>(null);
  const { cacheVersion, forceReload } = useCacheContext();
  const isFocused = useRef(false);

  const load = useCallback(async () => {
    const settings = await getSettings();
    if (!settings) return;

    const cached = await moviesCollection.cache.get();
    if (cached) {
      setMovies(cached);
      setLoading(false);
      try {
        if (await syncCollection(moviesCollection, settings)) {
          const updated = await moviesCollection.cache.get();
          if (updated && isFocused.current) setMovies(updated);
        }
      } catch {}
      return;
    }

    setLoading(true);
    setProgress(null);
    setGithubError(null);
    try {
      setMovies(await loadAll(moviesCollection, settings, p => setProgress(p)));
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
      setMovies(await loadAll(moviesCollection, settings));
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

  const replaceMovie = useCallback((updated: MovieFormData) => {
    setMovies(prev => prev.map(m => (m.slug === updated.slug ? updated : m)));
  }, []);

  return { movies, loading, refreshing, progress, githubError, refresh, forceReload, replaceMovie };
}
