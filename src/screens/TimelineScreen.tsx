import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';
import BookDetailModal from '../components/BookDetailModal';
import EditBookModal from '../components/EditBookModal';
import MediaIcon from '../components/MediaIcon';
import { GitHubErrorScreen, GitHubOfflineBanner } from '../components/GitHubErrorView';
import { useCacheContext } from '../context/CacheContext';
import { getCachedBooks, upsertCachedBook, updateCachedCommitSha } from '../services/booksCache';
import { GitHubError } from '../services/github';
import { LoadProgress, loadAllBooks } from '../services/booksService';
import { getSettings } from '../services/storage';
import { BookFormData, BookMedia } from '../types/book';
import { YearSection, formatDisplayDate, groupByYear } from '../utils/groupBooks';

function sorted(books: BookFormData[]) {
  return books
    .filter(b => b.date_finished)
    .sort((a, b) => b.date_finished.localeCompare(a.date_finished));
}

function getMediaCounts(books: BookFormData[]): { paper: number; digital: number; audio: number } {
  const counts = { paper: 0, digital: 0, audio: 0 };
  for (const book of books) {
    if (book.media === 'бумажная') counts.paper++;
    else if (book.media === 'электронная') counts.digital++;
    else if (book.media === 'аудио') counts.audio++;
  }
  return counts;
}

export default function TimelineScreen() {
  const { language } = useLanguage();
  const [books, setBooks] = useState<BookFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [githubError, setGithubError] = useState<GitHubError | null>(null);
  const [selected, setSelected] = useState<BookFormData | null>(null);
  const [editing, setEditing] = useState<BookFormData | null>(null);
  const { cacheVersion, forceReload } = useCacheContext();
  const isFocused = useRef(false);

  const loadBooks = useCallback(async () => {
    const settings = getSettings();
    if (!settings) return;

    const cached = await getCachedBooks();
    if (cached) {
      setBooks(sorted(cached));
      setLoading(false);
      return;
    }

    setLoading(true);
    setProgress(null);
    setGithubError(null);
    try {
      const books = await loadAllBooks(settings, p => setProgress(p));
      setBooks(sorted(books));
      setGithubError(null);
    } catch (e) {
      if (e instanceof GitHubError) {
        setGithubError(e);
      }
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    isFocused.current = true;
    loadBooks();
    return () => { isFocused.current = false; };
  }, [loadBooks]));

  useEffect(() => {
    if (isFocused.current) loadBooks();
  }, [cacheVersion]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        {progress && (
          <Text style={styles.progressText}>
            {t(language, 'common.loading')} {progress.current} / {progress.total}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  if (githubError && books.length === 0) {
    return <GitHubErrorScreen error={githubError} onRetry={forceReload} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {githubError && (
        <GitHubOfflineBanner error={githubError} onRetry={forceReload} />
      )}
      <SectionList<BookFormData, YearSection>
        sections={groupByYear(books)}
        keyExtractor={item => item.slug}
        stickySectionHeadersEnabled
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
          const dateStr = formatDisplayDate(item.date_finished);
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
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listContent}
      />

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
            setBooks(prev => prev.map(b => b.slug === updated.slug ? updated : b));
            upsertCachedBook(updated);
            updateCachedCommitSha(sha);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  progressText: { fontSize: 14, color: '#888' },
  listContent: { paddingBottom: 32 },
  yearHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  yearLeft: { flexDirection: 'column', gap: 6 },
  yearText: { fontSize: 22, fontWeight: '700', color: '#111' },
  yearStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  yearCount: { fontSize: 13, color: '#666', fontWeight: '500' },
  mediaCounts: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  mediaCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mediaCountText: { fontSize: 13, color: '#666', fontWeight: '500' },
  sectionGap: { height: 20, backgroundColor: '#fff' },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', gap: 14,
  },
  itemDate: { fontSize: 13, color: '#888', width: 72 },
  itemDateEmpty: { color: '#ccc' },
  itemMeta: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 2 },
  itemAuthor: { fontSize: 13, color: '#666' },
});
