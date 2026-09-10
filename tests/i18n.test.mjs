import test from 'node:test';
import assert from 'node:assert/strict';
import { messages } from '../lib/i18n/messages.js';
import {
  detectLocale,
  resolveLocale,
  translate,
  translateError,
} from '../lib/i18n/core.js';
import {
  controls,
  genders,
  languages,
  presets,
} from '../public/engine/config.js';

test('interface locale preference takes priority and Chinese scripts/regions resolve correctly', () => {
  assert.equal(resolveLocale('fr', ['zh-TW']), 'fr');
  assert.equal(resolveLocale('unsupported', ['de', 'fr-CA']), 'fr');
  for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN'])
    assert.equal(detectLocale([tag]), 'zh-Hant', tag);
  for (const tag of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-HK'])
    assert.equal(detectLocale([tag]), 'zh-Hans', tag);
  assert.equal(detectLocale(['en-GB', 'fr']), 'en');
  assert.equal(detectLocale(['de-DE']), 'en');
});

test('all locale catalogs cover the interface, presets, controls, hints and speech languages', () => {
  const required = [
    ...controls.flatMap((c) => [c.label, c.hint]),
    ...presets.flatMap((p) => [p.name, p.description]),
    ...languages.map((l) => l.label),
    ...genders.map((g) => g.label),
    'Gender',
    'Sets the voice to a masculine or feminine register.',
    ' yr',
  ];
  const keys = Object.keys(messages.en).sort();
  for (const [locale, catalog] of Object.entries(messages)) {
    assert.deepEqual(Object.keys(catalog).sort(), keys, locale);
    for (const key of required) assert.ok(catalog[key], `${locale}: ${key}`);
    for (const [key, text] of Object.entries(catalog)) {
      assert.ok(text.trim(), `${locale}: ${key}`);
      assert.deepEqual(
        (text.match(/\{\w+\}/g) || []).sort(),
        (key.match(/\{\w+\}/g) || []).sort(),
        `${locale}: placeholders in ${key}`,
      );
    }
  }
});

test('status and worker errors translate when locale changes, preserving user content', () => {
  const name = '<My voice> {control}';
  assert.equal(
    translate('fr', 'Saved “{name}” on this device.', { name }),
    `« ${name} » enregistré sur cet appareil.`,
  );
  assert.equal(translateError('zh-Hans', 'Invalid Speed.'), '“语速”的值无效。');
  assert.equal(
    translateError('zh-Hant', 'Invalid Speed.'),
    '「語速」的值無效。',
  );
  assert.equal(
    translateError('fr', 'Speech data download failed (503).'),
    'Échec du téléchargement des données vocales (503).',
  );
  assert.equal(
    translateError('fr', 'unknown internal error'),
    messages.fr['Something went wrong. Please try again.'],
  );
  assert.equal(translate('unsupported', 'Generate voice'), 'Generate voice');
  assert.equal(translate('fr', 'toString'), 'toString');
  assert.equal(translateError('fr', ''), '');
});
