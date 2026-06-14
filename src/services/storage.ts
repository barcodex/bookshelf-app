import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Settings {
  repo: string;  // "owner/repo"
  token: string; // GitHub PAT
}

const KEY = 'bookshelf_settings';

export async function getSettings(): Promise<Settings | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Settings) : null;
  } catch {
    return null;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}

export async function clearSettings(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
