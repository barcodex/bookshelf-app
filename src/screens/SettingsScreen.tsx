import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { t, getLanguageName } from '../services/i18n';
import LegalScreen from './LegalScreen';
import LanguageSelectScreen from './LanguageSelectScreen';

export default function SettingsScreen() {
  const { language } = useLanguage();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);

  if (showPrivacy) {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => setShowPrivacy(false)}
        >
          <Text style={styles.backText}>← {t(language, 'common.back')}</Text>
        </Pressable>
        <LegalScreen />
      </View>
    );
  }

  if (showLanguage) {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => setShowLanguage(false)}
        >
          <Text style={styles.backText}>← {t(language, 'common.back')}</Text>
        </Pressable>
        <LanguageSelectScreen onComplete={() => setShowLanguage(false)} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(language, 'settings.legal')}</Text>
          <Pressable style={styles.row} onPress={() => setShowLanguage(true)}>
            <Text style={styles.rowText}>{t(language, 'settings.language')}</Text>
            <Text style={styles.rowValue}>{getLanguageName(language)}</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => setShowPrivacy(true)}>
            <Text style={styles.rowText}>{t(language, 'settings.privacyPolicy')}</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(language, 'settings.about')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowText}>{t(language, 'settings.version')}</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowText}>GitHub</Text>
            <Text style={styles.rowValue}>barcodex/bookshelf-app</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t(language, 'settings.aboutText')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  backButton: { paddingHorizontal: 16, paddingVertical: 12 },
  backText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowText: { fontSize: 16, color: '#111', fontWeight: '500' },
  rowValue: { fontSize: 14, color: '#666' },
  rowArrow: { fontSize: 18, color: '#ccc' },
  footer: { marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  footerText: { fontSize: 13, color: '#999', lineHeight: 18, fontStyle: 'italic' },
});
