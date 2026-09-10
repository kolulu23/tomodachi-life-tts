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
// eSpeak NG embeds its data under /usr/local/share in the CLI build.
const VOICES_DIR = '/usr/local/share/espeak-ng-data/voices/!v';
// Game-style discrete intonation maps to eSpeak's capital-letter pitch emphasis.
const LILT_LEVELS = [0, 1, 5, 20];
function decodeWav(bytes) {
  if (!bytes || bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'RIFF' ||
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== 'WAVE'
  )
    return null;
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bits = view.getUint16(34, true);
  const dataLen = view.getUint32(40, true);
  const samples = new Float32Array(dataLen / 2);
  for (let i = 0; i < samples.length; i++)
    samples[i] = view.getInt16(44 + i * 2, true) / 32768;
  return { samples, sampleRate, channels, bits };
}
export async function synthesize(ESpeakNG, request) {
  const { text, language, settings: s } = validateRequest(request);
  const args = [
    '-D',
    '-v',
    `${language}+island`,
    '-s',
    String(Math.round(s.speed)),
    '-p',
    String(Math.round(s.pitch)),
    '-P',
    String(clamp(Math.round(s.intonation), 0, 99)),
    '-k',
    String(LILT_LEVELS[Math.round(s.lilt ?? 2) - 1] ?? 1),
    '-g',
    String(Math.round(s.wordGap ?? 0)),
    '--ipa',
    '-w',
    '/out.wav',
    text,
  ];
  let phonemes = '';
  const mod = await ESpeakNG({
    arguments: args,
    locateFile: (path) => new URL(path, import.meta.url).href,
    print: (chunk) => {
      phonemes += chunk + '\n';
    },
    printErr: () => {},
    onRuntimeInitialized() {
      this.FS.writeFile(`${VOICES_DIR}/island`, variantDefinition(s));
    },
  });
  const decoded = decodeWav(mod.FS.readFile('/out.wav'));
  if (!decoded || decoded.samples.length === 0)
    throw new Error(
      'The speech engine returned no audio. Try a different phrase.',
    );
  return { ...decoded, phonemes: phonemes.trim() };
}
