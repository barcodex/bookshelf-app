import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GitHubErrorScreen } from '../components/GitHubErrorView';
import MovieForm from '../components/MovieForm';
import { TAB_EDGES } from '../components/SectionHeader';
import { useLanguage } from '../context/LanguageContext';
import { saveCard } from '../services/cardsService';
import { GitHubError } from '../services/github';
import { t } from '../services/i18n';
import { normalizeImdb } from '../services/movieMarkdown';
import { moviesCollection } from '../services/moviesService';
import { getSettings } from '../services/storage';
import { MovieFormData, emptyMovie } from '../types/movie';

export default function AddMovieScreen() {
  const { language } = useLanguage();
  const [data, setData] = useState<MovieFormData>(emptyMovie);
  // Новый key сбрасывает форму вместе с признаком «slug правили руками»
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [githubError, setGithubError] = useState<GitHubError | null>(null);

  const reset = () => {
    setData(emptyMovie);
    setFormKey(k => k + 1);
  };

  const handleSave = async () => {
    const settings = await getSettings();
    if (!settings) return;

    setError('');
    setSuccess('');
    setGithubError(null);

    if (!data.title.trim() || !data.director.trim()) {
      setError(t(language, 'movie.validationError'));
      return;
    }
    if (!data.slug.trim()) {
      setError(t(language, 'common.error'));
      return;
    }

    setSaving(true);
    try {
      await saveCard(moviesCollection, settings, { ...data, imdb: normalizeImdb(data.imdb) });
      setSuccess(t(language, 'addBook.success'));
      reset();
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

  const handleCancel = () => {
    reset();
    setError('');
    setSuccess('');
  };

  if (githubError) {
    return <GitHubErrorScreen error={githubError} onRetry={() => setGithubError(null)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={TAB_EDGES}>
      <MovieForm key={formKey} value={data} onChange={setData} showSlug />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.cancelButton, saving && styles.saveButtonDisabled]}
          onPress={handleCancel}
          disabled={saving}
        >
          <Text style={styles.cancelLabel}>{t(language, 'common.cancel')}</Text>
        </Pressable>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  error: { marginHorizontal: 16, marginBottom: 4, fontSize: 14, color: '#c00' },
  success: { marginHorizontal: 16, marginBottom: 4, fontSize: 14, color: '#080' },
  buttonRow: { flexDirection: 'row', margin: 16, gap: 12 },
  saveButton: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelLabel: { color: '#111', fontSize: 16, fontWeight: '600' },
});
