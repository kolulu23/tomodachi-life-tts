import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import E from '../public/engine/espeak-ng.js';
import { defaults } from '../public/engine/config.js';
import { synthesize } from '../public/engine/synthesis.js';
import { pitchShift } from '../public/engine/pitchshift.js';
import { sentenceLilt } from '../public/engine/prosody.js';
import { encodeWav } from '../public/engine/dsp.js';
import { estimateF0 } from '../lib/voice/f0.js';
const tone = (sr, hz, seconds, phase = 0) =>
  Float32Array.from(
    { length: Math.round(sr * seconds) },
    (_, i) => 0.3 * Math.sin((2 * Math.PI * hz * i) / sr + phase),
  );
const rms = (a) => Math.sqrt(a.reduce((sum, x) => sum + x * x, 0) / a.length);
const render = (text, language = 'en-us', lilt = 2) =>
  synthesize(E, { text, language, settings: { ...defaults, lilt } });

test('pitch shifts preserve voiced coverage and the final partial frame', () => {
  const sr = 22050,
    input = tone(sr, 220, 3);
  for (const shift of [-12, -6, 3, 6, 12]) {
    const result = pitchShift(input, sr, shift);
    assert.equal(result.length, input.length);
    for (let start = 0; start < result.length - 2205; start += 2205)
      assert.ok(
        rms(result.subarray(start, start + 2205)) > 0.15,
        `${shift}: voiced block ${start / sr}`,
      );
    assert.ok(
      rms(result.subarray(-2205)) > 0.15,
      `${shift}: tail must remain voiced`,
    );
    const f0 = estimateF0(result, sr, 1000, 882);
    assert.ok(
      f0 && Math.abs(f0 / (220 * 2 ** (shift / 12)) - 1) < 0.02,
      `${shift}: pitch ${f0}`,
    );
  }
  for (const n of [100, 300, 1000, 22051]) {
    const x = tone(sr, 220, n / sr),
      y = pitchShift(x, sr, 6);
    assert.equal(y.length, n);
    assert.ok(y.every(Number.isFinite));
    assert.ok(rms(y) > 0.05);
  }
});

test('pitch shift preserves changing content near the start, middle, and end', () => {
  const sr = 22050,
    frequencies = [180, 220, 300, 160, 240, 200];
  const input = Float32Array.from(
    { length: sr * 3 },
    (_, i) =>
      0.3 *
      Math.sin(
        (2 * Math.PI * frequencies[Math.floor(i / (sr * 0.5))] * i) / sr,
      ),
  );
  for (const shift of [-12, 6, 12]) {
    const output = pitchShift(input, sr, shift);
    for (let i = 0; i < frequencies.length; i++) {
      const f0 = estimateF0(output, sr, Math.round((i * 0.5 + 0.2) * sr), 882);
      const expected = frequencies[i] * 2 ** (shift / 12);
      // 600 Hz lies outside the analyzer's documented 60–500 Hz voice range.
      if (expected > 500) continue;
      assert.ok(
        f0 && Math.abs(f0 / expected - 1) < 0.03,
        `shift ${shift}, segment ${i}: ${f0} vs ${expected}`,
      );
    }
  }
});

test('lilt changes lowercase English and Chinese without altering their phonemes', async () => {
  for (const [text, language] of [
    ['hello world. welcome to my island.', 'en-us'],
    ['你好，欢迎来到小岛。今天过得开心吗？', 'cmn'],
  ]) {
    const variants = [];
    for (const lilt of [1, 2, 3, 4])
      variants.push(await render(text, language, lilt));
    for (let i = 1; i < variants.length; i++) {
      assert.notDeepEqual(variants[i].samples, variants[0].samples);
      assert.equal(variants[i].phonemes, variants[0].phonemes);
    }
  }
  const lower = await render('hello world'),
    upper = await render('Hello World');
  assert.deepEqual(
    lower.samples,
    upper.samples,
    'capitals must not add a beep',
  );
});

test('speech treats CLI switches and markup as literal user text', async () => {
  for (const text of ['--version', '-hello', '--help']) {
    const result = await render(text);
    assert.ok(result.samples.length > 1000);
    assert.ok(result.phonemes.length > 2);
  }
  const literal = await render(
    '<prosody pitch="+100%">hello</prosody> & goodbye',
  );
  assert.match(literal.phonemes, /pɹ/); // The word "prosody" is spoken, not executed.
  assert.match(literal.phonemes, /ɡʊdb/);
  const markup = sentenceLilt('<audio src="x"/> & hello', 'en-us', 1);
  assert.equal(markup, '&lt;audio src=&quot;x&quot;/&gt; &amp; hello');
});

test('F0 estimator resolves fundamental periods across rates, phases, and harmonics', () => {
  for (const sr of [16000, 22050])
    for (const hz of [80, 120, 180, 220, 300, 440])
      for (const phase of [0, 0.7]) {
        const samples = tone(sr, hz, 0.04, phase),
          f0 = estimateF0(samples, sr);
        assert.ok(
          f0 && Math.abs(f0 / hz - 1) < 0.01,
          `${sr}: expected ${hz}, got ${f0}`,
        );
        const harmonics = Float32Array.from(
          samples,
          (_, i) =>
            0.2 * Math.sin((2 * Math.PI * hz * i) / sr) +
            0.3 * Math.sin((4 * Math.PI * hz * i) / sr) +
            0.15 * Math.sin((6 * Math.PI * hz * i) / sr),
        );
        const harmonicF0 = estimateF0(harmonics, sr);
        assert.ok(
          harmonicF0 && Math.abs(harmonicF0 / hz - 1) < 0.02,
          `${sr}: harmonics ${hz}, got ${harmonicF0}`,
        );
      }
  assert.equal(estimateF0(new Float32Array(882), 22050), null);
  let seed = 7;
  const noise = Float32Array.from({ length: 882 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32 - 0.5;
  });
  assert.equal(estimateF0(noise, 22050), null);
});

test('analysis CLI reports the same known pitch at 16 kHz and 22.05 kHz', () => {
  const dir = mkdtempSync(join(tmpdir(), 'island-f0-test-'));
  try {
    for (const sr of [16000, 22050]) {
      const file = join(dir, `${sr}.wav`);
      writeFileSync(file, Buffer.from(encodeWav(tone(sr, 220, 0.3), sr)));
      const result = JSON.parse(
        execFileSync(process.execPath, ['scripts/analyze-voice.mjs', file], {
          encoding: 'utf8',
        }),
      );
      assert.ok(Math.abs(result.f0Hz.median - 220) < 1);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
