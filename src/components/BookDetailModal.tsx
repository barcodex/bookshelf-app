import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { saveBook, todayIso } from '../services/booksService';
import { Language, t, toIntlLocale } from '../services/i18n';
import { getSettings } from '../services/storage';
import MarkdownText from './MarkdownText';
import MediaIcon from './MediaIcon';
import StarRating from './StarRating';
import { BookFormData } from '../types/book';

interface Props {
  book: BookFormData;
  onClose: () => void;
  onEdit?: () => void;
  onBookUpdated?: (book: BookFormData) => void; // включает кнопки «Бросить чтение» / «Снова начать читать»
}

const formatDate = (iso: string, language: Language) =>
  new Intl.DateTimeFormat(toIntlLocale(language), {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(iso + 'T00:00:00'));

function Row({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function BookDetailModal({ book, onClose, onEdit, onBookUpdated }: Props) {
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [review, setReview] = useState(book.review);
  const [abandonedAt, setAbandonedAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isReading = !!book.date_started && !book.date_finished && !book.date_abandoned;
  const isAbandoned = !!book.date_abandoned;

  const save = async (updated: BookFormData) => {
    const settings = await getSettings();
    if (!settings || !onBookUpdated) return;
    setBusy(true);
    setError('');
    try {
      await saveBook(settings, updated);
      setAbandonOpen(false);
      onBookUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(language, 'common.error'));
    } finally {
      setBusy(false);
    }
  };

  const handleAbandon = () =>
    save({ ...book, date_abandoned: todayIso(), abandoned_at: abandonedAt.trim(), review: review.trim() });

  const handleRestart = () =>
    save({
      ...book,
      date_abandoned: '',
      abandoned_at: '',
      date_started: book.date_started || todayIso(),
    });

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>{book.author}</Text>
          </View>
          <View style={styles.headerActions}>
            {onEdit && (
              <Pressable style={styles.editBtn} onPress={onEdit}>
                <Text style={styles.editBtnText}>{t(language, 'common.edit')}</Text>
              </Pressable>
            )}
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!!book.original_title && book.original_title !== book.title && (
            <Row label={t(language, 'book.originalTitle')} value={book.original_title} />
          )}
          <Row label={t(language, 'book.year')} value={book.year} />
          {book.original_language !== 'ru' && (
            <Row label={t(language, 'book.originalLanguage')} value={book.original_language.toUpperCase()} />
          )}
          {book.rating > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t(language, 'book.rating')}</Text>
              <StarRating value={book.rating} onChange={() => {}} size="sm" />
            </View>
          )}
          {book.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {book.tags.map(tag => (
                <Pressable
                  key={tag}
                  style={styles.tag}
                  onPress={() => {
                    onClose();
                    navigation.navigate('Search', { tag });
                  }}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {!!book.media && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t(language, 'book.format')}</Text>
              <View style={styles.mediaWithIcon}>
                <MediaIcon media={book.media} size="sm" color="#111" />
                <Text style={styles.rowValue}>{book.media}</Text>
              </View>
            </View>
          )}
          {!!book.source && <Row label={t(language, 'book.source')} value={book.source} />}
          {!!book.date_started && <Row label={t(language, 'book.dateStarted')} value={formatDate(book.date_started, language)} />}
          {!!book.date_finished && <Row label={t(language, 'book.dateFinished')} value={formatDate(book.date_finished, language)} />}
          {!!book.date_abandoned && <Row label={t(language, 'book.dateAbandoned')} value={formatDate(book.date_abandoned, language)} />}
          {!!book.date_abandoned && !!book.abandoned_at && <Row label={t(language, 'book.abandonedAt')} value={book.abandoned_at} />}

          {onBookUpdated && (isReading || isAbandoned) && (
            <View style={styles.statusAction}>
              <Pressable
                style={[styles.statusBtn, busy && styles.disabled]}
                disabled={busy}
                onPress={isReading ? () => { setReview(book.review); setAbandonedAt(''); setError(''); setAbandonOpen(true); } : handleRestart}
              >
                {busy && !abandonOpen ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.statusBtnText}>{t(language, isReading ? 'book.abandon' : 'book.restart')}</Text>
                )}
              </Pressable>
              {!!error && !abandonOpen && <Text style={styles.error}>{error}</Text>}
            </View>
          )}

          {book.summary ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t(language, 'book.summary')}</Text>
              <MarkdownText text={book.summary} />
            </View>
          ) : null}

          {book.review ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t(language, 'book.review')}</Text>
              <MarkdownText text={book.review} />
            </View>
          ) : null}
        </ScrollView>
      </View>

      <Modal visible={abandonOpen} transparent animationType="fade" onRequestClose={() => !busy && setAbandonOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{t(language, 'book.abandonTitle')}</Text>
            <Text style={styles.dialogText}>{t(language, 'book.abandonText')}</Text>
            <TextInput
              style={styles.input}
              value={abandonedAt}
              onChangeText={setAbandonedAt}
              placeholder={t(language, 'book.abandonedAtPlaceholder')}
              placeholderTextColor="#aaa"
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              value={review}
              onChangeText={setReview}
              placeholder={t(language, 'book.abandonReview')}
              placeholderTextColor="#aaa"
              multiline
              textAlignVertical="top"
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.dialogButtons}>
              <Pressable style={styles.dialogCancel} onPress={() => setAbandonOpen(false)} disabled={busy}>
                <Text style={styles.dialogCancelText}>{t(language, 'common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.dialogConfirm, busy && styles.disabled]} onPress={handleAbandon} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.dialogConfirmText}>{t(language, 'book.abandonConfirm')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  mediaWithIcon: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tagText: { fontSize: 13, color: '#444', fontWeight: '500' },
  statusAction: { paddingTop: 4, gap: 6 },
  statusBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    minWidth: 120,
    alignItems: 'center',
  },
  statusBtnText: { fontSize: 14, color: '#111', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  error: { fontSize: 14, color: '#c00' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  dialogTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  dialogText: { fontSize: 14, color: '#555' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  multiline: { minHeight: 100 },
  dialogButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  dialogCancel: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  dialogCancelText: { color: '#111', fontSize: 15, fontWeight: '600' },
  dialogConfirm: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dialogConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
