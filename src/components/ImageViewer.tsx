import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import RepoImage from './RepoImage';

interface Props {
  folder: string;
  slug: string;
  names: string[];
  index: number;
  onClose: () => void;
}

// Картинка на весь экран; стрелки (и клавиши ← →) листают, нажатие на фон закрывает
export default function ImageViewer({ folder, slug, names, index: start, onClose }: Props) {
  const [index, setIndex] = useState(start);
  const step = (d: number) => setIndex(i => (i + d + names.length) % names.length);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [names.length]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <RepoImage folder={folder} slug={slug} name={names[index]} style={styles.image} resizeMode="contain" />
        {names.length > 1 && (
          <View style={styles.nav} pointerEvents="box-none">
            <Pressable style={styles.arrow} onPress={() => step(-1)} hitSlop={12}>
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>
            <Text style={styles.counter}>{index + 1} / {names.length}</Text>
            <Pressable style={styles.arrow} onPress={() => step(1)} hitSlop={12}>
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  image: { width: '94%', height: '84%' },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 12 },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  counter: { color: '#ddd', fontSize: 14 },
});
