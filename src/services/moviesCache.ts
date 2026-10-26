import { MovieFormData, emptyMovie } from '../types/movie';
import { createCardCache } from './cardCache';

// Свой SHA у каждого раздела: кэши книг и фильмов обновляются независимо
export const moviesCache = createCardCache<MovieFormData>(
  'bookshelf_movies_cache',
  'bookshelf_movies_commit_sha',
  emptyMovie,
);
