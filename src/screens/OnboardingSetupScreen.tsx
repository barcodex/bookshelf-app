import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
  TextInput,
  Linking,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../services/i18n';

interface Props {
  onComplete: () => void;
}

export default function OnboardingSetupScreen({ onComplete }: Props) {
  const { language } = useLanguage();

  const openGitHub = () => {
    Linking.openURL('https://github.com/new');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t(language, 'onboarding.setup')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.stepNumber}>1. {t(language, 'onboarding.step.createRepo')}</Text>
          <Text style={styles.sectionText}>
            {t(language, 'onboarding.step.createRepoDesc')}
          </Text>
          <Pressable style={styles.linkButton} onPress={openGitHub}>
            <Text style={styles.linkButtonText}>github.com/new</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.stepNumber}>2. {t(language, 'onboarding.step.private')}</Text>
          <Text style={styles.sectionText}>
            {t(language, 'onboarding.step.privateDesc')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.stepNumber}>3. {t(language, 'onboarding.step.initBooks')}</Text>
          <Text style={styles.sectionText}>
            {t(language, 'onboarding.step.initBooksDesc')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.stepNumber}>4. {t(language, 'onboarding.step.token')}</Text>
          <Text style={styles.sectionText}>
            {t(language, 'onboarding.step.tokenDesc')}
          </Text>
        </View>

        <View style={styles.spacer} />

        <Pressable style={styles.button} onPress={onComplete}>
          <Text style={styles.buttonText}>{t(language, 'onboarding.done')}</Text>
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
  section: { marginBottom: 28, gap: 12 },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  sectionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  linkButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
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
