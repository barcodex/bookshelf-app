import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Checkbox from '../components/Checkbox';
import { useLanguage } from '../context/LanguageContext';
import { ExchangeSection, ExportedCard, buildExportFile, exchangeSections, exportCard, exportFileName, loadSection } from '../services/exchange';
import { t } from '../services/i18n';
import { parseCard } from '../services/markdown';
import { getSettings } from '../services/storage';
import { SectionId } from '../utils/sections';
import { colors } from '../utils/theme';

interface Row {
  key: string;            // «папка/slug»
  section: ExchangeSection;
  card: ExportedCard;
  title: string;
  date: string;
}

const yearOf = (date: string) => date.slice(0, 4);

// Скачивание файла в браузере; на телефоне — системное «Поделиться» с содержимым файла
async function deliver(json: string, fileName: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    await Share.share({ message: json, title: fileName });
  }
}

export default function ExportScreen() {
  const { language } = useLanguage();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<SectionId | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      if (!settings) return;
      try {
        const all: Row[] = [];
        for (const section of exchangeSections) {
          for (const item of await loadSection(section, settings)) {
            const card = exportCard(section, item);
            // Дата для фильтра — из своей карточки целиком: в сам экспорт личные даты не попадают
            const date = section.date(parseCard(section.collection.serialize(item)).fm);
            const title = section.title(card.fields) || item.slug;
            all.push({ key: `${section.folder}/${item.slug}`, section, card, title, date });
          }
        }
        all.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'ru'));
        setRows(all);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const inSection = useMemo(
    () => (rows ?? []).filter(r => sectionFilter === 'all' || r.section.id === sectionFilter),
    [rows, sectionFilter],
  );
  const years = useMemo(() => {
    const set = new Set(inSection.map(r => yearOf(r.date) || 'undated'));
    return [...set].sort((a, b) => (a === 'undated' ? 1 : b === 'undated' ? -1 : b.localeCompare(a)));
  }, [inSection]);
  const inYear = useMemo(
    () => inSection.filter(r => yearFilter === 'all' || (yearOf(r.date) || 'undated') === yearFilter),
    [inSection, yearFilter],
  );
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of inYear) {
      for (const tag of (r.card.fields.tags ?? '').split(',').map(s => s.trim()).filter(Boolean)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([tag]) => tag);
  }, [inYear]);
  const shown = useMemo(
    () => inYear.filter(r => !tagFilter || (r.card.fields.tags ?? '').split(',').map(s => s.trim()).includes(tagFilter)),
    [inYear, tagFilter],
  );

  const toggle = (key: string, on: boolean) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (on) next.add(key); else next.delete(key);
      return next;
    });

  const doExport = async () => {
    const cards = (rows ?? []).filter(r => selected.has(r.key)).map(r => r.card);
    if (cards.length === 0) return;
    await deliver(JSON.stringify(buildExportFile(cards), null, 2), exportFileName());
  };

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!rows) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.textMuted} />;

  const chip = (label: string, active: boolean, onPress: () => void, key: string) => (
    <Pressable key={key} style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
  const count = selected.size;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t(language, 'exchange.export')}</Text>
        <Text style={styles.hint}>{t(language, 'exchange.exportHint')}</Text>

        <View style={styles.chips}>
          {chip(t(language, 'exchange.allSections'), sectionFilter === 'all', () => { setSectionFilter('all'); setYearFilter('all'); setTagFilter(null); }, 'all')}
          {exchangeSections.map(s => chip(t(language, `sections.${s.id}`), sectionFilter === s.id, () => { setSectionFilter(s.id); setYearFilter('all'); setTagFilter(null); }, s.id))}
        </View>
        <View style={styles.chips}>
          {chip(t(language, 'exchange.allYears'), yearFilter === 'all', () => { setYearFilter('all'); setTagFilter(null); }, 'all')}
          {years.map(y => chip(y === 'undated' ? t(language, 'exchange.undated') : y, yearFilter === y, () => { setYearFilter(y); setTagFilter(null); }, y))}
        </View>
        {tags.length > 0 && (
          <View style={styles.chips}>
            {tags.map(tag => chip(`#${tag}`, tagFilter === tag, () => setTagFilter(tagFilter === tag ? null : tag), tag))}
          </View>
        )}

        <View style={styles.actions}>
          <Text style={styles.muted}>{t(language, 'exchange.shown').replace('{count}', String(shown.length))}</Text>
          <Pressable onPress={() => setSelected(prev => new Set([...prev, ...shown.map(r => r.key)]))}>
            <Text style={styles.link}>{t(language, 'exchange.selectShown')}</Text>
          </Pressable>
          <Pressable onPress={() => setSelected(new Set())}>
            <Text style={styles.link}>{t(language, 'exchange.clearSelection')}</Text>
          </Pressable>
        </View>

        {shown.length === 0 && <Text style={styles.muted}>{t(language, 'exchange.empty')}</Text>}
        {shown.map(r => (
          <View key={r.key} style={styles.row}>
            <Checkbox value={selected.has(r.key)} onChange={on => toggle(r.key, on)} label={r.title} />
            <Text style={styles.rowMeta}>
              {[t(language, `sections.${r.section.id}`), r.date].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.button, count === 0 && styles.buttonDisabled]} disabled={count === 0} onPress={doExport}>
          <Text style={styles.buttonText}>
            {t(language, Platform.OS === 'web' ? 'exchange.download' : 'exchange.share').replace('{count}', String(count))}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: colors.fontTitle },
  hint: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.bgInput,
  },
  chipActive: { backgroundColor: colors.tagActive, borderColor: colors.tagActiveBorder },
  chipText: { fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 4 },
  muted: { fontSize: 13, color: colors.textFaint },
  link: { fontSize: 13, color: colors.reset },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderFaint, gap: 2 },
  rowMeta: { fontSize: 12, color: colors.textFaint, marginLeft: 28 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  button: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { margin: 16, color: '#b00020', fontSize: 14 },
});
