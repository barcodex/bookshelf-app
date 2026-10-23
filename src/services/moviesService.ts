import { MovieFormData } from '../types/movie';
import { Collection } from './cardsService';
import { moviesCache } from './moviesCache';
import { parseMovie, serializeMovie } from './movieMarkdown';

export const moviesCollection: Collection<MovieFormData> = {
  folder: 'movies',
  parse: parseMovie,
  serialize: serializeMovie,
  cache: moviesCache,
};
