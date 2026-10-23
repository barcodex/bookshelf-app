import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';
import { autoSlug } from '../services/markdown';
import { MovieFormData } from '../types/movie';
import Checkbox from './Checkbox';
import DateInput from './DateInput';
import StarRating from './StarRating';
import TagInput from './TagInput';

interface Props {
  value: MovieFormData;
  onChange: (data: MovieFormData) => void;
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

export default function MovieForm({ value, onChange, showSlug = false }: Props) {
  const { language } = useLanguage();
  const slugEditedRef = useRef(false);

  const set = (field: keyof MovieFormData) => (text: string) =>
    onChange({ ...value, [field]: text });

  // Авто-генерация slug из фамилии режиссёра и названия, пока пользователь его не трогал
  useEffect(() => {
    if (!showSlug || slugEditedRef.current) return;
    const generated = autoSlug(value.director, value.title);
    if (generated !== value.slug) {
      onChange({ ...value, slug: generated });
    }
  }, [value.director, value.title]);

  const handleSlugChange = (text: string) => {
    slugEditedRef.current = true;
    set('slug')(text.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Field label={t(language, 'movie.title')}>
        <TextInput
          style={styles.input}
          value={value.title}
          onChangeText={set('title')}
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label={t(language, 'movie.originalTitle')}>
        <TextInput
          style={styles.input}
          value={value.original_title}
          onChangeText={set('original_title')}
          placeholder={t(language, 'movie.originalTitleHint')}
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label={t(language, 'movie.director')}>
        <TextInput
          style={styles.input}
          value={value.director}
          onChangeText={set('director')}
          placeholder={t(language, 'movie.directorPlaceholder')}
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label={t(language, 'movie.year')}>
        <TextInput
          style={styles.input}
          value={value.year}
          onChangeText={set('year')}
          keyboardType="numeric"
          maxLength={4}
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label="IMDb">
        <TextInput
          style={styles.input}
          value={value.imdb}
          onChangeText={set('imdb')}
          placeholder={t(language, 'movie.imdbPlaceholder')}
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </Field>

      <Field label={t(language, 'movie.dateWatched')}>
        <DateInput value={value.date_watched} onChange={set('date_watched')} placeholder="Не указано" />
      </Field>

      <Field label={t(language, 'movie.rating')}>
        {/* Оценка и «не досмотрено» взаимоисключающие: одно сбрасывает другое */}
        <StarRating value={value.rating} onChange={(rating) => onChange({ ...value, rating, abandoned: false })} />
        <Checkbox
          value={value.abandoned}
          onChange={(abandoned) => onChange({ ...value, abandoned, rating: abandoned ? 0 : value.rating })}
          label={t(language, 'movie.abandoned')}
        />
      </Field>

      <Field label={t(language, 'movie.tags')}>
        <TagInput value={value.tags} onChange={(tags) => onChange({ ...value, tags })} />
      </Field>

      <Field label={t(language, 'movie.summary')}>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={value.summary}
          onChangeText={set('summary')}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label={t(language, 'movie.review')}>
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
        <Field label={t(language, 'movie.fileName')}>
          <TextInput
            style={styles.input}
            value={value.slug}
            onChangeText={handleSlugChange}
            placeholder="director-title"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>movies/{value.slug || 'director-title'}.md</Text>
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
