import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  value: string; // ISO YYYY-MM-DD или ''
  onChange: (iso: string) => void;
  placeholder?: string;
}

const formatLocale = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso + 'T00:00:00'));
  } catch {
    return iso;
  }
};

// На вебе показываем отформатированную дату поверх прозрачного <input type="date">.
// Браузер открывает свой нативный датапикер, мы получаем ISO-значение.
function WebDateInput({ value, onChange, placeholder }: Props) {
  return (
    <View style={styles.field}>
      <Text style={[styles.value, !value && styles.placeholder]}>
        {value ? formatLocale(value) : placeholder}
      </Text>
      {React.createElement('input', {
        type: 'date',
        value,
        onChange: (e: any) => onChange(e.target.value),
        style: {
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          width: '100%',
          height: '100%',
        },
      })}
    </View>
  );
}

export default function DateInput({ value, onChange, placeholder = 'Не указана' }: Props) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return <WebDateInput value={value} onChange={onChange} placeholder={placeholder} />;
  }

  const date = value ? new Date(value + 'T00:00:00') : new Date();

  return (
    <View>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatLocale(value) : placeholder}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(_, selected) => {
            setOpen(false);
            if (selected) {
              onChange(selected.toISOString().split('T')[0]);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  value: {
    fontSize: 15,
    color: '#111',
  },
  placeholder: {
    color: '#aaa',
  },
});
