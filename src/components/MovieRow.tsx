import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';
import { MovieFormData } from '../types/movie';
import { movieSubtitle } from '../utils/groupMovies';
import { colors } from '../utils/theme';

interface Props {
  movie: MovieFormData;
  date: string;
  backgroundColor: string;
  onPress: () => void;
}

// Строка фильма в ленте и в результатах поиска
export default function MovieRow({ movie, date, backgroundColor, onPress }: Props) {
  const { language } = useLanguage();
  return (
    <Pressable style={[styles.item, { backgroundColor }]} onPress={onPress}>
      <Text style={[styles.itemDate, !date && styles.itemDateEmpty]}>{date || '—'}</Text>
      <View style={styles.itemMeta}>
        <Text style={styles.itemTitle} numberOfLines={1}>{movie.title}</Text>
        <Text style={styles.itemSubtitle} numberOfLines={1}>{movieSubtitle(movie)}</Text>
      </View>
      <View style={styles.itemRight}>
        {movie.rating > 0 && <Text style={styles.itemRating}>{movie.rating}★</Text>}
        {movie.abandoned && <Text style={styles.itemAbandoned}>{t(language, 'movie.abandonedShort')}</Text>}
      </View>
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
  itemRight: { alignItems: 'flex-end', gap: 2 },
  itemRating: { fontSize: 13, color: colors.stars, fontWeight: '600' },
  itemAbandoned: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
});
