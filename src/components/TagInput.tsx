import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  lowercase?: boolean;   // теги приводятся к нижнему регистру, имена (разогрев концерта) — нет
  placeholder?: string;
}

export default function TagInput({ value, onChange, lowercase = true, placeholder = 'добавить тег…' }: Props) {
  const [input, setInput] = useState('');

  const add = (text: string) => {
    const tag = lowercase ? text.trim().toLowerCase() : text.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  };

  const remove = (tag: string) => onChange(value.filter(t => t !== tag));

  const handleChange = (text: string) => {
    if (text.endsWith(',')) { add(text.slice(0, -1)); return; }
    setInput(text);
  };

  return (
    <View style={styles.container}>
      {value.map(tag => (
        <Pressable key={tag} style={styles.chip} onPress={() => remove(tag)}>
          <Text style={styles.chipText}>{tag}</Text>
          <Text style={styles.chipX}>×</Text>
        </Pressable>
      ))}
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={handleChange}
        onSubmitEditing={() => add(input)}
        returnKeyType="done"
        blurOnSubmit={false}
        placeholder={value.length === 0 ? placeholder : ''}
        placeholderTextColor="#aaa"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fafafa',
    minHeight: 42,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  chipText: { fontSize: 13, color: '#fff' },
  chipX: { fontSize: 15, color: '#aaa', lineHeight: 18 },
  input: { fontSize: 14, color: '#111', minWidth: 120, paddingVertical: 2 },
});
