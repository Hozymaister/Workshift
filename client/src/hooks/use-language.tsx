import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TranslationKey, translations } from '@/lib/translations';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string) => string;
};

// Vytvoření kontextu
const LanguageContext = createContext<LanguageContextType | null>(null);

// Provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  // Získání uloženého jazyka z localStorage nebo defaultně čeština
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language');
    return (savedLanguage as Language) || 'cs';
  });

  // Efekt pro ukládání jazyka do localStorage při změně
  useEffect(() => {
    localStorage.setItem('language', language);
    // Nastavení atributu lang u html elementu pro správnou lokalizaci
    document.documentElement.lang = language;
  }, [language]);

  // Funkce pro změnu jazyka
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // Funkce pro získání přeloženého textu dle klíče
  const t = (key: TranslationKey | string): string => {
    try {
      return translations[language][key as TranslationKey] || key;
    } catch {
      return key as string;
    }
  };

  // Poskytnutí kontextu
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook pro použití v komponentách
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}