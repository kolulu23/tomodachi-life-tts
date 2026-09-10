import test from 'node:test';
import assert from 'node:assert/strict';
import createEngine from '../public/engine/espeak-ng.js';
import {
  defaults,
  languages,
  presets,
  controls,
  validateRequest,
  validateSettings,
} from '../public/engine/config.js';
import { synthesize, variantDefinition } from '../public/engine/synthesis.js';
import { processAudio, encodeWav } from '../public/engine/dsp.js';
const module = await createEngine(),
  engine = new module.eSpeakNGWorker();
function render(
  settings = defaults,
  text = 'Welcome to my little island.',
  language = 'en-us',
) {
  return synthesize(module, engine, { text, language, settings });
}
const peak = (a) => a.reduce((p, x) => Math.max(p, Math.abs(x)), 0);
test('all advertised languages synthesize real nonempty audio and phonemes', () => {
  for (const language of languages) {
    const audio = render(defaults, language.sample, language.id);
    assert.equal(audio.sampleRate, 22050);
    assert.ok(audio.samples.length > 2205, language.id);
    assert.ok(peak(audio.samples) > 0.01, language.id);
    assert.ok(audio.phonemes.trim().length > 3, language.id);
  }
});
test('Chinese text has pronunciation, not an English-letter fallback', () => {
  for (const id of ['cmn', 'yue']) {
    const audio = render(defaults, '你好，欢迎来到我的小岛。', id);
    assert.match(audio.phonemes, /[ɜɑχŋɕɔə]/);
    assert.doesNotMatch(audio.phonemes, /chinese|letter|ideograph/i);
  }
});
test('speed changes duration independently from source pitch and formants', () => {
  const slow = render({ ...defaults, speed: 100 }),
    fast = render({ ...defaults, speed: 300 });
  assert.ok(slow.samples.length > fast.samples.length * 1.8);
  assert.equal(
    variantDefinition({ ...defaults, speed: 100 }),
    variantDefinition({ ...defaults, speed: 300 }),
  );
  const low = variantDefinition({ ...defaults, transpose: -12 }),
    high = variantDefinition({ ...defaults, transpose: 12 });
  assert.equal(
    low
      .split('\n')
      .filter((l) => l.startsWith('formant'))
      .join('\n'),
    high
      .split('\n')
      .filter((l) => l.startsWith('formant'))
      .join('\n'),
  );
  assert.notEqual(low.match(/pitch .*/)[0], high.match(/pitch .*/)[0]);
});
test('each synthesis control audibly changes generated PCM', () => {
  const baseline = render(defaults).samples;
  for (const key of [
    'pitch',
    'transpose',
    'depth',
    'intonation',
    'accent',
    'breath',
    'roughness',
  ]) {
    const c = controls.find((c) => c.key === key);
    const changed = render({ ...defaults, [key]: c.max }).samples;
    assert.notDeepEqual(changed, baseline, key);
  }
});
test('each DSP control changes PCM and every preset remains finite and unclipped', () => {
  const raw = render().samples,
    base = processAudio(raw, 22050, defaults);
  for (const c of controls.filter((c) => c.group === 'effects'))
    assert.notDeepEqual(
      processAudio(raw, 22050, { ...defaults, [c.key]: c.max }),
      base,
      c.key,
    );
  for (const p of presets) {
    const source = render(p.settings);
    const wet = processAudio(source.samples, source.sampleRate, p.settings);
    assert.ok(wet.every(Number.isFinite), p.id);
    assert.ok(peak(wet) <= 0.951, p.id);
    assert.ok(peak(wet) > 0.001, p.id);
  }
});
test('extreme settings, silence and zero volume stay safe', () => {
  const extreme = Object.fromEntries(controls.map((c) => [c.key, c.max]));
  const raw = render(extreme);
  const wet = processAudio(raw.samples, 22050, extreme);
  assert.ok(wet.every(Number.isFinite));
  assert.ok(peak(wet) <= 0.951);
  assert.equal(
    peak(processAudio(raw.samples, 22050, { ...defaults, volume: 0 })),
    0,
  );
  assert.equal(peak(processAudio(new Float32Array(500), 22050, defaults)), 0);
  assert.equal(processAudio(new Float32Array(), 22050, defaults).length, 0);
});
test('WAV has a correct mono PCM header and exact payload length', () => {
  const raw = render(),
    samples = processAudio(raw.samples, raw.sampleRate, defaults),
    wav = encodeWav(samples, raw.sampleRate),
    v = new DataView(wav);
  assert.equal(Buffer.from(wav).subarray(0, 4).toString(), 'RIFF');
  assert.equal(v.getUint32(4, true), wav.byteLength - 8);
  assert.equal(v.getUint16(20, true), 1);
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint32(24, true), 22050);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(v.getUint32(40, true), samples.length * 2);
  assert.equal(wav.byteLength, 44 + samples.length * 2);
});
test('invalid text, languages, and imported settings are rejected', () => {
  for (const text of ['', '   ', 'a'.repeat(1001), null])
    assert.throws(() =>
      validateRequest({ text, language: 'cmn', settings: defaults }),
    );
  assert.throws(() =>
    validateRequest({ text: '你好', language: 'fake', settings: defaults }),
  );
  for (const value of [NaN, Infinity, -1, 101, '50'])
    assert.throws(() => validateSettings({ ...defaults, intonation: value }));
  for (const value of [null, [], true])
    assert.throws(() => validateSettings(value));
  assert.equal(
    validateRequest({ text: ' 你好 ', language: 'cmn', settings: defaults })
      .text,
    '你好',
  );
});
