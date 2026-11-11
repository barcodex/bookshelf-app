import { useNavigation } from '@react-navigation/native';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { Language, t, toIntlLocale } from '../services/i18n';
import { ConcertFormData } from '../types/concert';
import { isYearOnly } from '../utils/groupBooks';
import MarkdownText from './MarkdownText';
import StarRating from './StarRating';

interface Props {
  concert: ConcertFormData;
  onClose: () => void;
  onEdit?: () => void;
}

const formatDate = (iso: string, language: Language) =>
  isYearOnly(iso)
    ? iso
    : new Intl.DateTimeFormat(toIntlLocale(language), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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

export default function ConcertDetailModal({ concert, onClose, onEdit }: Props) {
  const navigation = useNavigation<any>();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

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
            <Text style={styles.title}>{concert.artist}</Text>
            <Text style={styles.director}>{concert.venue}</Text>
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
          {concert.kind === 'standup' && (
            <Row label={t(language, 'concert.kind')} value={t(language, 'concert.kindStandup')} />
          )}
          {!!concert.date_attended && (
            <Row label={t(language, 'concert.date')} value={formatDate(concert.date_attended, language)} />
          )}
          <Row label={t(language, 'concert.support')} value={concert.support.join(', ')} />
          {concert.rating > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t(language, 'concert.rating')}</Text>
              <View style={styles.ratingValue}>
                <StarRating value={concert.rating} size="sm" exact />
              </View>
            </View>
          )}
          {concert.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {concert.tags.map(tag => (
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
          {!!concert.spotify && (
            <Pressable
              style={styles.spotifyBtn}
              onPress={() => Linking.openURL(concert.spotify)}
              accessibilityRole="link"
            >
              <Text style={styles.spotifyBtnText}>{t(language, 'concert.openSpotify')} ↗</Text>
            </Pressable>
          )}

          {concert.summary ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t(language, 'concert.summary')}</Text>
              <MarkdownText text={concert.summary} />
            </View>
          ) : null}

          {concert.review ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t(language, 'concert.review')}</Text>
              <MarkdownText text={concert.review} />
            </View>
          ) : null}
        </ScrollView>
      </View>
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
  director: { fontSize: 15, color: '#555' },
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
  ratingValue: { flex: 1, gap: 4 },
  section: { paddingTop: 8, gap: 6 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  spotifyBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1db954',
  },
  spotifyBtnText: { fontSize: 14, color: '#111', fontWeight: '700' },
});
