import { StyleSheet, Text, View, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { Language, languageList, getLanguageName, t } from '../services/i18n';

interface LanguageSelectScreenProps {
  onComplete?: () => void;
}

export default function LanguageSelectScreen({ onComplete }: LanguageSelectScreenProps) {
  const { language, setLanguage } = useLanguage();

  const handleSelectLanguage = async (lang: Language) => {
    await setLanguage(lang);
    onComplete?.();
  };

  const renderLanguage = ({ item }: { item: Language }) => {
    const isSelected = item === language;
    return (
      <Pressable
        style={[styles.languageItem, isSelected && styles.languageItemActive]}
        onPress={() => handleSelectLanguage(item)}
      >
        <View style={styles.languageContent}>
          <Text style={[styles.languageName, isSelected && styles.languageNameActive]}>
            {getLanguageName(item)}
          </Text>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t(language, 'language.select')}</Text>
        <Text style={styles.subtitle}>Choose your preferred language</Text>
      </View>

      <FlatList
        data={languageList}
        renderItem={renderLanguage}
        keyExtractor={(item) => item}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>You can change this anytime in Settings</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center' },
  list: { paddingHorizontal: 16, gap: 8 },
  languageItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    marginBottom: 8,
  },
  languageItemActive: {
    borderColor: '#111',
    backgroundColor: '#f5f5f5',
  },
  languageContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  languageName: { fontSize: 16, fontWeight: '500', color: '#555' },
  languageNameActive: { color: '#111', fontWeight: '600' },
  checkmark: { fontSize: 18, color: '#111', fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingBottom: 24, alignItems: 'center' },
  footerText: { fontSize: 13, color: '#999', textAlign: 'center', fontStyle: 'italic' },
});
