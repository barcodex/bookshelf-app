import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text } from 'react-native';
import BookForm from '../components/BookForm';
import { useCacheContext } from '../context/CacheContext';
import { getFile, saveFile } from '../services/github';
import { serialize } from '../services/markdown';
import { getSettings } from '../services/storage';
import { BookFormData, emptyBook } from '../types/book';

export default function AddBookScreen() {
  const [data, setData] = useState<BookFormData>(emptyBook);
  const [saving, setSaving] = useState(false);
  const { invalidate } = useCacheContext();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    const settings = getSettings();
    if (!settings) return;

    setError('');
    setSuccess('');

    if (!data.title.trim() || !data.author.trim() || !data.date_finished.trim()) {
      setError('Укажите автора, название и дату конца чтения');
      return;
    }
    if (!data.slug.trim()) {
      setError('Не удалось сгенерировать имя файла');
      return;
    }

    setSaving(true);
    try {
      const path = `books/${data.slug}.md`;
      let sha: string | undefined;
      try {
        const existing = await getFile(settings, path);
        sha = existing.sha;
      } catch {
        // файл не существует — создаём новый
      }
      await saveFile(settings, path, serialize(data), sha);
      invalidate();
      setSuccess(`Сохранено: books/${data.slug}.md`);
      setData(emptyBook);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BookForm value={data} onChange={setData} showSlug />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  error: { marginHorizontal: 16, marginBottom: 4, fontSize: 14, color: '#c00' },
  success: { marginHorizontal: 16, marginBottom: 4, fontSize: 14, color: '#080' },
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
