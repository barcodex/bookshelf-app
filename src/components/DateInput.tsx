import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface Props {
  value: string; // YYYY или YYYY-MM-DD или ''
  onChange: (value: string) => void;
  placeholder?: string;
}

type Mode = 'year' | 'date';

function getMode(value: string): Mode {
  return /^\d{4}$/.test(value) ? 'year' : 'date';
}

const formatLocale = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date(iso + 'T00:00:00'));
  } catch {
    return iso;
  }
};

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <View style={styles.modeRow}>
      {(['year', 'date'] as Mode[]).map(m => (
        <Pressable key={m} onPress={() => onChange(m)} style={styles.modeBtn}>
          <Text style={[styles.modeBtnText, mode === m && styles.modeBtnActive]}>
            {m === 'year' ? 'только год' : 'дата'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function DateInput({ value, onChange, placeholder = 'Не указано' }: Props) {
  const [mode, setMode] = useState<Mode>(() => (value ? getMode(value) : 'date'));
  const [pickerOpen, setPickerOpen] = useState(false);

  const switchMode = (newMode: Mode) => {
    if (newMode === mode) return;
    if (newMode === 'year' && value.length === 10) onChange(value.slice(0, 4));
    else if (newMode === 'date' && /^\d{4}$/.test(value)) onChange(`${value}-01-01`);
    else onChange('');
    setMode(newMode);
  };

  const dateValue = value.length === 10 ? new Date(value + 'T00:00:00') : new Date();

  return (
    <View>
      <ModeToggle mode={mode} onChange={switchMode} />

      {mode === 'year' ? (
        <TextInput
          style={styles.field}
          value={value}
          onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, 4))}
          keyboardType="numeric"
          maxLength={4}
          placeholder="ГГГГ"
          placeholderTextColor="#aaa"
        />
      ) : Platform.OS === 'web' ? (
        <View style={[styles.field, { position: 'relative' }]}>
          <Text style={[styles.fieldText, !value && styles.placeholder]}>
            {value ? formatLocale(value) : placeholder}
          </Text>
          {React.createElement('input', {
            type: 'date',
            value: value.length === 10 ? value : '',
            onChange: (e: any) => onChange(e.target.value),
            style: { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' },
          })}
        </View>
      ) : (
        <Pressable style={styles.field} onPress={() => setPickerOpen(true)}>
          <Text style={[styles.fieldText, !value && styles.placeholder]}>
            {value ? formatLocale(value) : placeholder}
          </Text>
        </Pressable>
      )}

      {Platform.OS !== 'web' && pickerOpen && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          onChange={(_, selected) => {
            setPickerOpen(false);
            if (selected) onChange(selected.toISOString().split('T')[0]);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  modeBtn: {},
  modeBtnText: { fontSize: 12, color: '#bbb' },
  modeBtnActive: { color: '#111', fontWeight: '600' },
  field: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  fieldText: { fontSize: 15, color: '#111' },
  placeholder: { color: '#aaa' },
});
