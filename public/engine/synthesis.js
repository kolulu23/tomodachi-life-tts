import { validateRequest } from './config.js';
// Direct formant synthesis: transpose the glottal source, adjust resonances separately.
// This avoids resampling speech, which would also change timing and Chinese tones.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
export function variantDefinition(s) {
  const isFemale = s.gender === 'female';
  const age = Math.round(s.age);
  const scale = Math.pow(2, s.transpose / 12);

  // Fundamental frequency: gender baseline + age curve, then transpose shift.
  const genderPitch = isFemale ? 148 : 82;
  const agePitch =
    age <= 30
      ? lerp(1.35, 1.0, (age - 5) / 25) // child → adult
      : lerp(1.0, 0.86, (age - 30) / 60); // adult → elder
  const base = Math.round(genderPitch * agePitch * scale);
  const range = Math.round(base * 1.45);

  // Vocal-tract (formant) length: gender table, age curve, existing depth.
  const baseFreq = isFemale
    ? [108, 120, 118, 118, 120, 120, 114, 112, 112]
    : [100, 100, 100, 100, 100, 100, 100, 100, 100];
  const ageFormant =
    age <= 30
      ? lerp(1.24, 1.0, (age - 5) / 25)
      : lerp(1.0, 0.93, (age - 30) / 60);
  const depthFactor = Math.pow(2, -s.depth / 100);
  const strength = isFemale ? 85 : 100; // female: softer peaks
  const width = isFemale ? 150 : 100; // female: wider bandwidths
  const highRolloff = age <= 50 ? 1 : lerp(1, 0.45, (age - 50) / 40);

  const stress = Math.round(16 + s.accent * 0.2);
  const roughness = clamp(
    Math.round(s.roughness + (age <= 45 ? 0 : lerp(0, 2, (age - 45) / 45))),
    0,
    7,
  );
  const flutter = Math.round(age <= 40 ? 0 : lerp(0, 16, (age - 40) / 50));

  const formants = [];
  for (let i = 0; i < 9; i++) {
    const freq =
      i === 0
        ? Math.round(baseFreq[0] * ageFormant) // formant 0 stays depth-independent
        : Math.round(baseFreq[i] * ageFormant * depthFactor);
    const str = Math.round(strength * (i >= 6 ? highRolloff : 1));
    formants.push(`formant ${i} ${freq} ${str} ${width}`);
  }

  return (
    [
      'language variant',
      'name Island custom',
      `gender ${isFemale ? 'female' : 'male'} ${age}`,
      `pitch ${base} ${range}`,
      ...formants,
      `stressAmp 16 16 20 20 ${stress} ${stress} ${stress + 2} ${stress + 4}`,
      `breath 0 ${Array(7)
        .fill(Math.round(s.breath * 0.08))
        .join(' ')}`,
      `roughness ${roughness}`,
      `flutter ${flutter}`,
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
