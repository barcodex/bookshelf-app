import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GitHubErrorScreen, GitHubOfflineBanner } from '../components/GitHubErrorView';
import ConcertDetailModal from '../components/ConcertDetailModal';
import ConcertRow from '../components/ConcertRow';
import EditConcertModal from '../components/EditConcertModal';
import { TAB_EDGES } from '../components/SectionHeader';
import { useLanguage } from '../context/LanguageContext';
import { useConcerts } from '../hooks/useConcerts';
import { t } from '../services/i18n';
import { ConcertFormData } from '../types/concert';
import { formatDisplayDate } from '../utils/groupBooks';
import { ConcertSection, buildConcertSections, concertCountLabel } from '../utils/groupConcerts';
import { colors } from '../utils/theme';

export default function ConcertsTimelineScreen() {
  const { language } = useLanguage();
  const { concerts, loading, refreshing, progress, githubError, refresh, forceReload, replaceConcert } = useConcerts();
  const [selected, setSelected] = useState<ConcertFormData | null>(null);
  const [editing, setEditing] = useState<ConcertFormData | null>(null);

  const sections = useMemo(() => buildConcertSections(concerts), [concerts]);

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

  if (githubError && concerts.length === 0) {
    return <GitHubErrorScreen error={githubError} onRetry={forceReload} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={TAB_EDGES}>
      {githubError && <GitHubOfflineBanner error={githubError} onRetry={forceReload} />}
      <SectionList<ConcertFormData, ConcertSection>
        sections={sections}
        keyExtractor={item => item.slug}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderSectionHeader={({ section }) => (
          <View style={[styles.yearHeader, { backgroundColor: section.backgroundColor }]}>
            <Text style={[styles.yearText, section.kind === 'undated' && styles.undatedText]}>
              {section.kind === 'undated' ? t(language, 'concert.undated') : section.year}
            </Text>
            <Text style={styles.yearCount}>
              {concertCountLabel(section.data, language)}
            </Text>
          </View>
        )}
        renderSectionFooter={() => <View style={styles.sectionGap} />}
        renderItem={({ item, section }) => (
          <ConcertRow
            concert={item}
            date={formatDisplayDate(item.date_attended, language)}
            backgroundColor={section.backgroundColor}
            onPress={() => setSelected(item)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t(language, 'concert.empty')}</Text>}
        contentContainerStyle={styles.listContent}
      />

      {selected && (
        <ConcertDetailModal
          concert={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
        />
      )}
      {editing && (
        <EditConcertModal
          concert={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setEditing(null);
            replaceConcert(updated);
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
