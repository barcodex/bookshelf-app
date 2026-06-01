import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { GitHubError, GitHubErrorType } from '../services/github';
import { clearSettings } from '../services/storage';
import { clearBooksCache } from '../services/booksCache';

const ERROR_CONTENT: Record<GitHubErrorType, { title: string; message: string; canReset: boolean }> = {
  auth: {
    title: 'Ошибка авторизации',
    message: 'Токен доступа недействителен или не имеет прав на репозиторий. Сбросьте настройки и введите новый токен.',
    canReset: true,
  },
  not_found: {
    title: 'Репозиторий не найден',
    message: 'Проверьте адрес репозитория в настройках.',
    canReset: true,
  },
  rate_limit: {
    title: 'Превышен лимит запросов',
    message: 'GitHub разрешает 5 000 запросов в час. Попробуйте через час.',
    canReset: false,
  },
  server: {
    title: 'GitHub недоступен',
    message: 'Серверы GitHub не отвечают. Проверьте githubstatus.com и попробуйте позже.',
    canReset: false,
  },
  network: {
    title: 'Нет подключения',
    message: 'Не удалось соединиться с GitHub. Проверьте подключение к интернету.',
    canReset: false,
  },
};

function handleReset() {
  clearSettings();
  clearBooksCache();
  if (typeof window !== 'undefined') window.location.reload();
}

// Полноэкранный вид — когда кэша нет и GitHub недоступен
export function GitHubErrorScreen({
  error,
  onRetry,
}: {
  error: GitHubError;
  onRetry: () => void;
}) {
  const { title, message, canReset } = ERROR_CONTENT[error.type];
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.icon}>⚠</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryLabel}>Попробовать снова</Text>
      </Pressable>
      {canReset && (
        <Pressable style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetLabel}>Сбросить настройки</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

// Тонкий баннер — когда кэш есть, но GitHub временно недоступен
export function GitHubOfflineBanner({
  error,
  onRetry,
}: {
  error: GitHubError;
  onRetry: () => void;
}) {
  const { title } = ERROR_CONTENT[error.type];
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{title} · показаны сохранённые данные</Text>
      <Pressable onPress={onRetry}>
        <Text style={styles.bannerRetry}>Обновить</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
    gap: 16,
  },
  icon: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '700', color: '#111', textAlign: 'center' },
  message: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
  resetBtn: { paddingVertical: 8 },
  resetLabel: { color: '#888', fontSize: 14 },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ffe69c',
  },
  bannerText: { fontSize: 13, color: '#664d03', flex: 1 },
  bannerRetry: { fontSize: 13, color: '#664d03', fontWeight: '700', marginLeft: 8 },
});
