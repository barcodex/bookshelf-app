import { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GitHubErrorScreen } from '../components/GitHubErrorView';
import RatingLadder, { LadderCard } from '../components/RatingLadder';
import { TAB_EDGES } from '../components/SectionHeader';
import { useCacheContext } from '../context/CacheContext';
import { useLanguage } from '../context/LanguageContext';
import { useMovies } from '../hooks/useMovies';
import { saveCardsPatch } from '../services/cardsService';
import { t } from '../services/i18n';
import { moviesCollection } from '../services/moviesService';
import { getSettings } from '../services/storage';
import { MovieFormData } from '../types/movie';
import { movieSubtitle } from '../utils/groupMovies';
import { colors } from '../utils/theme';

// Свежие просмотры первыми — так ставятся фильмы с одинаковой оценкой и без оценки
const byRecent = (a: MovieFormData, b: MovieFormData) =>
  b.date_watched.localeCompare(a.date_watched) || a.title.localeCompare(b.title, 'ru');

export default function MoviesRatingScreen() {
  const { language } = useLanguage();
  const { movies, loading, githubError, forceReload } = useMovies();
  const { bumpVersion } = useCacheContext();

  const cards = useMemo<LadderCard[]>(
    () => [...movies].sort(byRecent).map(m => ({
      slug: m.slug,
      title: m.title,
      subtitle: movieSubtitle(m),
      note: m.abandoned ? t(language, 'movie.abandonedShort') : undefined,
      rating: m.rating,
    })),
    [movies, language],
  );

  const save = useCallback(async (ratings: Record<string, number>) => {
    const settings = await getSettings();
    if (!settings) throw new Error('no settings');
    const patch = Object.fromEntries(
      Object.entries(ratings).map(([slug, rating]) => [slug, { rating }]),
    );
    const n = Object.keys(patch).length;
    await saveCardsPatch(moviesCollection, settings, patch, `Update ratings of ${n} movie${n === 1 ? '' : 's'}`);
    bumpVersion();
  }, [bumpVersion]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={TAB_EDGES}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }
  if (githubError && movies.length === 0) {
    return <GitHubErrorScreen error={githubError} onRetry={forceReload} />;
  }
  return (
    <SafeAreaView style={styles.container} edges={TAB_EDGES}>
      <RatingLadder cards={cards} onSave={save} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
