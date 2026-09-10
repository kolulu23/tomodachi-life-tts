import ESpeakNG from './espeak-ng.js';
import { synthesize } from './synthesis.js';
import { pitchShift } from './pitchshift.js';
import { processAudio, encodeWav } from './dsp.js';
postMessage({ type: 'ready' });
self.onmessage = async ({ data }) => {
  try {
    const raw = await synthesize(ESpeakNG, data.request);
    const source = pitchShift(
      raw.samples,
      raw.sampleRate,
      data.request.settings.pitchShift,
    );
    const processed = processAudio(source, raw.sampleRate, data.request.settings);
    const wav = encodeWav(processed, raw.sampleRate),
      dryWav = encodeWav(source, raw.sampleRate);
    postMessage(
      {
        type: 'result',
        id: data.id,
        wav,
        dryWav,
        samples: processed,
        phonemes: raw.phonemes,
        sampleRate: raw.sampleRate,
      },
      [wav, dryWav, processed.buffer],
    );
  } catch (error) {
    postMessage({
      type: 'error',
      id: data.id,
      error: error.message || 'Speech synthesis failed.',
    });
  }
};
