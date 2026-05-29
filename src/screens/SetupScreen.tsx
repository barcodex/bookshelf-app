import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { validateAccess } from '../services/github';
import { Settings } from '../services/storage';

interface Props {
  onComplete: (settings: Settings) => void;
}

function normalizeRepo(input: string): string {
  const match = input.match(/github\.com[:/]([^/\s]+\/[^/\s.]+)/);
  if (match) return match[1].replace(/\.git$/, '');
  if (/^[^/\s]+\/[^/\s]+$/.test(input)) return input;
  return input.trim();
}

export default function SetupScreen({ onComplete }: Props) {
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setError('');
    const normalized = normalizeRepo(repo);
    if (!normalized || !token.trim()) {
      setError('Заполните оба поля');
      return;
    }
    setLoading(true);
    try {
      const settings: Settings = { repo: normalized, token: token.trim() };
      await validateAccess(settings);
      onComplete(settings);
    } catch {
      setError('Не удалось подключиться. Проверьте адрес репозитория и токен.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Книжная полка</Text>
          <Text style={styles.subtitle}>
            Укажите GitHub-репозиторий с контентом и Personal Access Token.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Репозиторий</Text>
            <TextInput
              style={styles.input}
              value={repo}
              onChangeText={setRepo}
              placeholder="owner/repo"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Personal Access Token</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="ghp_..."
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.hint}>
              github.com → Settings → Developer settings → Personal access tokens → Tokens (classic), scope: repo
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleConnect}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonLabel}>Подключить</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22 },
  form: { gap: 20 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  hint: { fontSize: 12, color: '#999', lineHeight: 18 },
  error: { fontSize: 14, color: '#c00' },
  button: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
