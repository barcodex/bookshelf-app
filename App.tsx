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

const Tab = createBottomTabNavigator();

function AppContent() {
  const { isLoading: languageLoading } = useLanguage();
  const [settings, setSettings] = useState<Settings | null>(() => getSettings());
  const [hasSeenLanguageScreen, setHasSeenLanguageScreen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const cache = useCacheProvider();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const seen = await AsyncStorage.getItem('hasSeenLanguageScreen');
      setHasSeenLanguageScreen(!!seen);
    } catch (error) {
      console.log('Error checking language screen status:', error);
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

  // Polling: раз в минуту сверяем SHA последнего коммита
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
        // сетевые ошибки при опросе — игнорируем
      }
    };
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, [settings]);

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
