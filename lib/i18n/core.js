import { messages } from './messages.js';
export const localeOptions = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
  { id: 'zh-Hans', label: '简体中文' },
  { id: 'zh-Hant', label: '繁體中文' },
];
export const localeStorageKey = 'island-ui-locale-v1';
export function isLocale(value) {
  return localeOptions.some((locale) => locale.id === value);
}
export function detectLocale(preferred = []) {
  for (const tag of preferred) {
    const normalized = tag.toLowerCase().replaceAll('_', '-');
    if (/^fr(?:-|$)/.test(normalized)) return 'fr';
    if (/^en(?:-|$)/.test(normalized)) return 'en';
    if (/^zh(?:-|$)/.test(normalized)) {
      if (normalized.includes('-hant')) return 'zh-Hant';
      if (normalized.includes('-hans')) return 'zh-Hans';
      return /-(tw|hk|mo)(?:-|$)/.test(normalized) ? 'zh-Hant' : 'zh-Hans';
    }
  }
  return 'en';
}
export function resolveLocale(saved, preferred) {
  return isLocale(saved) ? saved : detectLocale(preferred);
}
export function translate(locale, key, values = {}) {
  const template =
    (Object.hasOwn(messages, locale) && Object.hasOwn(messages[locale], key)
      ? messages[locale][key]
      : undefined) ??
    (Object.hasOwn(messages.en, key) ? messages.en[key] : key);
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    String(values[name] ?? match),
  );
}
// Worker/API diagnostics stay locale-independent. Translate at the presentation boundary.
export function translateError(locale, message) {
  if (!message) return '';
  if (Object.hasOwn(messages.en, message)) return translate(locale, message);
  const invalid = /^Invalid (.+)\.$/.exec(message);
  if (invalid)
    return translate(locale, 'Invalid {control}.', {
      control: translate(locale, invalid[1]),
    });
  const download = /^Speech data download failed \((\d+)\)\.$/.exec(message);
  if (download)
    return translate(locale, 'Speech data download failed ({status}).', {
      status: download[1],
    });
  return translate(locale, 'Something went wrong. Please try again.');
}
