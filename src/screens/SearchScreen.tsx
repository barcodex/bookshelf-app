import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';
import BookDetailModal from '../components/BookDetailModal';
import EditBookModal from '../components/EditBookModal';
import MediaIcon from '../components/MediaIcon';
import StarRating from '../components/StarRating';
import { useCacheContext } from '../context/CacheContext';
import { getCachedBooks, getCachedCommitSha, upsertCachedBook, updateCachedCommitSha } from '../services/booksCache';
import { GitHubError, getLatestCommitSha } from '../services/github';
import { LoadProgress, loadAllBooks, applyIncrementalUpdate } from '../services/booksService';
import { getSettings } from '../services/storage';
import { GitHubErrorScreen, GitHubOfflineBanner } from '../components/GitHubErrorView';
import { BookFormData, BookMedia } from '../types/book';
import { YearSection, formatDisplayDate, groupByYear } from '../utils/groupBooks';
import { colors } from '../utils/theme';

function getMediaCounts(books: BookFormData[]): { paper: number; digital: number; audio: number } {
  const counts = { paper: 0, digital: 0, audio: 0 };
  for (const book of books) {
    if (book.media === 'бумажная') counts.paper++;
    else if (book.media === 'электронная') counts.digital++;
    else if (book.media === 'аудио') counts.audio++;
  }
  return counts;
}


