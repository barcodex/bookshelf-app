import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GitHubErrorScreen, GitHubOfflineBanner } from '../components/GitHubErrorView';
import EditMovieModal from '../components/EditMovieModal';
import MovieDetailModal from '../components/MovieDetailModal';
import MovieRow from '../components/MovieRow';
import { TAB_EDGES } from '../components/SectionHeader';
import { useLanguage } from '../context/LanguageContext';
import { useMovies } from '../hooks/useMovies';
import { t } from '../services/i18n';
import { MovieFormData } from '../types/movie';
import { formatDisplayDate } from '../utils/groupBooks';
import { MovieSection, buildMovieSections } from '../utils/groupMovies';
import { colors } from '../utils/theme';

export default function MoviesTimelineScreen() {
  const { language } = useLanguage();
  const { movies, loading, refreshing, progress, githubError, refresh, forceReload, replaceMovie } = useMovies();
  const [selected, setSelected] = useState<MovieFormData | null>(null);
  const [editing, setEditing] = useState<MovieFormData | null>(null);

  const sections = useMemo(() => buildMovieSections(movies), [movies]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={TAB_EDGES}>
        <ActivityIndicator size="large" />
        {progress && (
          <Text style={styles.progressText}>
            {t(language, 'common.loading')} {progress.current} / {progress.total}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  if (githubError && movies.length === 0) {
    return <GitHubErrorScreen error={githubError} onRetry={forceReload} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={TAB_EDGES}>
      {githubError && <GitHubOfflineBanner error={githubError} onRetry={forceReload} />}
      <SectionList<MovieFormData, MovieSection>
        sections={sections}
        keyExtractor={item => item.slug}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderSectionHeader={({ section }) => (
          <View style={[styles.yearHeader, { backgroundColor: section.backgroundColor }]}>
            <Text style={[styles.yearText, section.kind === 'undated' && styles.undatedText]}>
              {section.kind === 'undated' ? t(language, 'movie.undated') : section.year}
            </Text>
            <Text style={styles.yearCount}>
              {t(language, 'movie.count').replace('{count}', section.data.length.toString())}
            </Text>
          </View>
        )}
        renderSectionFooter={() => <View style={styles.sectionGap} />}
        renderItem={({ item, section }) => (
          <MovieRow
            movie={item}
            date={formatDisplayDate(item.date_watched, language)}
            backgroundColor={section.backgroundColor}
            onPress={() => setSelected(item)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t(language, 'movie.empty')}</Text>}
        contentContainerStyle={styles.listContent}
      />

      {selected && (
        <MovieDetailModal
          movie={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
        />
      )}
      {editing && (
        <EditMovieModal
          movie={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setEditing(null);
            replaceMovie(updated);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.bg },
  progressText: { fontSize: 14, color: colors.textFaint },
  listContent: { paddingBottom: 32 },
  yearHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 6 },
  yearText: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: colors.fontTitle },
  undatedText: { color: colors.textMuted },
  yearCount: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  sectionGap: { height: 20, backgroundColor: colors.bg },
  empty: { textAlign: 'center', marginTop: 40, marginHorizontal: 24, color: colors.textFaint, fontSize: 15 },
});
