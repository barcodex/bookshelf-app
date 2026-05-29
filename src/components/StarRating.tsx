import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  value: number;        // 0 = не задан
  onChange: (v: number) => void;
  size?: 'sm' | 'md';
}

export default function StarRating({ value, onChange, size = 'md' }: Props) {
  const fontSize = size === 'sm' ? 18 : 24;
  return (
    <View style={styles.row}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(star => (
        <Pressable
          key={star}
          onPress={() => onChange(star === value ? 0 : star)}
          hitSlop={4}
        >
          <Text style={[styles.star, { fontSize }]}>
            {star <= value ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  star: { color: '#f5a623' },
});
