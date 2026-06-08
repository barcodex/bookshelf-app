import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheContext, useCacheProvider } from './src/context/CacheContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
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

const Tab = createBottomTabNavigator();

function AppContent() {
  const { isLoading: languageLoading } = useLanguage();
  const cache = useCacheProvider();
  const [settings, setSettings] = useState<Settings | null>(() => getSettings());
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
        if (cachedSha !== null && remoteSha !== cachedSha) {
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
        onComplete={(s) => {
          saveSettings(s);
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
            tabBarActiveTintColor: '#000',
            tabBarInactiveTintColor: '#999',
          }}
        >
          <Tab.Screen
            name="Timeline"
            component={TimelineScreen}
            options={{
              title: 'Timeline',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
            }}
          />
          <Tab.Screen
            name="AddBook"
            component={AddBookScreen}
            options={{
              title: 'Add',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>＋</Text>,
            }}
          />
          <Tab.Screen
            name="Search"
            component={SearchScreen}
            options={{
              title: 'Search',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text>,
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'More',
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
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
