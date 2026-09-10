import { validateRequest } from './config.js';
// Direct formant synthesis: transpose the glottal source, adjust resonances separately.
// This avoids resampling speech, which would also change timing and Chinese tones.
export function variantDefinition(s) {
  const scale = Math.pow(2, s.transpose / 12);
  const formant = Math.round(100 * Math.pow(2, -s.depth / 100));
  const stress = Math.round(16 + s.accent * 0.2);
  return (
    [
      'language variant',
      'name Island custom',
      `pitch ${Math.round(82 * scale)} ${Math.round(118 * scale)}`,
      ...Array.from(
        { length: 9 },
        (_, i) => `formant ${i} ${i === 0 ? 100 : formant} 100 100`,
      ),
      `stressAmp 16 16 20 20 ${stress} ${stress} ${stress + 2} ${stress + 4}`,
      `breath 0 ${Array(7)
        .fill(Math.round(s.breath * 0.08))
        .join(' ')}`,
      `roughness ${Math.round(s.roughness)}`,
    ].join('\n') + '\n'
  );
}
export function synthesize(module, engine, request) {
  const { text, language, settings: s } = validateRequest(request);
  module.FS.writeFile(
    '/usr/share/espeak-ng-data/voices/!v/island',
    variantDefinition(s),
  );
  if (engine.set_voice(`${language}+island`) !== 0)
    throw new Error('This language could not be loaded.');
  engine.set_pitch(Math.round(s.pitch));
  engine.set_rate(Math.round(s.speed));
  engine.set_range(Math.round(s.intonation));
  engine.set_volume(100);
  const chunks = [];
  let length = 0;
  const phonemes = engine.synthesize_and_get_phonemes(text, (chunk) => {
    if (chunk.length) {
      chunks.push(chunk);
      length += chunk.length;
    }
    return false;
  });
  if (length === 0)
    throw new Error(
      'The speech engine returned no audio. Try a different phrase.',
    );
  const samples = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++)
      samples[offset + i] = chunk[i] / 32768;
    offset += chunk.length;
  }
  return { samples, sampleRate: engine.get_samplerate(), phonemes };
}
