import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GitHubErrorScreen } from '../components/GitHubErrorView';
import RatingLadder, { LadderCard } from '../components/RatingLadder';
import SegmentedControl from '../components/SegmentedControl';
import { TAB_EDGES } from '../components/SectionHeader';
import { useCacheContext } from '../context/CacheContext';
import { useLanguage } from '../context/LanguageContext';
import { useEventCards } from '../hooks/useEventCards';
import { Collection, saveCardsPatch } from '../services/cardsService';
import { Language } from '../services/i18n';
import { getSettings } from '../services/storage';
import { colors } from '../utils/theme';

type Rateable = { slug: string; rating: number };

// Настройки лестницы для раздела
export interface RatingConfig<T extends Rateable> {
  collection: Collection<T>;
  noun: [string, string];  // для сообщения коммита: «movie», «movies»
  // Карточка для лестницы или null, если её не сравнивают (например, книга ещё читается)
  toCard: (item: T, language: Language) => Omit<LadderCard, 'slug' | 'rating'> | null;
  // При равных оценках и без оценки сверху свежие: ключ сортировки, обычно дата
  recency: (item: T) => string;
  // Виды, которые сравниваются каждый на своей лестнице (концерты и стендап)
  groups?: { id: string; label: (language: Language) => string; test: (item: T) => boolean }[];
}

export function makeRatingScreen<T extends Rateable>(config: RatingConfig<T>) {
  return function RatingScreen() {
    const { language } = useLanguage();
    const { items, loading, githubError, forceReload } = useEventCards(config.collection);
    const { bumpVersion } = useCacheContext();
    const groups = config.groups;
    const [groupId, setGroupId] = useState(groups?.[0].id ?? '');

    const cards = useMemo<LadderCard[]>(() => {
      const group = groups?.find(g => g.id === groupId);
      return [...items]
        .filter(item => !group || group.test(item))
        .sort((a, b) => config.recency(b).localeCompare(config.recency(a)))
        .flatMap(item => {
          const card = config.toCard(item, language);
          return card ? [{ ...card, slug: item.slug, rating: item.rating }] : [];
        });
    }, [items, language, groups, groupId]);

    const save = useCallback(async (ratings: Record<string, number>) => {
      const settings = await getSettings();
      if (!settings) throw new Error('no settings');
      const patch = Object.fromEntries(
        Object.entries(ratings).map(([slug, rating]) => [slug, { rating } as Partial<T>]),
      );
      const n = Object.keys(patch).length;
      await saveCardsPatch(config.collection, settings, patch, `Update ratings of ${n} ${config.noun[n === 1 ? 0 : 1]}`);
      bumpVersion();
    }, [bumpVersion]);

    if (loading) {
      return (
        <SafeAreaView style={styles.center} edges={TAB_EDGES}>
          <ActivityIndicator size="large" />
        </SafeAreaView>
      );
    }
    if (githubError && items.length === 0) {
      return <GitHubErrorScreen error={githubError} onRetry={forceReload} />;
    }
    return (
      <SafeAreaView style={styles.container} edges={TAB_EDGES}>
        {groups && (
          <View style={styles.switcher}>
            <SegmentedControl
              options={groups.map(g => ({ value: g.id, label: g.label(language) }))}
              value={groupId}
              onChange={setGroupId}
            />
          </View>
        )}
        {/* Смена вида размонтирует лестницу, и она сохраняет несохранённое */}
        <RatingLadder key={groupId} cards={cards} onSave={save} />
      </SafeAreaView>
    );
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  switcher: { paddingHorizontal: 16, paddingTop: 12 },
});
