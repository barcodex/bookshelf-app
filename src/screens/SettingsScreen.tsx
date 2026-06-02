import { ScrollView, SafeAreaView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useState } from 'react';
import LegalScreen from './LegalScreen';

export default function SettingsScreen() {
  const [showPrivacy, setShowPrivacy] = useState(false);

  if (showPrivacy) {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => setShowPrivacy(false)}
        >
          <Text style={styles.backText}>← Назад</Text>
        </Pressable>
        <LegalScreen />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Приложение</Text>
          <Pressable style={styles.row} onPress={() => setShowPrivacy(true)}>
            <Text style={styles.rowText}>Политика приватности</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>О приложении</Text>
          <View style={styles.row}>
            <Text style={styles.rowText}>Версия</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowText}>GitHub</Text>
            <Text style={styles.rowValue}>barcodex/bookshelf-app</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Bookshelf — приложение для учёта прочитанных книг с полным контролем данных
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
