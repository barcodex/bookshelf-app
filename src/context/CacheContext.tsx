import { createContext, useCallback, useContext, useState } from 'react';
import { clearBooksCache } from '../services/booksCache';

interface CacheContextType {
  cacheVersion: number;
  invalidate: () => void;
}

export const CacheContext = createContext<CacheContextType>({
  cacheVersion: 0,
  invalidate: () => {},
});

export function useCacheContext() {
  return useContext(CacheContext);
}

export function useCacheProvider(): CacheContextType {
  const [cacheVersion, setCacheVersion] = useState(0);
  const invalidate = useCallback(() => {
    clearBooksCache();
    setCacheVersion(v => v + 1);
  }, []);
  return { cacheVersion, invalidate };
}
