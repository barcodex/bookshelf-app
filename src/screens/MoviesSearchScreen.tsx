import { useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GitHubErrorScreen, GitHubOfflineBanner } from '../components/GitHubErrorView';
import EditMovieModal from '../components/EditMovieModal';
import MovieDetailModal from '../components/MovieDetailModal';
import MovieRow from '../components/MovieRow';
import { TAB_EDGES } from '../components/SectionHeader';
import StarRating from '../components/StarRating';
import { useLanguage } from '../context/LanguageContext';
import { useMovies } from '../hooks/useMovies';
import { t } from '../services/i18n';
import { MovieFormData } from '../types/movie';
import { formatDisplayDate } from '../utils/groupBooks';
import { MovieSection, buildMovieSections } from '../utils/groupMovies';
import { colors } from '../utils/theme';

export default function MoviesSearchScreen() {
  const { language } = useLanguage();
  const { movies, loading, refreshing, githubError, refresh, forceReload, replaceMovie } = useMovies();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<MovieFormData | null>(null);
  const [editing, setEditing] = useState<MovieFormData | null>(null);
  const route = useRoute<any>();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Пришли из карточки фильма по тегу
  useEffect(() => {
    if (route.params?.tag) setActiveTags([route.params.tag]);
  }, [route.params?.tag]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const movie of movies) {
      for (const tag of movie.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [movies]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q && minRating === 0 && activeTags.length === 0) return null;

    let result = movies;
    if (q) {
      const terms = q.split(/\s+/);
      result = result.filter(m => {
        const haystack = [
          m.title, m.original_title, m.director, m.year, m.summary, m.review, ...m.tags,
        ].join(' ').toLowerCase();
        return terms.every(w => haystack.includes(w));
      });
    }
    if (minRating > 0) result = result.filter(m => m.rating >= minRating);
    if (activeTags.length > 0) result = result.filter(m => activeTags.every(tag => m.tags.includes(tag)));
    return result;
  }, [movies, debouncedQuery, minRating, activeTags]);

  const sections = useMemo(() => (filtered ? buildMovieSections(filtered) : []), [filtered]);

  const toggleTag = (tag: string) =>
    setActiveTags(prev => (prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]));

  const hasFilters = query.trim().length > 0 || minRating > 0 || activeTags.length > 0;
  const resetFilters = () => { setQuery(''); setDebouncedQuery(''); setMinRating(0); setActiveTags([]); };

  const Header = (
    <View style={styles.filters}>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder={t(language, 'movie.searchHint')}
        placeholderTextColor="#aaa"
        clearButtonMode="while-editing"
      />

      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{t(language, 'search.minRating')}</Text>
        <StarRating value={minRating} onChange={setMinRating} size="sm" />
      </View>

      {allTags.length > 0 && (
        <View style={styles.tagCloud}>
          {allTags.map(tag => {
            const active = activeTags.includes(tag);
            return (
              <Pressable key={tag} style={[styles.tagChip, active && styles.tagChipActive]} onPress={() => toggleTag(tag)}>
                <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.resultsRow}>
        <Text style={styles.resultsCount}>
          {loading
            ? t(language, 'common.loading')
            : filtered === null
            ? t(language, 'search.noFilter')
            : t(language, 'movie.count').replace('{count}', filtered.length.toString())}
        </Text>
        {hasFilters && (
          <Pressable onPress={resetFilters}>
            <Text style={styles.reset}>{t(language, 'search.reset')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (githubError && movies.length === 0) {
    return <GitHubErrorScreen error={githubError} onRetry={forceReload} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={TAB_EDGES}>
      {githubError && <GitHubOfflineBanner error={githubError} onRetry={forceReload} />}
      {loading ? (
        <>
          {Header}
          <ActivityIndicator style={{ marginTop: 40 }} size="large" />
        </>
      ) : (
        <SectionList<MovieFormData, MovieSection>
          sections={sections}
          keyExtractor={item => item.slug}
          ListHeaderComponent={Header}
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.yearHeader, { backgroundColor: section.backgroundColor }]}>
              <Text style={styles.yearText}>
                {section.kind === 'undated' ? t(language, 'movie.undated') : section.year}
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
          ListEmptyComponent={
            filtered !== null ? <Text style={styles.empty}>{t(language, 'search.empty')}</Text> : null
          }
          contentContainerStyle={styles.listContent}
        />
      )}

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
  filters: { padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: colors.text, backgroundColor: colors.bgInput,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingLabel: { fontSize: 14, color: colors.textMuted },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.bgInput,
  },
  tagChipActive: { backgroundColor: colors.tagActive, borderColor: colors.tagActiveBorder },
  tagChipText: { fontSize: 13, color: colors.textMuted },
  tagChipTextActive: { color: '#fff', fontWeight: '600' },
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsCount: { fontSize: 13, color: colors.textFaint },
  reset: { fontSize: 13, color: colors.reset },
  yearHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  yearText: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: colors.fontTitle },
  sectionGap: { height: 20, backgroundColor: colors.bg },
  empty: { textAlign: 'center', marginTop: 40, color: colors.textFaint, fontSize: 15 },
  listContent: { paddingBottom: 32 },
});
