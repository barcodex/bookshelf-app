import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { concertSlug } from '../services/concertMarkdown';
import { t } from '../services/i18n';
import { ConcertFormData } from '../types/concert';
import DateInput from './DateInput';
import StarRating from './StarRating';
import TagInput from './TagInput';

interface Props {
  value: ConcertFormData;
  onChange: (data: ConcertFormData) => void;
  showSlug?: boolean; // только при создании новой карточки
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function ConcertForm({ value, onChange, showSlug = false }: Props) {
  const { language } = useLanguage();
  const slugEditedRef = useRef(false);

  const set = (field: keyof ConcertFormData) => (text: string) =>
    onChange({ ...value, [field]: text });

  // Авто-генерация slug из артиста и даты, пока пользователь его не трогал
  useEffect(() => {
    if (!showSlug || slugEditedRef.current) return;
    const generated = concertSlug(value.artist, value.date_attended);
    if (generated !== value.slug) {
      onChange({ ...value, slug: generated });
    }
  }, [value.artist, value.date_attended]);

  const handleSlugChange = (text: string) => {
    slugEditedRef.current = true;
    set('slug')(text.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Field label={t(language, 'concert.artist')}>
        <TextInput
          style={styles.input}
          value={value.artist}
          onChangeText={set('artist')}
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label={t(language, 'concert.support')}>
        <TagInput
          value={value.support}
          onChange={(support) => onChange({ ...value, support })}
          lowercase={false}
          placeholder={t(language, 'concert.supportPlaceholder')}
        />
      </Field>

      <Field label={t(language, 'concert.venue')}>
        <TextInput
          style={styles.input}
          value={value.venue}
          onChangeText={set('venue')}
          placeholder={t(language, 'concert.venuePlaceholder')}
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label="Spotify">
        <TextInput
          style={styles.input}
          value={value.spotify}
          onChangeText={set('spotify')}
          placeholder={t(language, 'concert.spotifyPlaceholder')}
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </Field>

      <Field label={t(language, 'concert.date')}>
        <DateInput value={value.date_attended} onChange={set('date_attended')} placeholder="Не указано" />
      </Field>

      <Field label={t(language, 'concert.rating')}>
        <StarRating value={value.rating} onChange={(rating) => onChange({ ...value, rating })} />
      </Field>

      <Field label={t(language, 'concert.tags')}>
        <TagInput value={value.tags} onChange={(tags) => onChange({ ...value, tags })} />
      </Field>

      <Field label={t(language, 'concert.summary')}>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={value.summary}
          onChangeText={set('summary')}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label={t(language, 'concert.review')}>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={value.review}
          onChangeText={set('review')}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#aaa"
        />
      </Field>

      {showSlug && (
        <Field label={t(language, 'concert.fileName')}>
          <TextInput
            style={styles.input}
            value={value.slug}
            onChangeText={handleSlugChange}
            placeholder="artist-yyyy-mm-dd"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>concerts/{value.slug || 'artist-yyyy-mm-dd'}.md</Text>
        </Field>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },
  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  multiline: { minHeight: 120 },
  hint: { fontSize: 12, color: '#999' },
});
