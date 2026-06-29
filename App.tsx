import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheContext, useCacheProvider } from './src/context/CacheContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { t } from './src/services/i18n';
import { getCachedCommitSha } from './src/services/booksCache';
import { getLatestCommitSha } from './src/services/github';
import { applyIncrementalUpdate } from './src/services/booksService';
import { Settings, getSettings, saveSettings } from './src/services/storage';
import SetupScreen from './src/screens/SetupScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import AddBookScreen from './src/screens/AddBookScreen';
import SearchScreen from './src/screens/SearchScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LanguageSelectScreen from './src/screens/LanguageSelectScreen';
import OnboardingRepositoryScreen from './src/screens/OnboardingRepositoryScreen';
import OnboardingSetupScreen from './src/screens/OnboardingSetupScreen';
import { colors } from './src/utils/theme';

const Tab = createBottomTabNavigator();

function AppContent() {
  const { language, isLoading: languageLoading } = useLanguage();
  const cache = useCacheProvider();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasSeenLanguageScreen, setHasSeenLanguageScreen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'repository' | 'setup' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (!settings) return;
    const poll = async () => {
      try {
        const [remoteSha, cachedSha] = await Promise.all([
          getLatestCommitSha(settings),
          getCachedCommitSha(),
        ]);
        console.log(`[Poller] Remote SHA: ${remoteSha} | Cached SHA: ${cachedSha}`);
        if (cachedSha !== null && remoteSha !== cachedSha) {
          console.log('[Poller] SHA mismatch detected, updating cache...');
          await applyIncrementalUpdate(settings, cachedSha, remoteSha);
          cache.bumpVersion();
        }
      } catch {
        // network errors ignored
      }
    };
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, [settings, cache]);

  const initializeApp = async () => {
    try {
      const storedSettings = await getSettings();
      setSettings(storedSettings);

      const seenLanguage = await AsyncStorage.getItem('hasSeenLanguageScreen');
      setHasSeenLanguageScreen(!!seenLanguage);
      const seenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (!seenOnboarding) {
        setOnboardingStep('repository');
      }
    } catch (error) {
      console.log('Error checking screen status:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const handleLanguageScreenComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenLanguageScreen', 'true');
      setHasSeenLanguageScreen(true);
    } catch (error) {
      console.log('Error saving language screen status:', error);
    }
  };

  const handleOnboardingRepositoryComplete = () => {
    setOnboardingStep('setup');
  };

  const handleOnboardingSetupComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setOnboardingStep(null);
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
  };

  if (languageLoading || !isInitialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  if (!hasSeenLanguageScreen) {
    return <LanguageSelectScreen onComplete={handleLanguageScreenComplete} />;
  }

  if (onboardingStep === 'repository') {
    return <OnboardingRepositoryScreen onComplete={handleOnboardingRepositoryComplete} />;
  }

  if (onboardingStep === 'setup') {
    return <OnboardingSetupScreen onComplete={handleOnboardingSetupComplete} />;
  }

  if (!settings) {
    return (
      <SetupScreen
        onComplete={async (s) => {
          await saveSettings(s);
          setSettings(s);
        }}
      />
    );
  }

  return (
    <CacheContext.Provider value={cache}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textFaint,
            tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
          }}
        >
          <Tab.Screen
            name="Timeline"
            component={TimelineScreen}
            options={{
              title: t(language, 'tabs.timeline'),
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
            }}
          />
          <Tab.Screen
            name="AddBook"
            component={AddBookScreen}
            options={{
              title: t(language, 'tabs.add'),
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>＋</Text>,
            }}
          />
          <Tab.Screen
            name="Search"
            component={SearchScreen}
            options={{
              title: t(language, 'tabs.search'),
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text>,
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: t(language, 'tabs.more'),
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </CacheContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
