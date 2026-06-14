import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';

interface Props {
  onComplete: () => void;
}

export default function OnboardingRepositoryScreen({ onComplete }: Props) {
  const { language } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t(language, 'onboarding.github')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t(language, 'onboarding.section.whatIs')}
          </Text>
          <Text style={styles.sectionText}>
            {t(language, 'onboarding.section.whatIsDesc')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t(language, 'onboarding.section.privacy')}
          </Text>
          <Text style={styles.sectionText}>
            {t(language, 'onboarding.section.privacyDesc')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t(language, 'onboarding.section.yourControl')}
          </Text>
          <Text style={styles.sectionText}>
            {t(language, 'onboarding.section.yourControlDesc')}
          </Text>
        </View>

        <View style={styles.spacer} />

        <Pressable style={styles.button} onPress={onComplete}>
          <Text style={styles.buttonText}>{t(language, 'onboarding.next')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#111', marginBottom: 8 },
  section: { marginBottom: 28, gap: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  spacer: { flex: 1, minHeight: 40 },
  button: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
