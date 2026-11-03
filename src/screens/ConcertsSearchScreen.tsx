import { useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GitHubErrorScreen, GitHubOfflineBanner } from '../components/GitHubErrorView';
import ConcertDetailModal from '../components/ConcertDetailModal';
import ConcertRow from '../components/ConcertRow';
import EditConcertModal from '../components/EditConcertModal';
import { TAB_EDGES } from '../components/SectionHeader';
import StarRating from '../components/StarRating';
import { useLanguage } from '../context/LanguageContext';
import { useConcerts } from '../hooks/useConcerts';
import { t } from '../services/i18n';
import { ConcertFormData } from '../types/concert';
import { formatDisplayDate } from '../utils/groupBooks';
import { ConcertSection, buildConcertSections } from '../utils/groupConcerts';
import { colors } from '../utils/theme';

export default function ConcertsSearchScreen() {
  const { language } = useLanguage();
  const { concerts, loading, refreshing, githubError, refresh, forceReload, replaceConcert } = useConcerts();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<ConcertFormData | null>(null);
  const [editing, setEditing] = useState<ConcertFormData | null>(null);
  const route = useRoute<any>();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Пришли из карточки концерта по тегу
  useEffect(() => {
    if (route.params?.tag) setActiveTags([route.params.tag]);
  }, [route.params?.tag]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const concert of concerts) {
      for (const tag of concert.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [concerts]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q && minRating === 0 && activeTags.length === 0) return null;

    let result = concerts;
    if (q) {
      const terms = q.split(/\s+/);
      result = result.filter(c => {
        const haystack = [
          c.artist, ...c.support, c.venue, c.date_attended, c.summary, c.review, ...c.tags,
        ].join(' ').toLowerCase();
        return terms.every(w => haystack.includes(w));
      });
    }
    if (minRating > 0) result = result.filter(c => c.rating >= minRating);
    if (activeTags.length > 0) result = result.filter(c => activeTags.every(tag => c.tags.includes(tag)));
    return result;
  }, [concerts, debouncedQuery, minRating, activeTags]);

  const sections = useMemo(() => (filtered ? buildConcertSections(filtered) : []), [filtered]);

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
        placeholder={t(language, 'concert.searchHint')}
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
            : t(language, 'concert.count').replace('{count}', filtered.length.toString())}
        </Text>
        {hasFilters && (
          <Pressable onPress={resetFilters}>
            <Text style={styles.reset}>{t(language, 'search.reset')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (githubError && concerts.length === 0) {
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
        <SectionList<ConcertFormData, ConcertSection>
          sections={sections}
          keyExtractor={item => item.slug}
          ListHeaderComponent={Header}
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderSectionHeader={({ section }) => (
            <View style={[styles.yearHeader, { backgroundColor: section.backgroundColor }]}>
              <Text style={styles.yearText}>
                {section.kind === 'undated' ? t(language, 'concert.undated') : section.year}
              </Text>
            </View>
          )}
          renderSectionFooter={() => <View style={styles.sectionGap} />}
          renderItem={({ item, section }) => (
            <ConcertRow
              concert={item}
              date={formatDisplayDate(item.date_attended, language)}
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
        <ConcertDetailModal
          concert={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
        />
      )}
      {editing && (
        <EditConcertModal
          concert={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setEditing(null);
            replaceConcert(updated);
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
