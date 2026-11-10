import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../utils/theme';

interface Props {
  value: number;        // 0 = не задан
  onChange?: (v: number) => void;
  size?: 'sm' | 'md';
  // Только показ: при наведении мыши (или нажатии на телефоне) всплывает точная оценка
  exact?: boolean;
}

export default function StarRating({ value, onChange, size = 'md', exact = false }: Props) {
  const fontSize = size === 'sm' ? 18 : 24;
  // Дробная оценка с лестницы рейтинга показывается округлённой
  const shown = Math.round(value);
  const stars = Array.from({ length: 10 }, (_, i) => i + 1);

  if (exact) return <ExactStars value={value} shown={shown} fontSize={fontSize} />;

  return (
    <View style={styles.row}>
      {stars.map(star => (
        <Pressable
          key={star}
          onPress={() => onChange?.(star === shown ? 0 : star)}
          hitSlop={4}
        >
          <Text style={[styles.star, { fontSize }]}>
            {star <= shown ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ExactStars({ value, shown, fontSize }: { value: number; shown: number; fontSize: number }) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const label = value.toLocaleString(language, { maximumFractionDigits: 2 });
  return (
    <Pressable
      style={styles.exactWrap}
      onHoverIn={() => setOpen(true)}
      onHoverOut={() => setOpen(false)}
      onPress={() => setOpen(o => !o)}
      accessibilityLabel={`${label} / 10`}
    >
      <View style={styles.row}>
        {Array.from({ length: 10 }, (_, i) => (
          <Text key={i} style={[styles.star, { fontSize }]}>{i < shown ? '★' : '☆'}</Text>
        ))}
      </View>
      {open && (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  star: { color: '#f5a623' },
  exactWrap: { alignSelf: 'flex-start' },
  tooltip: {
    position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, zIndex: 10,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: colors.text,
  },
  tooltipText: { color: colors.bg, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
