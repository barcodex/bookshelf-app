import { ConcertFormData, emptyConcert } from '../types/concert';
import { createCardCache } from './cardCache';

export const concertsCache = createCardCache<ConcertFormData>(
  'bookshelf_concerts_cache',
  'bookshelf_concerts_commit_sha',
  emptyConcert,
);
