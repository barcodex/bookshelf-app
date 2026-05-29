import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export default function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.container}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={[
              styles.segment,
              i === 0 && styles.first,
              i === options.length - 1 && styles.last,
              active && styles.active,
            ]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  first: { borderTopLeftRadius: 7, borderBottomLeftRadius: 7 },
  last:  { borderTopRightRadius: 7, borderBottomRightRadius: 7, borderRightWidth: 0 },
  active: { backgroundColor: '#111' },
  label: { fontSize: 14, color: '#555' },
  activeLabel: { color: '#fff', fontWeight: '600' },
});
