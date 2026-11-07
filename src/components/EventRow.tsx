import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { EventFormData } from '../types/event';
import { EventSection, eventSubtitle } from '../utils/eventSections';
import { colors } from '../utils/theme';

interface Props {
  section: EventSection;
  item: EventFormData;
  date: string;
  backgroundColor: string;
  onPress: () => void;
}

// Строка театра/выставки в ленте и в результатах поиска
export default function EventRow({ section, item, date, backgroundColor, onPress }: Props) {
  const { language } = useLanguage();
  return (
    <Pressable style={[styles.item, { backgroundColor }]} onPress={onPress}>
      <Text style={[styles.itemDate, !date && styles.itemDateEmpty]}>{date || '—'}</Text>
      <View style={styles.itemMeta}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemSubtitle} numberOfLines={1}>{eventSubtitle(section, item, language)}</Text>
      </View>
      {item.rating > 0 && <Text style={styles.itemRating}>{item.rating}★</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.borderFaint, gap: 14,
  },
  itemDate: { fontSize: 13, color: colors.textFaint, width: 72 },
  itemDateEmpty: { color: colors.textEmpty },
  itemMeta: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  itemSubtitle: { fontSize: 13, color: colors.textMuted },
  itemRating: { fontSize: 13, color: colors.stars, fontWeight: '600' },
});
