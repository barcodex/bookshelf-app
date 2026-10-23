import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { autoSlug } from '../services/markdown';
import { BookFormData, BookMedia } from '../types/book';
import DateInput from './DateInput';
import SegmentedControl from './SegmentedControl';
import StarRating from './StarRating';
import TagInput from './TagInput';

const MEDIA_OPTIONS: { value: BookMedia; label: string }[] = [
  { value: 'бумажная', label: 'Бумажная' },
  { value: 'электронная', label: 'Электронная' },
  { value: 'аудио', label: 'Аудио' },
];

interface Props {
  value: BookFormData;
  onChange: (data: BookFormData) => void;
  showSlug?: boolean; // только при создании новой книги
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function BookForm({ value, onChange, showSlug = false }: Props) {
  const slugEditedRef = useRef(false);

  const set = (field: keyof BookFormData) => (text: string) =>
    onChange({ ...value, [field]: text });

  const setLanguage = (lang: string) => {
    const update: BookFormData = { ...value, original_language: lang };
    if (lang === 'ru') update.original_title = '';
    onChange(update);
  };

  // Авто-генерация slug, пока пользователь его не трогал
  useEffect(() => {
    if (!showSlug || slugEditedRef.current) return;
    const generated = autoSlug(value.author, value.title);
    if (generated !== value.slug) {
      onChange({ ...value, slug: generated });
    }
  }, [value.author, value.title]);

  const handleSlugChange = (text: string) => {
    slugEditedRef.current = true;
    set('slug')(text.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));
  };

  const showOriginalTitle =
    value.original_language.trim() !== '' && value.original_language.trim() !== 'ru';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Field label="Автор">
        <TextInput
          style={styles.input}
          value={value.author}
          onChangeText={set('author')}
          placeholder="Имя Фамилия"
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label="Название">
        <TextInput
          style={styles.input}
          value={value.title}
          onChangeText={set('title')}
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label="Язык оригинала">
        <TextInput
          style={styles.input}
          value={value.original_language}
          onChangeText={setLanguage}
          placeholder="ru"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
        />
      </Field>

      {showOriginalTitle && (
        <Field label="Название оригинала">
          <TextInput
            style={styles.input}
            value={value.original_title}
            onChangeText={set('original_title')}
            placeholderTextColor="#aaa"
          />
        </Field>
      )}

      <Field label="Год издания">
        <TextInput
          style={styles.input}
          value={value.year}
          onChangeText={set('year')}
          keyboardType="numeric"
          maxLength={4}
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label="Формат">
        <SegmentedControl<BookMedia>
          options={MEDIA_OPTIONS}
          value={value.media}
          onChange={(v) => onChange({ ...value, media: v })}
        />
      </Field>

      <Field label="Источник">
        <TextInput
          style={styles.input}
          value={value.source}
          onChangeText={set('source')}
          placeholder="своя коллекция, имя знакомого, название библиотеки…"
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label="Начало чтения">
        <DateInput value={value.date_started} onChange={set('date_started')} placeholder="Не указано" />
      </Field>

      <Field label="Конец чтения">
        <DateInput value={value.date_finished} onChange={set('date_finished')} placeholder="Не указано" />
      </Field>

      <Field label="Теги">
        <TagInput value={value.tags} onChange={(tags) => onChange({ ...value, tags })} />
      </Field>

      <Field label="Рейтинг">
        <StarRating value={value.rating} onChange={(rating) => onChange({ ...value, rating })} />
      </Field>

      <Field label="Резюме">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={value.summary}
          onChangeText={set('summary')}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label="Отзыв">
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
        <Field label="Имя файла">
          <TextInput
            style={styles.input}
            value={value.slug}
            onChangeText={handleSlugChange}
            placeholder="author-title"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>books/{value.slug || 'author-title'}.md</Text>
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