export default function SearchScreen() {
  const { language } = useLanguage();
  const mediaOptions: { value: BookMedia; label: string }[] = [
    { value: 'бумажная', label: t(language, 'media.paper') },
    { value: 'электронная', label: t(language, 'media.digital') },
    { value: 'аудио', label: t(language, 'media.audio') },
  ];
  const [allBooks, setAllBooks] = useState<BookFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeMedia, setActiveMedia] = useState<BookMedia[]>([]);
  const [selected, setSelected] = useState<BookFormData | null>(null);
  const [editing, setEditing] = useState<BookFormData | null>(null);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [githubError, setGithubError] = useState<GitHubError | null>(null);
  const { cacheVersion, forceReload } = useCacheContext();
  const isFocused = useRef(false);
  const route = useRoute<any>();
  const [pendingTag, setPendingTag] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    const settings = await getSettings();
    if (!settings) return;

    const [cached, cachedSha] = await Promise.all([
      getCachedBooks(),
      getCachedCommitSha(),
    ]);
    if (cached) {
      setAllBooks(
        cached
          .filter(b => b.date_finished)
          .sort((a, b) => b.date_finished.localeCompare(a.date_finished))
      );
      setLoading(false);
      // Background: check if repo has new commits and apply incremental update
      try {
        const latestSha = await getLatestCommitSha(settings);
        if (latestSha && latestSha !== cachedSha) {
          await applyIncrementalUpdate(settings, cachedSha ?? '', latestSha);
          const updated = await getCachedBooks();
          if (updated && isFocused.current) {
            setAllBooks(
              updated
                .filter(b => b.date_finished)
                .sort((a, b) => b.date_finished.localeCompare(a.date_finished))
            );
          }
        }
      } catch {}
      return;
    }

    setLoading(true);
    setProgress(null);
    setGithubError(null);
    try {
      const books = await loadAllBooks(settings, p => setProgress(p));
      setAllBooks(
        books
          .filter(b => b.date_finished)
          .sort((a, b) => b.date_finished.localeCompare(a.date_finished))
      );
      setGithubError(null);
    } catch (e) {
      if (e instanceof GitHubError) setGithubError(e);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    const settings = await getSettings();
    if (!settings) return;
    setRefreshing(true);
    setGithubError(null);
    try {
      const books = await loadAllBooks(settings);
      setAllBooks(
        books
          .filter(b => b.date_finished)
          .sort((a, b) => b.date_finished.localeCompare(a.date_finished))
      );
    } catch (e) {
      if (e instanceof GitHubError) setGithubError(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    isFocused.current = true;
    loadBooks();
    return () => { isFocused.current = false; };
  }, [loadBooks]));

  useEffect(() => {
    if (isFocused.current) loadBooks();
  }, [cacheVersion, loadBooks]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of allBooks) {
      for (const tag of book.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [allBooks]);

  // Если пришли из карточки книги с тегом, сохраняем его
  useEffect(() => {
    if (route.params?.tag) {
      setPendingTag(route.params.tag);
    }
  }, [route.params?.tag]);

  // После загрузки книг применяем выбранный тег
  useEffect(() => {
    if (pendingTag && allTags.includes(pendingTag) && !activeTags.includes(pendingTag)) {
      setActiveTags([pendingTag]);
      setPendingTag(null);
    }
  }, [allTags, pendingTag]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;

    // Нет никаких фильтров — ничего не показываем
    if (!hasQuery && minRating === 0 && activeTags.length === 0 && activeMedia.length === 0) return null;

    let books = allBooks;

    if (hasQuery) {
      if (q.length < 3) {
        // 1–2 символа: совпадение начала слов в названии и авторе
        books = books.filter(book => {
          const words = `${book.title} ${book.author}`.toLowerCase().split(/\s+/);
          return words.some(w => w.startsWith(q));
        });
      } else {
        // 3+ символов: полнотекстовый поиск по всем полям
        const terms = q.split(/\s+/);
        books = books.filter(book => {
          const haystack = [
            book.title, book.original_title, book.author, book.year,
            book.summary, book.review, book.source, ...book.tags,
          ].join(' ').toLowerCase();
          return terms.every(w => haystack.includes(w));
        });
      }
    }

    if (minRating > 0) books = books.filter(b => b.rating >= minRating);
    if (activeTags.length > 0)
      books = books.filter(b => activeTags.every(t => b.tags.includes(t)));
    if (activeMedia.length > 0)
      books = books.filter(b => activeMedia.includes(b.media));
    return books;
  }, [allBooks, debouncedQuery, minRating, activeTags, activeMedia]);

  const toggleTag = (tag: string) =>
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );

  const toggleMedia = (m: BookMedia) =>
    setActiveMedia(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );

  const hasFilters = query.trim().length > 0 || minRating > 0 || activeTags.length > 0 || activeMedia.length > 0;
  const resetFilters = () => { setQuery(''); setDebouncedQuery(''); setMinRating(0); setActiveTags([]); setActiveMedia([]); };

  const sections = filtered ? groupByYear(filtered) : [];

  const Header = (
    <View style={styles.filters}>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder={t(language, 'search.hint')}
        placeholderTextColor="#aaa"
        clearButtonMode="while-editing"
      />
      <Text style={styles.searchHint}>
        {t(language, 'search.hint')}
      </Text>

      <View style={styles.mediaRow}>
        {mediaOptions.map(opt => {
          const active = activeMedia.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              style={[styles.tagChip, active && styles.tagChipActive]}
              onPress={() => toggleMedia(opt.value)}
            >
              <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>{t(language, 'search.minRating')}</Text>
        <StarRating value={minRating} onChange={setMinRating} size="sm" />
      </View>

      {allTags.length > 0 && (
        <View style={styles.tagCloud}>
          {allTags.map(tag => {
            const active = activeTags.includes(tag);
            return (
              <Pressable
                key={tag}
                style={[styles.tagChip, active && styles.tagChipActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                  {tag}
                </Text>
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
            : t(language, 'search.results').replace('{count}', filtered.length.toString())}
        </Text>
        {hasFilters && (
          <Pressable onPress={resetFilters}>
            <Text style={styles.reset}>{t(language, 'search.reset')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (githubError && allBooks.length === 0) {
    return <GitHubErrorScreen error={githubError} onRetry={forceReload} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {githubError && <GitHubOfflineBanner error={githubError} onRetry={forceReload} />}
      {loading ? (
        <>
          {Header}
          <ActivityIndicator style={{ marginTop: 40 }} size="large" />
          {progress && (
            <Text style={styles.progressText}>
              {t(language, 'search.loadingBooks')} {progress.current} / {progress.total}
            </Text>
          )}
        </>
      ) : (
        <SectionList<BookFormData, YearSection>
          sections={sections}
          keyExtractor={item => item.slug}
          ListHeaderComponent={Header}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderSectionHeader={({ section }) => {
            const counts = getMediaCounts(section.data);
            return (
              <View style={[styles.yearHeader, { backgroundColor: section.backgroundColor }]}>
                <View style={styles.yearLeft}>
                  <Text style={styles.yearText}>{section.year}</Text>
                  <View style={styles.yearStats}>
                    <Text style={styles.yearCount}>{section.data.length} книг</Text>
                    <View style={styles.mediaCounts}>
                      {counts.audio > 0 && (
                        <View style={styles.mediaCount}>
                          <MediaIcon media="аудио" size="sm" color="#555" />
                          <Text style={styles.mediaCountText}>{counts.audio}</Text>
                        </View>
                      )}
                      {counts.paper > 0 && (
                        <View style={styles.mediaCount}>
                          <MediaIcon media="бумажная" size="sm" color="#555" />
                          <Text style={styles.mediaCountText}>{counts.paper}</Text>
                        </View>
                      )}
                      {counts.digital > 0 && (
                        <View style={styles.mediaCount}>
                          <MediaIcon media="электронная" size="sm" color="#555" />
                          <Text style={styles.mediaCountText}>{counts.digital}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          renderSectionFooter={() => <View style={styles.sectionGap} />}
          renderItem={({ item, section }) => {
            const dateStr = formatDisplayDate(item.date_finished, language);
            return (
              <Pressable
                style={[styles.item, { backgroundColor: section.backgroundColor }]}
                onPress={() => setSelected(item)}
              >
                <Text style={[styles.itemDate, !dateStr && styles.itemDateEmpty]}>
                  {dateStr || '—'}
                </Text>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemAuthor} numberOfLines={1}>{item.author}</Text>
                </View>
                {item.rating > 0 && (
                  <Text style={styles.itemRating}>{item.rating}★</Text>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            filtered !== null
              ? <Text style={styles.empty}>{t(language, 'search.empty')}</Text>
              : null
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {selected && (
        <BookDetailModal
          book={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
        />
      )}
      {editing && (
        <EditBookModal
          book={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated, sha) => {
            setEditing(null);
            setAllBooks(prev => prev.map(b => b.slug === updated.slug ? updated : b));
            upsertCachedBook(updated);
            updateCachedCommitSha(sha);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.bg },
  filters: { padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: colors.text, backgroundColor: colors.bgInput,
  },
  searchHint: { fontSize: 11, color: colors.textFaint, marginTop: -6 },
  mediaRow: { flexDirection: 'row', gap: 8 },
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
  yearHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  yearLeft: { flexDirection: 'column', gap: 6 },
  yearText: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: colors.fontTitle },
  yearStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  yearCount: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  mediaCounts: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  mediaCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mediaCountText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  sectionGap: { height: 20, backgroundColor: colors.bg },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.borderFaint, gap: 14,
  },
  itemDate: { fontSize: 13, color: colors.textFaint, width: 72 },
  itemDateEmpty: { color: colors.textEmpty },
  itemMeta: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  itemAuthor: { fontSize: 13, color: colors.textMuted },
  itemRating: { fontSize: 13, color: colors.stars, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: colors.textFaint, fontSize: 15 },
  listContent: { paddingBottom: 32 },
  progressText: { fontSize: 14, color: colors.textFaint, textAlign: 'center', marginTop: 8 },
});
