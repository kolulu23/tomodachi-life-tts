import { defaults } from '../../public/engine/config.js';
export type VoiceSettings = typeof defaults;
export type SpeechRequest = {
  text: string;
  language: string;
  settings: VoiceSettings;
};
export type SpeechResult = {
  wav: ArrayBuffer;
  dryWav: ArrayBuffer;
  samples: Float32Array;
  phonemes: string;
  sampleRate: number;
};
