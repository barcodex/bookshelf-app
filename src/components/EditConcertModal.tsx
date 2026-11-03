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
import { saveCard } from '../services/cardsService';
import { t } from '../services/i18n';
import { normalizeSpotify } from '../services/concertMarkdown';
import { concertsCollection } from '../services/concertsService';
import { getSettings } from '../services/storage';
import { ConcertFormData } from '../types/concert';
import ConcertForm from './ConcertForm';

interface Props {
  concert: ConcertFormData;
  onClose: () => void;
  onSaved: (updated: ConcertFormData) => void;
}

export default function EditConcertModal({ concert, onClose, onSaved }: Props) {
  const { language } = useLanguage();
  const [data, setData] = useState<ConcertFormData>(concert);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();

  const handleSave = async () => {
    const settings = await getSettings();
    if (!settings) return;
    if (!data.artist.trim() || !data.venue.trim()) {
      setError(t(language, 'concert.validationError'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = { ...data, spotify: normalizeSpotify(data.spotify) };
      await saveCard(concertsCollection, settings, updated);
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(language, 'common.error'));
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
          <Text style={styles.title}>{t(language, 'concert.editTitle')}</Text>
          <Pressable onPress={onClose} disabled={saving}>
            <Text style={styles.cancel}>{t(language, 'common.cancel')}</Text>
          </Pressable>
        </View>

        <ConcertForm value={data} onChange={setData} showSlug={false} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

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
