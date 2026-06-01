import { createContext, useCallback, useContext, useState } from 'react';
import { clearBooksCache } from '../services/booksCache';

interface CacheContextType {
  cacheVersion: number;
  bumpVersion: () => void;   // сигнал экранам перечитать кэш (после инкрементального обновления)
  forceReload: () => void;   // очистить кэш + сигнал (кнопка Retry на экране ошибки)
}

export const CacheContext = createContext<CacheContextType>({
  cacheVersion: 0,
  bumpVersion: () => {},
  forceReload: () => {},
});

export function useCacheContext() {
  return useContext(CacheContext);
}

export function useCacheProvider(): CacheContextType {
  const [cacheVersion, setCacheVersion] = useState(0);
  const bump = useCallback(() => setCacheVersion(v => v + 1), []);
  const bumpVersion = bump;
  const forceReload = useCallback(() => {
    clearBooksCache();
    setCacheVersion(v => v + 1);
  }, []);
  return { cacheVersion, bumpVersion, forceReload };
}
