import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { Text } from 'react-native';
import { getSettings, saveSettings, Settings } from './src/services/storage';
import SetupScreen from './src/screens/SetupScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import AddBookScreen from './src/screens/AddBookScreen';
import SearchScreen from './src/screens/SearchScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(() => getSettings());

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
  );
}
