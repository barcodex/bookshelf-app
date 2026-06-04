import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Language, languageList } from '../services/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem('language');
      if (stored && languageList.includes(stored as Language)) {
        setLanguageState(stored as Language);
      } else {
        // Определяем язык по системе
        const locale = Localization.getLocales()[0]?.languageCode;
        if (locale && languageList.includes(locale as Language)) {
          setLanguageState(locale as Language);
        } else {
          setLanguageState('en');
        }
      }
    } catch (error) {
      console.log('Error loading language:', error);
      setLanguageState('en');
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const { language } = useLanguage();
  return (key: string) => {
    const { t } = require('../services/i18n');
    return t(language, key);
  };
}
