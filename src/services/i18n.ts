import en from '../locales/en.json';
import ru from '../locales/ru.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';
import it from '../locales/it.json';

export type Language = 'en' | 'ru' | 'de' | 'fr' | 'es' | 'it';

const translations: Record<Language, any> = {
  en, ru, de, fr, es, it
};

const languageNames: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
};

export function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, prop) => current?.[prop], obj) ?? path;
}

export function t(language: Language, key: string): string {
  const translation = translations[language];
  return getNestedValue(translation, key);
}

export function getLanguageName(language: Language): string {
  return languageNames[language];
}

const intlLocales: Record<Language, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
};

export function toIntlLocale(language: Language): string {
  return intlLocales[language];
}

export const languageList: Language[] = ['en', 'ru', 'de', 'fr', 'es', 'it'];
