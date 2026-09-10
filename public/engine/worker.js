import createEngine from './espeak-ng.js';
import { synthesize } from './synthesis.js';
import { processAudio, encodeWav } from './dsp.js';
let module, engine;
try {
  // Preload explicitly: failed asset requests must reject rather than leave Emscripten pending.
  const response = await fetch(new URL('./espeak-ng.data', import.meta.url));
  if (!response.ok)
    throw new Error(`Speech data download failed (${response.status}).`);
  const data = await response.arrayBuffer();
  module = await createEngine({ getPreloadedPackage: () => data });
  engine = new module.eSpeakNGWorker();
  postMessage({ type: 'ready' });
} catch (error) {
  postMessage({
    type: 'error',
    error: error.message || 'Could not load the speech engine.',
  });
}
self.onmessage = ({ data }) => {
  try {
    if (!engine) throw new Error('Speech engine is not ready.');
    const raw = synthesize(module, engine, data.request);
    const processed = processAudio(
      raw.samples,
      raw.sampleRate,
      data.request.settings,
    );
    const wav = encodeWav(processed, raw.sampleRate),
      dryWav = encodeWav(raw.samples, raw.sampleRate);
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
