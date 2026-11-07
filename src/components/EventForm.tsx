import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { eventSlug } from '../services/eventMarkdown';
import { t } from '../services/i18n';
import { EventFormData } from '../types/event';
import { EventSection, authorLabel, kindLabel } from '../utils/eventSections';
import DateInput from './DateInput';
import SegmentedControl from './SegmentedControl';
import StarRating from './StarRating';
import TagInput from './TagInput';

interface Props {
  section: EventSection;
  value: EventFormData;
  onChange: (data: EventFormData) => void;
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

export default function EventForm({ section, value, onChange, showSlug = false }: Props) {
  const { language } = useLanguage();
  const slugEditedRef = useRef(false);
  const k = (key: string) => t(language, `${section.i18n}.${key}`);

  const set = (field: keyof EventFormData) => (text: string) =>
    onChange({ ...value, [field]: text });

  // Авто-генерация slug из названия и даты, пока пользователь его не трогал
  useEffect(() => {
    if (!showSlug || slugEditedRef.current) return;
    const generated = eventSlug(value.title, value.date_attended);
    if (generated !== value.slug) {
      onChange({ ...value, slug: generated });
    }
  }, [value.title, value.date_attended]);

  const handleSlugChange = (text: string) => {
    slugEditedRef.current = true;
    set('slug')(text.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'));
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <SegmentedControl<string>
        options={section.schema.kinds.map(kind => ({ value: kind, label: kindLabel(section, kind, language) }))}
        value={value.kind}
        onChange={(kind) => onChange({ ...value, kind })}
      />

      <Field label={k('title')}>
        <TextInput style={styles.input} value={value.title} onChangeText={set('title')} placeholderTextColor="#aaa" />
      </Field>

      {section.schema.originalTitle && (
        <Field label={k('originalTitle')}>
          <TextInput
            style={styles.input}
            value={value.original_title}
            onChangeText={set('original_title')}
            placeholder={k('originalTitlePlaceholder')}
            placeholderTextColor="#aaa"
          />
        </Field>
      )}

      <Field label={authorLabel(section, value.kind, language)}>
        <TextInput
          style={styles.input}
          value={value.author}
          onChangeText={set('author')}
          placeholder={k('authorPlaceholder')}
          placeholderTextColor="#aaa"
        />
      </Field>

      {section.schema.company && (
        <Field label={k('company')}>
          <TextInput
            style={styles.input}
            value={value.company}
            onChangeText={set('company')}
            placeholder={k('companyPlaceholder')}
            placeholderTextColor="#aaa"
          />
        </Field>
      )}

      <Field label={k('venue')}>
        <TextInput
          style={styles.input}
          value={value.venue}
          onChangeText={set('venue')}
          placeholder={k('venuePlaceholder')}
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label={k('link')}>
        <TextInput
          style={styles.input}
          value={value.link}
          onChangeText={set('link')}
          placeholder={k('linkPlaceholder')}
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </Field>

      <Field label={k('date')}>
        <DateInput value={value.date_attended} onChange={set('date_attended')} placeholder="Не указано" />
      </Field>

      <Field label={k('rating')}>
        <StarRating value={value.rating} onChange={(rating) => onChange({ ...value, rating })} />
      </Field>

      <Field label={k('tags')}>
        <TagInput value={value.tags} onChange={(tags) => onChange({ ...value, tags })} />
      </Field>

      <Field label={k('summary')}>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={value.summary}
          onChangeText={set('summary')}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#aaa"
        />
      </Field>

      <Field label={k('review')}>
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
        <Field label={k('fileName')}>
          <TextInput
            style={styles.input}
            value={value.slug}
            onChangeText={handleSlugChange}
            placeholder="title-yyyy-mm-dd"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>{section.collection.folder}/{value.slug || 'title-yyyy-mm-dd'}.md</Text>
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
