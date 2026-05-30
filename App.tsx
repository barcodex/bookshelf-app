import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { CacheContext, useCacheProvider } from './src/context/CacheContext';
import { getCachedCommitSha } from './src/services/booksCache';
import { getLatestCommitSha } from './src/services/github';
import { Settings, getSettings, saveSettings } from './src/services/storage';
import SetupScreen from './src/screens/SetupScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import AddBookScreen from './src/screens/AddBookScreen';
import SearchScreen from './src/screens/SearchScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(() => getSettings());
  const cache = useCacheProvider();

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
          cache.invalidate();
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
              title: 'Таймлайн',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
            }}
          />
          <Tab.Screen
            name="AddBook"
            component={AddBookScreen}
            options={{
              title: 'Добавить',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>＋</Text>,
            }}
          />
          <Tab.Screen
            name="Search"
            component={SearchScreen}
            options={{
              title: 'Поиск',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text>,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </CacheContext.Provider>
  );
}
