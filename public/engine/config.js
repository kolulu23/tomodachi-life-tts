/** Shared, serializable voice settings. No browser dependencies. */
export const controls = [
  {
    key: 'pitch',
    label: 'Base pitch',
    min: 0,
    max: 99,
    step: 1,
    unit: '',
    group: 'voice',
    hint: 'Fundamental pitch in the speech synthesizer.',
  },
  {
    key: 'transpose',
    label: 'Pitch shift',
    min: -12,
    max: 12,
    step: 1,
    unit: ' st',
    group: 'voice',
    hint: 'Transpose the source voice without moving its formants.',
  },
  {
    key: 'speed',
    label: 'Speed',
    min: 80,
    max: 350,
    step: 5,
    unit: ' wpm',
    group: 'voice',
    hint: 'Speech rate, independent of pitch.',
  },
  {
    key: 'depth',
    label: 'Depth / formants',
    min: -40,
    max: 40,
    step: 1,
    unit: '',
    group: 'voice',
    hint: 'Negative: smaller and brighter. Positive: larger and deeper.',
  },
  {
    key: 'intonation',
    label: 'Intonation',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    group: 'voice',
    hint: 'Pitch variation. Very low values can reduce Chinese tone clarity.',
  },
  {
    key: 'accent',
    label: 'Stress / accent',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    group: 'voice',
    hint: 'Emphasis on stressed syllables; language sets pronunciation.',
  },
  {
    key: 'breath',
    label: 'Breathiness',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    group: 'voice',
    hint: 'Air mixed into the synthesized voice.',
  },
  {
    key: 'roughness',
    label: 'Roughness',
    min: 0,
    max: 7,
    step: 1,
    unit: '',
    group: 'voice',
    hint: 'Irregularity in the source voice.',
  },
  {
    key: 'nasal',
    label: 'Nasal resonance',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    group: 'effects',
    hint: 'A narrow midrange boost for that toy-voice sound.',
  },
  {
    key: 'brightness',
    label: 'Brightness',
    min: -100,
    max: 100,
    step: 5,
    unit: '',
    group: 'effects',
    hint: 'Darken or brighten the high frequencies.',
  },
  {
    key: 'vibrato',
    label: 'Vibrato depth',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    group: 'effects',
    hint: 'Gentle pitch wobble.',
  },
  {
    key: 'vibratoRate',
    label: 'Vibrato rate',
    min: 1,
    max: 10,
    step: 0.5,
    unit: ' Hz',
    group: 'effects',
    hint: 'How quickly the pitch wobbles.',
  },
  {
    key: 'chorus',
    label: 'Thickness / chorus',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    group: 'effects',
    hint: 'A delayed, modulated voice double.',
  },
  {
    key: 'robot',
    label: 'Robot texture',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    group: 'effects',
    hint: 'Ring modulation adds metallic harmonics.',
  },
  {
    key: 'crush',
    label: 'Lo-fi',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    group: 'effects',
    hint: 'Reduce sample resolution for retro digital grit.',
  },
  {
    key: 'volume',
    label: 'Output level',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    group: 'effects',
    hint: 'Final volume after peak normalization.',
  },
];
export const defaults = {
  pitch: 50,
  transpose: 3,
  speed: 175,
  depth: -8,
  intonation: 55,
  accent: 40,
  breath: 0,
  roughness: 1,
  nasal: 30,
  brightness: 10,
  vibrato: 8,
  vibratoRate: 5,
  chorus: 10,
  robot: 0,
  crush: 5,
  volume: 80,
};
export const languages = [
  {
    id: 'en-us',
    label: 'English · US',
    sample: 'Hello! Welcome to my little island.',
  },
  {
    id: 'en',
    label: 'English · UK',
    sample: 'A lovely day for a cup of tea on the island.',
  },
  {
    id: 'cmn',
    label: '中文 · 普通话',
    sample: '你好！欢迎来到我的小岛。今天想吃什么？',
  },
  {
    id: 'yue',
    label: '中文 · 粤语',
    sample: '你好！歡迎嚟到我嘅小島。今日食咩好？',
  },
  { id: 'ja', label: '日本語', sample: 'こんにちは！私の島へようこそ。' },
  {
    id: 'ko',
    label: '한국어',
    sample: '안녕하세요! 나의 작은 섬에 오신 것을 환영합니다.',
  },
  {
    id: 'fr',
    label: 'Français',
    sample: 'Bonjour ! Bienvenue sur ma petite île.',
  },
  {
    id: 'de',
    label: 'Deutsch',
    sample: 'Hallo! Willkommen auf meiner kleinen Insel.',
  },
  {
    id: 'es',
    label: 'Español',
    sample: '¡Hola! Bienvenido a mi pequeña isla.',
  },
  {
    id: 'it',
    label: 'Italiano',
    sample: 'Ciao! Benvenuto sulla mia piccola isola.',
  },
  {
    id: 'pt-br',
    label: 'Português · Brasil',
    sample: 'Olá! Bem-vindo à minha pequena ilha.',
  },
  {
    id: 'ru',
    label: 'Русский',
    sample: 'Привет! Добро пожаловать на мой маленький остров.',
  },
  { id: 'hi', label: 'हिन्दी', sample: 'नमस्ते! मेरे छोटे से द्वीप पर आपका स्वागत है।' },
  {
    id: 'vi',
    label: 'Tiếng Việt',
    sample: 'Xin chào! Chào mừng đến với hòn đảo nhỏ của tôi.',
  },
];
const preset = (id, name, description, settings) => ({
  id,
  name,
  description,
  settings: { ...defaults, ...settings },
});
export const presets = [
  preset('islander', 'Islander', 'Bright, familiar chatter', {}),
  preset('tiny', 'Tiny neighbor', 'Small and full of energy', {
    pitch: 65,
    transpose: 7,
    depth: -22,
    speed: 200,
    intonation: 70,
  }),
  preset('robot', 'Pocket robot', 'Flat, metallic delivery', {
    pitch: 40,
    transpose: 0,
    intonation: 5,
    robot: 65,
    crush: 30,
    nasal: 45,
  }),
  preset('deep', 'Deep thinker', 'Low and unhurried', {
    pitch: 30,
    transpose: -6,
    depth: 28,
    speed: 140,
    intonation: 30,
    brightness: -25,
  }),
  preset('dream', 'Daydreamer', 'Soft with a little wobble', {
    pitch: 56,
    transpose: 2,
    breath: 35,
    vibrato: 35,
    chorus: 30,
    speed: 145,
  }),
  preset('arcade', 'Arcade announcer', 'Punchy, digital energy', {
    pitch: 58,
    transpose: 4,
    speed: 210,
    accent: 85,
    crush: 50,
    robot: 15,
  }),
  preset('moon', 'Moon visitor', 'Otherworldly and ringing', {
    transpose: 8,
    depth: 20,
    vibrato: 60,
    vibratoRate: 3,
    chorus: 60,
    robot: 35,
  }),
  preset('grumpy', 'Grumpy neighbor', 'Gravelly and unimpressed', {
    pitch: 28,
    transpose: -3,
    depth: 20,
    roughness: 6,
    intonation: 15,
    speed: 155,
  }),
  preset('bubbly', 'Bubbly friend', 'A bouncy, smiling voice', {
    pitch: 65,
    transpose: 5,
    depth: -15,
    intonation: 85,
    accent: 65,
    speed: 195,
  }),
  preset('sleepy', 'Sleepyhead', 'Slow, warm and airy', {
    pitch: 38,
    transpose: -2,
    speed: 100,
    depth: 12,
    breath: 45,
    brightness: -40,
    intonation: 25,
  }),
  preset('radio', 'Tiny radio', 'Thin, bright and crunchy', {
    depth: -20,
    nasal: 75,
    brightness: 55,
    crush: 65,
    chorus: 0,
  }),
  preset('elder', 'Village elder', 'Measured and quavering', {
    pitch: 35,
    transpose: -4,
    speed: 125,
    depth: 12,
    roughness: 4,
    vibrato: 45,
    vibratoRate: 4,
  }),
  preset('story', 'Storyteller', 'Clear and expressive', {
    pitch: 48,
    transpose: 0,
    depth: 0,
    intonation: 80,
    accent: 70,
    nasal: 10,
    crush: 0,
  }),
  preset('whisper', 'Airy sprite', 'Light and breathy', {
    pitch: 62,
    transpose: 5,
    depth: -12,
    breath: 85,
    brightness: 30,
    roughness: 0,
  }),
  preset('glitch', 'Glitch gremlin', 'A deliberately strange signal', {
    transpose: -5,
    depth: -30,
    robot: 85,
    crush: 75,
    chorus: 55,
    vibrato: 70,
    vibratoRate: 9,
  }),
  preset('clean', 'Clean source', 'Unprocessed formant speech', {
    transpose: 0,
    depth: 0,
    nasal: 0,
    brightness: 0,
    vibrato: 0,
    chorus: 0,
    crush: 0,
    roughness: 0,
    intonation: 50,
  }),
];
export function validateSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Voice settings must be an object.');
  const result = {};
  for (const c of controls) {
    const value = input[c.key] ?? defaults[c.key];
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < c.min ||
      value > c.max
    )
      throw new Error(`Invalid ${c.label}.`);
    result[c.key] = value;
  }
  return result;
}
export function validateRequest(input) {
  if (!input || typeof input !== 'object')
    throw new Error('Invalid speech request.');
  if (
    typeof input.text !== 'string' ||
    !input.text.trim() ||
    input.text.length > 1000
  )
    throw new Error('Enter between 1 and 1,000 characters.');
  if (!languages.some((l) => l.id === input.language))
    throw new Error('Choose a supported language.');
  return {
    text: input.text.trim(),
    language: input.language,
    settings: validateSettings(input.settings),
  };
}
