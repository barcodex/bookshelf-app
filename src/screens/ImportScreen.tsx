import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SegmentedControl from '../components/SegmentedControl';
import { useCacheContext } from '../context/CacheContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ImportFileError, ImportItem, Resolution, exchangeSections, loadSection, parseExportFile, planImport, resolveItem, runImport,
} from '../services/exchange';
import { t } from '../services/i18n';
import { getSettings } from '../services/storage';
import { colors } from '../utils/theme';

type Status = 'new' | 'match' | 'unchanged' | 'unknown' | 'duplicate';

function statusOf(item: ImportItem): Status {
  if (!item.section) return 'unknown';
  if (item.duplicate) return 'duplicate';
  if (!item.existing) return 'new';
  return resolveItem(item, 'fill') === null && resolveItem(item, 'replace') === null ? 'unchanged' : 'match';
}

// Выбор файла в браузере; на телефоне файл вставляется текстом
function pickFile(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? await file.text() : null);
    };
    input.click();
  });
}

export default function ImportScreen() {
  const { language } = useLanguage();
  const { bumpVersion } = useCacheContext();
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<{ item: ImportItem; status: Status }[] | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [done, setDone] = useState<{ count: number; sha: string | null; repo: string } | null>(null);

  const analyze = async (text: string) => {
    setError(null);
    setBusy(true);
    try {
      const cards = parseExportFile(text);
      const settings = await getSettings();
      if (!settings) return;
      const folders = new Set(cards.map(c => c.section));
      const existing = new Map<string, { slug: string }[]>();
      for (const section of exchangeSections.filter(s => folders.has(s.folder))) {
        existing.set(section.folder, await loadSection(section, settings));
      }
      const planned = planImport(cards, existing).map(item => ({ item, status: statusOf(item) }));
      const order: Status[] = ['match', 'new', 'unchanged', 'duplicate', 'unknown'];
      planned.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
      setItems(planned);
      setResolutions(Object.fromEntries(planned.map(({ item, status }) =>
        [item.id, status === 'new' || status === 'match' ? 'fill' : 'skip'])));
    } catch (e) {
      setError(e instanceof ImportFileError ? t(language, `exchange.error.${e.code}`) : e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toWrite = useMemo(
    () => (items ?? []).filter(({ item }) => resolveItem(item, resolutions[item.id] ?? 'skip') !== null).length,
    [items, resolutions],
  );

  const doImport = async () => {
    if (!items) return;
    const settings = await getSettings();
    if (!settings) return;
    setBusy(true);
    setError(null);
    try {
      const result = await runImport(settings, items.map(i => i.item), resolutions);
      bumpVersion();
      setDone({ count: result.written, sha: result.commitSha, repo: settings.repo });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setItems(null); setDone(null); setPasted(''); setError(null); };

  if (done) {
    return (
      <View style={[styles.container, styles.content]}>
        <Text style={styles.title}>{t(language, 'exchange.import')}</Text>
        <Text style={styles.text}>
          {done.count > 0 ? t(language, 'exchange.done').replace('{count}', String(done.count)) : t(language, 'exchange.nothingToDo')}
        </Text>
        {done.sha && (
          <Pressable onPress={() => Linking.openURL(`https://github.com/${done.repo}/commit/${done.sha}`)}>
            <Text style={styles.link}>{done.sha.slice(0, 7)}</Text>
          </Pressable>
        )}
        <Pressable onPress={reset}><Text style={styles.link}>{t(language, 'exchange.another')}</Text></Pressable>
      </View>
    );
  }

  if (!items) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t(language, 'exchange.import')}</Text>
        <Text style={styles.hint}>{t(language, 'exchange.importHint')}</Text>
        {Platform.OS === 'web' && (
          <Pressable
            style={[styles.button, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={async () => { const text = await pickFile(); if (text !== null) analyze(text); }}
          >
            <Text style={styles.buttonText}>{t(language, 'exchange.chooseFile')}</Text>
          </Pressable>
        )}
        <TextInput
          style={styles.paste}
          value={pasted}
          onChangeText={setPasted}
          placeholder={t(language, 'exchange.pastePlaceholder')}
          placeholderTextColor={colors.textFaint}
          multiline
        />
        {pasted.trim().length > 0 && (
          <Pressable style={[styles.buttonSecondary, busy && styles.buttonDisabled]} disabled={busy} onPress={() => analyze(pasted)}>
            <Text style={styles.buttonSecondaryText}>{t(language, 'exchange.read')}</Text>
          </Pressable>
        )}
        {busy && <ActivityIndicator color={colors.textMuted} />}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    );
  }

  const count = (s: Status[]) => items.filter(i => s.includes(i.status)).length;
  const groups: { label: string; statuses: Status[] }[] = [
    { label: t(language, 'exchange.matches').replace('{count}', String(count(['match']))), statuses: ['match'] },
    { label: t(language, 'exchange.newCards').replace('{count}', String(count(['new']))), statuses: ['new'] },
    {
      label: t(language, 'exchange.skipped').replace('{count}', String(count(['unchanged', 'duplicate', 'unknown']))),
      statuses: ['unchanged', 'duplicate', 'unknown'],
    },
  ];
  const note: Partial<Record<Status, string>> = {
    unchanged: t(language, 'exchange.unchanged'),
    duplicate: t(language, 'exchange.duplicate'),
    unknown: t(language, 'exchange.unknownSection'),
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t(language, 'exchange.import')}</Text>
        {count(['match']) > 0 && <Text style={styles.hint}>{t(language, 'exchange.resolutionHint')}</Text>}
        {groups.filter(g => count(g.statuses) > 0).map(g => (
          <View key={g.label} style={styles.group}>
            <Text style={styles.groupTitle}>{g.label}</Text>
            {items.filter(i => g.statuses.includes(i.status)).map(({ item, status }) => (
              <View key={item.id} style={styles.row}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>
                  {[item.section ? t(language, `sections.${item.section.id}`) : item.card.section, item.date, note[status]]
                    .filter(Boolean).join(' · ')}
                </Text>
                {status === 'new' && (
                  <SegmentedControl<Resolution>
                    options={[
                      { value: 'fill', label: t(language, 'exchange.add') },
                      { value: 'skip', label: t(language, 'exchange.skip') },
                    ]}
                    value={resolutions[item.id]}
                    onChange={v => setResolutions(r => ({ ...r, [item.id]: v }))}
                  />
                )}
                {status === 'match' && (
                  <SegmentedControl<Resolution>
                    options={[
                      { value: 'skip', label: t(language, 'exchange.skip') },
                      { value: 'fill', label: t(language, 'exchange.fill') },
                      { value: 'replace', label: t(language, 'exchange.replace') },
                    ]}
                    value={resolutions[item.id]}
                    onChange={v => setResolutions(r => ({ ...r, [item.id]: v }))}
                  />
                )}
              </View>
            ))}
          </View>
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable onPress={reset}><Text style={styles.link}>{t(language, 'common.cancel')}</Text></Pressable>
        <Pressable style={[styles.button, styles.grow, (busy || toWrite === 0) && styles.buttonDisabled]} disabled={busy || toWrite === 0} onPress={doImport}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t(language, 'exchange.importButton').replace('{count}', String(toWrite))}</Text>}
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
  text: { fontSize: 15, color: colors.text },
  paste: {
    minHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, fontSize: 13, color: colors.text, backgroundColor: colors.bgInput, textAlignVertical: 'top',
  },
  group: { gap: 4, marginTop: 8 },
  groupTitle: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderFaint, gap: 6 },
  rowTitle: { fontSize: 15, color: colors.text, fontWeight: '500' },
  rowMeta: { fontSize: 12, color: colors.textFaint },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg,
  },
  grow: { flex: 1 },
  button: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonSecondary: { borderWidth: 1, borderColor: colors.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  buttonSecondaryText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  link: { fontSize: 14, color: colors.reset },
  error: { color: '#b00020', fontSize: 14 },
});
