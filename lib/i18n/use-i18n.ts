'use client';
import { useEffect, useState } from 'react';
import {
  isLocale,
  localeStorageKey,
  resolveLocale,
  translate,
  translateError,
} from './core.js';
export type Locale = 'en' | 'fr' | 'zh-Hans' | 'zh-Hant';
export type Notice = {
  key: string;
  values?: Record<string, string | number>;
  fallbackName?: boolean;
};
export function useI18n() {
  // Match the server's English markup; read browser preferences after hydration.
  const [locale, setLocale] = useState<Locale>('en');
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(localeStorageKey);
    } catch {
      /* Storage may be disabled. */
    }
    setLocale(resolveLocale(saved, navigator.languages) as Locale);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, 'Island Voice Lab');
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        translate(
          locale,
          'A multilingual robotic voice playground. Shape a character, synthesize speech locally, and export audio.',
        ),
      );
  }, [locale]);
  function changeLocale(value: string | null) {
    if (!isLocale(value)) return;
    setLocale(value as Locale);
    try {
      localStorage.setItem(localeStorageKey, value!);
    } catch {
      /* Language selection still works for this visit. */
    }
  }
  return {
    locale,
    changeLocale,
    t: (key: string, values: Record<string, string | number> = {}) =>
      translate(locale, key, values),
    errorText: (message: string) => translateError(locale, message),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value),
  };
}
