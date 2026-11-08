import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { ConcertFormData } from '../types/concert';
import { concertSubtitle } from '../utils/groupConcerts';
import { colors } from '../utils/theme';

interface Props {
  concert: ConcertFormData;
  date: string;
  backgroundColor: string;
  onPress: () => void;
}

// Строка концерта в ленте и в результатах поиска
export default function ConcertRow({ concert, date, backgroundColor, onPress }: Props) {
  const { language } = useLanguage();
  return (
    <Pressable style={[styles.item, { backgroundColor }]} onPress={onPress}>
      <Text style={[styles.itemDate, !date && styles.itemDateEmpty]}>{date || '—'}</Text>
      <View style={styles.itemMeta}>
        <Text style={styles.itemTitle} numberOfLines={1}>{concert.artist}</Text>
        <Text style={styles.itemSubtitle} numberOfLines={1}>{concertSubtitle(concert, language)}</Text>
      </View>
      {concert.rating > 0 && <Text style={styles.itemRating}>{concert.rating}★</Text>}
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
