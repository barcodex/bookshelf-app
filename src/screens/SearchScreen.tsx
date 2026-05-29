import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BookDetailModal from '../components/BookDetailModal';
import EditBookModal from '../components/EditBookModal';
import StarRating from '../components/StarRating';
import { useCacheContext } from '../context/CacheContext';
import { getCachedBooks, setCachedBooks } from '../services/booksCache';
import { getFile, getLatestCommitSha, listDirectory } from '../services/github';
import { parse } from '../services/markdown';
import { getSettings } from '../services/storage';
import { BookFormData, BookMedia } from '../types/book';
import { YearSection, formatDisplayDate, groupByYear } from '../utils/groupBooks';

const MEDIA_OPTIONS: { value: BookMedia; label: string }[] = [
  { value: 'бумажная', label: 'Бумажная' },
  { value: 'электронная', label: 'Электронная' },
  { value: 'аудио', label: 'Аудио' },
];


export default function SearchScreen() {
  const [allBooks, setAllBooks] = useState<BookFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeMedia, setActiveMedia] = useState<BookMedia[]>([]);
  const [selected, setSelected] = useState<BookFormData | null>(null);
  const [editing, setEditing] = useState<BookFormData | null>(null);
  const { cacheVersion, invalidate } = useCacheContext();
  const isFocused = useRef(false);

  const loadBooks = useCallback(async () => {
    const settings = getSettings();
    if (!settings) return;

    const cached = getCachedBooks();
    if (cached) {
      setAllBooks(
        cached.books
          .filter(b => b.date_finished)
          .sort((a, b) => b.date_finished.localeCompare(a.date_finished))
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [files, commitSha] = await Promise.all([
        listDirectory(settings, 'books'),
        getLatestCommitSha(settings),
      ]);
      const loaded = await Promise.all(
        files
          .filter(f => f.name.endsWith('.md'))
          .map(async f => {
            const { content } = await getFile(settings, f.path);
            return parse(content, f.name.replace('.md', ''));
          })
      );
      setCachedBooks(loaded, commitSha);
      setAllBooks(
        loaded
          .filter(b => b.date_finished)
          .sort((a, b) => b.date_finished.localeCompare(a.date_finished))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
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

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;
    const hasFiltersOnly = !hasQuery && (minRating > 0 || activeTags.length > 0);

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
        placeholder="Поиск по всем полям…"
        placeholderTextColor="#aaa"
        clearButtonMode="while-editing"
      />
      <Text style={styles.searchHint}>
        1–2 символа — по началу слов в названии и авторе; 3+ — полнотекстовый поиск
      </Text>

      <View style={styles.mediaRow}>
        {MEDIA_OPTIONS.map(opt => {
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
        <Text style={styles.ratingLabel}>Минимальный рейтинг</Text>
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
            ? 'Загрузка…'
            : filtered === null
            ? 'Введите запрос или выберите фильтр'
            : `${filtered.length} книг`}
        </Text>
        {hasFilters && (
          <Pressable onPress={resetFilters}>
            <Text style={styles.reset}>Сбросить</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={loadBooks}>
          <Text style={styles.retryLabel}>Повторить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <>
          {Header}
          <ActivityIndicator style={{ marginTop: 40 }} size="large" />
        </>
      ) : (
        <SectionList<BookFormData, YearSection>
          sections={sections}
          keyExtractor={item => item.slug}
          ListHeaderComponent={Header}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={[styles.yearHeader, { backgroundColor: section.backgroundColor }]}>
              <Text style={styles.yearText}>{section.year}</Text>
              <Text style={styles.yearCount}>{section.data.length} книг</Text>
            </View>
          )}
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
                {item.rating > 0 && (
                  <Text style={styles.itemRating}>{item.rating}★</Text>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            filtered !== null
              ? <Text style={styles.empty}>Ничего не найдено</Text>
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
          onSaved={() => { setEditing(null); invalidate(); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  filters: { padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#111', backgroundColor: '#fafafa',
  },
  searchHint: { fontSize: 11, color: '#aaa', marginTop: -6 },
  mediaRow: { flexDirection: 'row', gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingLabel: { fontSize: 14, color: '#555' },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fafafa',
  },
  tagChipActive: { backgroundColor: '#111', borderColor: '#111' },
  tagChipText: { fontSize: 13, color: '#555' },
  tagChipTextActive: { color: '#fff', fontWeight: '600' },
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsCount: { fontSize: 13, color: '#888' },
  reset: { fontSize: 13, color: '#007AFF' },
  yearHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  yearText: { fontSize: 22, fontWeight: '700', color: '#111' },
  yearCount: { fontSize: 13, color: '#888' },
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
  itemRating: { fontSize: 13, color: '#f5a623', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: '#aaa', fontSize: 15 },
  listContent: { paddingBottom: 32 },
  errorText: { fontSize: 15, color: '#c00', textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#111', borderRadius: 8 },
  retryLabel: { color: '#fff', fontWeight: '600' },
});
