import { ConcertFormData } from '../types/concert';
import { Collection } from './cardsService';
import { concertsCache } from './concertsCache';
import { parseConcert, serializeConcert } from './concertMarkdown';

export const concertsCollection: Collection<ConcertFormData> = {
  folder: 'concerts',
  parse: parseConcert,
  serialize: serializeConcert,
  cache: concertsCache,
};
