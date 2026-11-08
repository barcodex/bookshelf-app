import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheContext, useCacheProvider } from './src/context/CacheContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { t } from './src/services/i18n';
import { getLatestCommitSha } from './src/services/github';
import { booksCollection } from './src/services/booksService';
import { syncCollection } from './src/services/cardsService';
import { moviesCollection } from './src/services/moviesService';
import { concertsCollection } from './src/services/concertsService';
import { exhibitionsSection, lecturesSection, theatreSection } from './src/utils/eventSections';
import { Settings, getSettings, saveSettings } from './src/services/storage';
import SetupScreen from './src/screens/SetupScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import AddBookScreen from './src/screens/AddBookScreen';
import SearchScreen from './src/screens/SearchScreen';
import MoviesTimelineScreen from './src/screens/MoviesTimelineScreen';
import AddMovieScreen from './src/screens/AddMovieScreen';
import MoviesSearchScreen from './src/screens/MoviesSearchScreen';
import MoviesRatingScreen from './src/screens/MoviesRatingScreen';
import ConcertsTimelineScreen from './src/screens/ConcertsTimelineScreen';
import AddConcertScreen from './src/screens/AddConcertScreen';
import ConcertsSearchScreen from './src/screens/ConcertsSearchScreen';
import { exhibitionsScreens, lecturesScreens, theatreScreens } from './src/screens/eventScreens';
import SettingsScreen from './src/screens/SettingsScreen';
import LanguageSelectScreen from './src/screens/LanguageSelectScreen';
import OnboardingRepositoryScreen from './src/screens/OnboardingRepositoryScreen';
import OnboardingSetupScreen from './src/screens/OnboardingSetupScreen';
import { colors } from './src/utils/theme';
import SectionHeader from './src/components/SectionHeader';
import { SectionId } from './src/utils/sections';

const Tab = createBottomTabNavigator();

// Экраны вкладок для каждого работающего раздела; имена маршрутов общие, чтобы теги вели в «Поиск» раздела.
// Ranking — лестница рейтинга, пока только у фильмов
type Screens = {
  Timeline: React.ComponentType;
  Add: React.ComponentType;
  Search: React.ComponentType;
  Ranking?: React.ComponentType;
};
const sectionScreens: Record<string, Screens> = {
  books: { Timeline: TimelineScreen, Add: AddBookScreen, Search: SearchScreen },
  films: { Timeline: MoviesTimelineScreen, Add: AddMovieScreen, Search: MoviesSearchScreen, Ranking: MoviesRatingScreen },
  theatre: theatreScreens,
  exhibitions: exhibitionsScreens,
  lectures: lecturesScreens,
  concerts: { Timeline: ConcertsTimelineScreen, Add: AddConcertScreen, Search: ConcertsSearchScreen },
};

function AppContent() {
  const { language, isLoading: languageLoading } = useLanguage();
  const cache = useCacheProvider();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hasSeenLanguageScreen, setHasSeenLanguageScreen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'repository' | 'setup' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [section, setSection] = useState<SectionId>('books');
  const screens = sectionScreens[section] ?? sectionScreens.books;

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (!settings) return;
    const poll = async () => {
      try {
        const remoteSha = await getLatestCommitSha(settings);
        console.log(`[Poller] Remote SHA: ${remoteSha}`);
        const updated = await Promise.all([
          syncCollection(booksCollection, settings, remoteSha),
          syncCollection(moviesCollection, settings, remoteSha),
          syncCollection(concertsCollection, settings, remoteSha),
          syncCollection(theatreSection.collection, settings, remoteSha),
          syncCollection(exhibitionsSection.collection, settings, remoteSha),
          syncCollection(lecturesSection.collection, settings, remoteSha),
        ]);
        if (updated.some(Boolean)) {
          console.log('[Poller] SHA mismatch detected, cache updated');
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
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SectionHeader current={section} onSelect={setSection} />
        <NavigationContainer>
          <Tab.Navigator
            key={section}
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.textFaint,
              tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
            }}
          >
            <Tab.Screen
              name="Timeline"
              component={screens.Timeline}
              options={{
                title: t(language, 'tabs.timeline'),
                tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
              }}
            />
            <Tab.Screen
              name="Add"
              component={screens.Add}
              options={{
                title: t(language, 'tabs.add'),
                tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>＋</Text>,
              }}
            />
            <Tab.Screen
              name="Search"
              component={screens.Search}
              options={{
                title: t(language, 'tabs.search'),
                tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text>,
              }}
            />
            {screens.Ranking && (
              <Tab.Screen
                name="Ranking"
                component={screens.Ranking}
                options={{
                  title: t(language, 'tabs.ranking'),
                  tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🪜</Text>,
                }}
              />
            )}
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
      </View>
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
