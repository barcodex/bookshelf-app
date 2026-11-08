import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GitHubErrorScreen, GitHubOfflineBanner } from '../components/GitHubErrorView';
import EventDetailModal from '../components/EventDetailModal';
import EventRow from '../components/EventRow';
import EditEventModal from '../components/EditEventModal';
import { TAB_EDGES } from '../components/SectionHeader';
import { useLanguage } from '../context/LanguageContext';
import { useEventCards } from '../hooks/useEventCards';
import { t } from '../services/i18n';
import { EventFormData } from '../types/event';
import { formatDisplayDate } from '../utils/groupBooks';
import { EventSection, eventCountLabel } from '../utils/eventSections';
import { EventGroup, buildEventGroups } from '../utils/groupEvents';
import { colors } from '../utils/theme';

export default function EventsTimelineScreen({ section }: { section: EventSection }) {
  const { language } = useLanguage();
  const { items, loading, refreshing, progress, githubError, refresh, forceReload, replaceItem } = useEventCards(section.collection);
  const [selected, setSelected] = useState<EventFormData | null>(null);
  const [editing, setEditing] = useState<EventFormData | null>(null);

  const sections = useMemo(() => buildEventGroups(items), [items]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={TAB_EDGES}>
        <ActivityIndicator size="large" />
        {progress && (
          <Text style={styles.progressText}>
            {t(language, 'common.loading')} {progress.current} / {progress.total}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  if (githubError && items.length === 0) {
    return <GitHubErrorScreen error={githubError} onRetry={forceReload} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={TAB_EDGES}>
      {githubError && <GitHubOfflineBanner error={githubError} onRetry={forceReload} />}
      <SectionList<EventFormData, EventGroup>
        sections={sections}
        keyExtractor={item => item.slug}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderSectionHeader={({ section: group }) => (
          <View style={[styles.yearHeader, { backgroundColor: group.backgroundColor }]}>
            <Text style={[styles.yearText, group.kind === 'undated' && styles.undatedText]}>
              {group.kind === 'undated' ? t(language, `${section.i18n}.undated`) : group.year}
            </Text>
            <Text style={styles.yearCount}>
              {eventCountLabel(section, group.data, language)}
            </Text>
          </View>
        )}
        renderSectionFooter={() => <View style={styles.sectionGap} />}
        renderItem={({ item, section: group }) => (
          <EventRow
            section={section}
            item={item}
            date={formatDisplayDate(item.date_attended, language)}
            backgroundColor={group.backgroundColor}
            onPress={() => setSelected(item)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t(language, `${section.i18n}.empty`)}</Text>}
        contentContainerStyle={styles.listContent}
      />

      {selected && (
        <EventDetailModal
          section={section}
          item={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
        />
      )}
      {editing && (
        <EditEventModal
          section={section}
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setEditing(null);
            replaceItem(updated);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.bg },
  progressText: { fontSize: 14, color: colors.textFaint },
  listContent: { paddingBottom: 32 },
  yearHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 6 },
  yearText: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: colors.fontTitle },
  undatedText: { color: colors.textMuted },
  yearCount: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  sectionGap: { height: 20, backgroundColor: colors.bg },
  empty: { textAlign: 'center', marginTop: 40, marginHorizontal: 24, color: colors.textFaint, fontSize: 15 },
});
