import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';
import {
  IMAGE_MAX_SIDE, POSTER_MAX_SIDE, addPending, imagesSupported, newImageName,
  pickImageFiles, prepareImage, readClipboardImage,
} from '../services/images';
import { FoundPoster } from '../services/wikipedia';
import { colors } from '../utils/theme';
import ImageViewer from './ImageViewer';
import RepoImage from './RepoImage';

export interface CardImages {
  poster: string;
  images: string[];
}

interface Props {
  folder: string;
  slug: string;
  value: CardImages;
  onChange: (value: CardImages) => void;
  // Поиск постера; без него кнопки «Найти» нет
  lookup?: () => Promise<FoundPoster | null>;
  // Когда ключ меняется (например, ввели ссылку IMDb), а постера нет, поиск запускается сам
  autoLookupKey?: string;
}

// Раздел формы: постер (найти, вставить, выбрать файл, убрать) и свои картинки
export default function CardImagesField({ folder, slug, value, onChange, lookup, autoLookupKey }: Props) {
  const { language } = useLanguage();
  const [busy, setBusy] = useState<'poster' | 'images' | null>(null);
  const [status, setStatus] = useState<{ text: string; link?: string } | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  // Поиск и чтение файлов асинхронные: к их концу форма могла измениться
  const valueRef = useRef(value);
  valueRef.current = value;
  const triedRef = useRef(new Set<string>());

  const setPoster = async (blob: Blob) => {
    const name = newImageName('poster');
    addPending(name, await prepareImage(blob, POSTER_MAX_SIDE));
    onChange({ ...valueRef.current, poster: name });
  };

  const addImages = async (blobs: Blob[]) => {
    const names: string[] = [];
    for (const blob of blobs) {
      const name = newImageName('image');
      addPending(name, await prepareImage(blob, IMAGE_MAX_SIDE));
      names.push(name);
    }
    onChange({ ...valueRef.current, images: [...valueRef.current.images, ...names] });
  };

  const run = async (kind: 'poster' | 'images', job: () => Promise<void>) => {
    setBusy(kind);
    setStatus(null);
    try {
      await job();
    } catch {
      setStatus({ text: t(language, 'images.failed') });
    } finally {
      setBusy(null);
    }
  };

  const findPoster = (auto = false) => lookup && run('poster', async () => {
    const found = await lookup();
    if (!found) {
      if (!auto) setStatus({ text: t(language, 'images.notFound') });
      return;
    }
    // Пока искали, постер могли вставить руками — его не трогаем
    if (auto && valueRef.current.poster) return;
    await setPoster(found.blob);
    setStatus({ text: t(language, 'images.foundOnWikipedia'), link: found.page });
  });

  useEffect(() => {
    if (!imagesSupported || !lookup || !autoLookupKey || value.poster) return;
    if (triedRef.current.has(autoLookupKey)) return;
    const timer = setTimeout(() => {
      triedRef.current.add(autoLookupKey);
      findPoster(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [autoLookupKey]);

  const paste = (kind: 'poster' | 'images') => run(kind, async () => {
    const blob = await readClipboardImage();
    if (!blob) {
      setStatus({ text: t(language, 'images.clipboardEmpty') });
      return;
    }
    if (kind === 'poster') await setPoster(blob);
    else await addImages([blob]);
  });

  const pick = (kind: 'poster' | 'images') => run(kind, async () => {
    const files = await pickImageFiles(kind === 'images');
    if (files.length === 0) return;
    if (kind === 'poster') await setPoster(files[0]);
    else await addImages(files);
  });

  if (!imagesSupported) return null;

  const all = [value.poster, ...value.images].filter(Boolean);

  return (
    <View style={styles.container}>
      <View style={styles.posterRow}>
        {value.poster ? (
          <RepoImage
            folder={folder} slug={slug} name={value.poster} style={styles.poster}
            onPress={() => setViewer(0)}
          />
        ) : (
          <View style={[styles.poster, styles.posterEmpty]}>
            <Text style={styles.posterEmptyText}>{t(language, 'images.noPoster')}</Text>
          </View>
        )}
        <View style={styles.actions}>
          {lookup && (
            <Button label={t(language, 'images.findPoster')} onPress={() => findPoster()} disabled={!!busy} />
          )}
          <Button label={t(language, 'images.paste')} onPress={() => paste('poster')} disabled={!!busy} />
          <Button label={t(language, 'images.chooseFile')} onPress={() => pick('poster')} disabled={!!busy} />
          {!!value.poster && (
            <Button
              label={t(language, 'images.remove')}
              onPress={() => { setStatus(null); onChange({ ...value, poster: '' }); }}
              disabled={!!busy}
            />
          )}
          {busy === 'poster' && <ActivityIndicator size="small" color={colors.textMuted} />}
        </View>
      </View>
      {status && (
        <Text style={styles.status}>
          {status.text}
          {status.link && (
            <Text style={styles.link} onPress={() => Linking.openURL(status.link!)}> ↗</Text>
          )}
        </Text>
      )}

      <Text style={styles.subLabel}>{t(language, 'images.ownImages')}</Text>
      <View style={styles.thumbs}>
        {value.images.map((name, i) => (
          <View key={name}>
            <RepoImage
              folder={folder} slug={slug} name={name} style={styles.thumb}
              onPress={() => setViewer(value.poster ? i + 1 : i)}
            />
            <Pressable
              style={styles.removeThumb}
              onPress={() => onChange({ ...value, images: value.images.filter(n => n !== name) })}
              hitSlop={6}
            >
              <Text style={styles.removeThumbText}>✕</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.actionsRow}>
        <Button label={t(language, 'images.paste')} onPress={() => paste('images')} disabled={!!busy} />
        <Button label={t(language, 'images.chooseFiles')} onPress={() => pick('images')} disabled={!!busy} />
        {busy === 'images' && <ActivityIndicator size="small" color={colors.textMuted} />}
      </View>

      {viewer !== null && (
        <ImageViewer folder={folder} slug={slug} names={all} index={viewer} onClose={() => setViewer(null)} />
      )}
    </View>
  );
}

function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={[styles.button, disabled && styles.buttonDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  posterRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  poster: { width: 100, height: 150, borderRadius: 6 },
  posterEmpty: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  posterEmptyText: { fontSize: 12, color: '#999', textAlign: 'center' },
  actions: { flex: 1, gap: 6, alignItems: 'flex-start' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  button: {
    backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 13, color: '#333' },
  status: { fontSize: 12, color: '#777' },
  link: { color: colors.accent },
  subLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 6 },
  removeThumb: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#333', alignItems: 'center', justifyContent: 'center',
  },
  removeThumbText: { color: '#fff', fontSize: 10 },
});
