'use client';

import React, { createContext, useContext, useState, useTransition } from 'react';
import { Locale, defaultLocale, LOCALE_COOKIE_NAME } from './config';
import esDict from './dictionaries/es.json';
import enDict from './dictionaries/en.json';

const dictionaries: Record<Locale, Record<string, unknown>> = {
  es: esDict,
  en: enDict,
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

function getInitialLocale(fallback: Locale): Locale {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=(es|en)`, 'i'));
    if (match?.[1]) {
      const detected = match[1].toLowerCase() as Locale;
      if (detected === 'es' || detected === 'en') {
        return detected;
      }
    }
  }
  return fallback;
}

export function LanguageProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale(initialLocale));
  const [, startTransition] = useTransition();

  const setLocale = (newLocale: Locale) => {
    startTransition(() => {
      setLocaleState(newLocale);
      document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    });
  };

  const toggleLocale = () => {
    const nextLocale: Locale = locale === 'es' ? 'en' : 'es';
    setLocale(nextLocale);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const currentDict = dictionaries[locale] || dictionaries[defaultLocale];
    let template = getNestedValue(currentDict, key);

    // Fallback al diccionario por defecto si no existe en el actual
    if (!template && locale !== defaultLocale) {
      template = getNestedValue(dictionaries[defaultLocale], key);
    }

    if (!template) {
      return key;
    }

    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      }
    }

    return template;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation debe utilizarse dentro de un <LanguageProvider>');
  }
  return context;
}
