import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';
import BookForm from './BookForm';
import { getFile, saveFile } from '../services/github';
import { serialize } from '../services/markdown';
import { getSettings } from '../services/storage';
import { BookFormData } from '../types/book';

interface Props {
  book: BookFormData;
  onClose: () => void;
  onSaved: (updated: BookFormData, commitSha: string) => void;
}

export default function EditBookModal({ book, onClose, onSaved }: Props) {
  const { language } = useLanguage();
  const [data, setData] = useState<BookFormData>(book);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();

  const handleSave = async () => {
    const settings = await getSettings();
    if (!settings) return;
    if (!data.title.trim() || !data.author.trim()) {
      setError('Укажите автора и название');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const path = `books/${data.slug}.md`;
      const { sha } = await getFile(settings, path);
      const commitSha = await saveFile(settings, path, serialize(data), sha);
      onSaved(data, commitSha);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

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
          <Text style={styles.title}>Редактирование</Text>
          <Pressable onPress={onClose} disabled={saving}>
            <Text style={styles.cancel}>{t(language, 'common.cancel')}</Text>
          </Pressable>
        </View>

        <BookForm value={data} onChange={setData} showSlug={false} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveLabel}>Сохранить</Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111' },
  cancel: { fontSize: 15, color: '#666' },
  error: { marginHorizontal: 16, marginBottom: 4, fontSize: 14, color: '#c00' },
  saveButton: {
    margin: 16,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
