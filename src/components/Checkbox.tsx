import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export default function Checkbox({ value, onChange, label }: Props) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!value)}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.box, value && styles.boxChecked]}>
        {value && (
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12.5l4.5 4.5L19 7.5" />
          </Svg>
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  box: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: '#999',
    alignItems: 'center', justifyContent: 'center',
  },
  boxChecked: { backgroundColor: '#111', borderColor: '#111' },
  label: { fontSize: 15, color: '#111' },
});
