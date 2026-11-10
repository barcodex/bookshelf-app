import { booksCollection } from '../services/booksService';
import { concertsCollection } from '../services/concertsService';
import { t } from '../services/i18n';
import { moviesCollection } from '../services/moviesService';
import { formatFullDate } from '../utils/groupBooks';
import { movieSubtitle } from '../utils/groupMovies';
import { makeRatingScreen } from './RatingScreen';

// Вкладки «Рейтинг» (лестница рейтинга) для разделов, где она есть

export const MoviesRatingScreen = makeRatingScreen({
  collection: moviesCollection,
  noun: ['movie', 'movies'],
  recency: m => m.date_watched,
  toCard: (m, language) => ({
    title: m.title,
    subtitle: movieSubtitle(m),
    note: m.abandoned ? t(language, 'movie.abandonedShort') : undefined,
  }),
});

// Сравниваются прочитанные и брошенные книги; те, что читаются сейчас, ещё рано оценивать
export const BooksRatingScreen = makeRatingScreen({
  collection: booksCollection,
  noun: ['book', 'books'],
  recency: b => b.date_finished || b.date_abandoned,
  toCard: (b, language) => {
    const date = b.date_finished || b.date_abandoned;
    if (!date) return null;
    return {
      title: b.title,
      subtitle: [b.author, date.slice(0, 4)].filter(Boolean).join(', '),
      note: b.date_abandoned ? t(language, 'ladder.abandonedBook') : undefined,
    };
  },
});

// Концерты и стендап сравниваются каждый на своей лестнице
export const ConcertsRatingScreen = makeRatingScreen({
  collection: concertsCollection,
  noun: ['concert', 'concerts'],
  recency: c => c.date_attended,
  toCard: (c, language) => ({
    title: c.artist,
    subtitle: [c.venue, c.date_attended && formatFullDate(c.date_attended, language)].filter(Boolean).join(' · '),
  }),
  groups: [
    { id: 'concert', label: l => t(l, 'concert.kindConcert'), test: c => c.kind !== 'standup' },
    { id: 'standup', label: l => t(l, 'concert.kindStandup'), test: c => c.kind === 'standup' },
  ],
});
