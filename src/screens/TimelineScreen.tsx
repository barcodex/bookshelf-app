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
import { YearSection, formatDisplayDate, groupByYear } from '../utils/groupBooks';

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
          .filter(f => f.name.endsWith('.md'))
          .map(async f => {
            const { content } = await getFile(settings, f.path);
            return parse(content, f.name.replace('.md', ''));
          })
      );
      setBooks(
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

  const sections = groupByYear(books);

  return (
    <SafeAreaView style={styles.container}>
      <SectionList<BookFormData, YearSection>
        sections={sections}
        keyExtractor={item => item.slug}
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
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  yearText: { fontSize: 22, fontWeight: '700', color: '#111' },
  yearCount: { fontSize: 13, color: '#888' },
  sectionGap: { height: 20, backgroundColor: '#fff' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 14,
  },
  itemDate: { fontSize: 13, color: '#888', width: 72 },
  itemDateEmpty: { color: '#ccc' },
  itemMeta: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 2 },
  itemAuthor: { fontSize: 13, color: '#666' },
});
