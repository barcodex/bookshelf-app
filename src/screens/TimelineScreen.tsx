import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BookDetailModal from '../components/BookDetailModal';
import EditBookModal from '../components/EditBookModal';
import { getFile, listDirectory } from '../services/github';
import { parse } from '../services/markdown';
import { getSettings } from '../services/storage';
import { BookFormData } from '../types/book';

type Section = { title: string; data: BookFormData[] };

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(
    new Date(iso + 'T00:00:00')
  );

const monthKey = (iso: string) =>
  new Intl.DateTimeFormat('ru', { year: 'numeric', month: 'long' }).format(
    new Date(iso + 'T00:00:00')
  );

function groupByMonth(books: BookFormData[]): Section[] {
  const map = new Map<string, BookFormData[]>();
  for (const book of books) {
    const key = monthKey(book.date_finished);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(book);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export default function TimelineScreen() {
  const [books, setBooks] = useState<BookFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<BookFormData | null>(null);
  const [editing, setEditing] = useState<BookFormData | null>(null);

  const loadBooks = useCallback(async () => {
    const settings = getSettings();
    if (!settings) return;
    setLoading(true);
    setError('');
    try {
      const files = await listDirectory(settings, 'books');
      const loaded = await Promise.all(
        files
          .filter((f) => f.name.endsWith('.md'))
          .map(async (f) => {
            const { content } = await getFile(settings, f.path);
            return parse(content, f.name.replace('.md', ''));
          })
      );
      setBooks(
        loaded
          .filter((b) => b.date_finished)
          .sort((a, b) => b.date_finished.localeCompare(a.date_finished))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadBooks(); }, [loadBooks]));

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={loadBooks}>
          <Text style={styles.retryLabel}>Повторить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList<BookFormData, Section>
        sections={groupByMonth(books)}
        keyExtractor={(item) => item.slug}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.monthHeader}>
            <Text style={styles.monthText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => setSelected(item)}>
            <Text style={styles.itemDate}>{formatDay(item.date_finished)}</Text>
            <View style={styles.itemMeta}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.itemAuthor} numberOfLines={1}>{item.author}</Text>
            </View>
          </Pressable>
        )}
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
          onSaved={() => { setEditing(null); loadBooks(); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  error: { fontSize: 15, color: '#c00', textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#111', borderRadius: 8 },
  retryLabel: { color: '#fff', fontWeight: '600' },
  listContent: { paddingBottom: 32 },
  monthHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  monthText: { fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 14,
  },
  itemDate: { fontSize: 13, color: '#888', width: 80 },
  itemMeta: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 2 },
  itemAuthor: { fontSize: 13, color: '#666' },
});
