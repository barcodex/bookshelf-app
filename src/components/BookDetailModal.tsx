import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import StarRating from './StarRating';
import { BookFormData } from '../types/book';

interface Props {
  book: BookFormData;
  onClose: () => void;
  onEdit?: () => void;
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(iso + 'T00:00:00')
  );

function Row({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function BookDetailModal({ book, onClose, onEdit }: Props) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>{book.author}</Text>
          </View>
          <View style={styles.headerActions}>
            {onEdit && (
              <Pressable style={styles.editBtn} onPress={onEdit}>
                <Text style={styles.editBtnText}>Изменить</Text>
              </Pressable>
            )}
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {book.original_title && book.original_title !== book.title && (
            <Row label="Оригинал" value={book.original_title} />
          )}
          <Row label="Год" value={book.year} />
          {book.original_language !== 'ru' && (
            <Row label="Язык оригинала" value={book.original_language.toUpperCase()} />
          )}
          {book.rating > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Рейтинг</Text>
              <StarRating value={book.rating} onChange={() => {}} size="sm" />
            </View>
          )}
          {book.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {book.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {book.media   && <Row label="Формат"   value={book.media} />}
          {book.source  && <Row label="Источник" value={book.source} />}
          {book.date_started  && <Row label="Начало чтения" value={formatDate(book.date_started)} />}
          {book.date_finished && <Row label="Конец чтения"  value={formatDate(book.date_finished)} />}

          {book.summary ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Резюме</Text>
              <Text style={styles.sectionText}>{book.summary}</Text>
            </View>
          ) : null}

          {book.review ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Отзыв</Text>
              <Text style={styles.sectionText}>{book.review}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 4 },
  author: { fontSize: 15, color: '#555' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  editBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#555' },
  content: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  rowLabel: { width: 140, fontSize: 14, color: '#888' },
  rowValue: { flex: 1, fontSize: 14, color: '#111' },
  section: { paddingTop: 8, gap: 6 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: { fontSize: 15, color: '#222', lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 13, color: '#444' },
});
