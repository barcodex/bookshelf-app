import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';
import BookForm from '../components/BookForm';
import { GitHubErrorScreen } from '../components/GitHubErrorView';
import { upsertCachedBook, updateCachedCommitSha } from '../services/booksCache';
import { getFile, saveFile, GitHubError } from '../services/github';
import { serialize } from '../services/markdown';
import { getSettings } from '../services/storage';
import { BookFormData, emptyBook } from '../types/book';

export default function AddBookScreen() {
  const { language } = useLanguage();
  const [data, setData] = useState<BookFormData>(emptyBook);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [githubError, setGithubError] = useState<GitHubError | null>(null);

  const handleSave = async () => {
    const settings = await getSettings();
    if (!settings) return;

    setError('');
    setSuccess('');
    setGithubError(null);

    if (!data.title.trim() || !data.author.trim() || !data.date_finished.trim()) {
      setError(t(language, 'addBook.validationError'));
      return;
    }
    if (!data.slug.trim()) {
      setError(t(language, 'common.error'));
      return;
    }

    setSaving(true);
    try {
      const path = `books/${data.slug}.md`;
      let sha: string | undefined;
      try {
        const existing = await getFile(settings, path);
        sha = existing.sha;
      } catch {}

      const commitSha = await saveFile(settings, path, serialize(data), sha);
      upsertCachedBook(data);
      updateCachedCommitSha(commitSha);
      setSuccess(t(language, 'addBook.success'));
      setData(emptyBook);
    } catch (e) {
      if (e instanceof GitHubError) {
        setGithubError(e);
      } else {
        setError(e instanceof Error ? e.message : t(language, 'common.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (githubError) {
    return <GitHubErrorScreen error={githubError} onRetry={() => setGithubError(null)} />;
  }

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
          <Text style={styles.saveLabel}>{t(language, 'addBook.save')}</Text>
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
