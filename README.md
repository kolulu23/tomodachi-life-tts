# Island Voice Lab

A functional Tomodachi Life–inspired voice playground: React 19, TypeScript, Vinext/Vite, eSpeak NG and a dedicated audio worker. The UI uses small components and CSS tokens so it can be restyled independently of the voice engine.

## Run

Node 22.13 or newer:

```sh
npm ci
npm run dev
```

Open the URL printed by the server. No API keys, native speech tools, or voice subscriptions are needed. Speech runs on the device; a 24 MB pronunciation-data file loads once and can be cached by the browser. Local dev uses the scaffold's Cloudflare-compatible runtime; deployed speech still executes only in the browser.

```sh
npm test
npm run typecheck
npm run build
```

## Features

- 16 character presets and 16 working synthesis/effect controls.
- Mandarin (Chinese characters), Cantonese, US/UK English, Japanese, Korean, French, German, Spanish, Italian, Brazilian Portuguese, Russian, Hindi, Vietnamese.
- Source pitch and semitone transposition; independent rate, formant depth, intonation, syllable stress, breath and roughness.
- Nasal EQ, brightness, vibrato, chorus, ring modulation, sample/bit reduction and output level.
- WAV playback/export, real waveform, before-effects comparison and phoneme trace.
- Device-local saved presets plus validated JSON import/export.
- Cancellable worker execution, initialization/generation timeouts, retry states and stale-output indication.

## Audio architecture

`public/engine/config.js` is the shared settings schema, validation, language list and preset bank. `synthesis.js` builds an eSpeak variant in its virtual filesystem. The semitone knob changes the glottal source's pitch baseline, while depth changes formant resonances directly. This does not resample an existing clip and does not require formant-preserving time stretching. Speech rate is an eSpeak synthesis parameter; stress/accent changes syllable emphasis, not geographic pronunciation.

`dsp.js` processes PCM using biquad filters, modulated delay, ring modulation and sample/bit reduction, followed by DC removal, attenuation-only peak normalization, output gain and short fades. All DSP runs in `worker.js`, keeping synthesis off the UI thread. WAVs are mono 16-bit PCM at 22,050 Hz. `lib/voice/client.ts` handles worker lifetime, cancellation and errors; React only handles state and playback. The “before effects” clip retains synthesis settings but bypasses the DSP section.

The engine is the pinned, unmodified Emscripten JavaScript dependency `@echogarden/espeak-ng-emscripten@0.3.5`. It is intentionally served as same-origin assets, avoiding CDN dependencies and bundler transformations of Emscripten. `scripts/prepare-engine.mjs` copies the pinned dependency into the public assets before development, tests, and builds; npm verifies its lockfile integrity. `scripts/vendor-engine.sh` offers an alternative checksum-verified archive extraction. The generated engine JS/data are excluded from Git. See `public/engine/NOTICE.txt` and `LICENSE` for engine sources and licenses. Application code is GPL-3.0-or-later.

## Accuracy and scope

This is an original approximation of a robotic character style, not Nintendo's engine or a bit-exact reproduction of miichart. No source code was copied from miichart. Its public interface informed the feature comparison. The reference itself describes eSpeak plus DSP as an approximation.

Chinese uses the engine's bundled Mandarin/Cantonese dictionaries. Pronunciation is robotic and language quality varies; Japanese/Chinese names, uncommon characters, polyphonic characters, mixed-language phrases and extreme controls may need adjusted spelling or settings. Low intonation can hurt tonal-language intelligibility. Automated tests verify nonempty pronunciation/audio, not native-listener comprehension or similarity to the game. The main controls are set before rendering, not live effects on a playing clip. First-load caching is browser-managed; this is not an offline-installable PWA.

Browser UI and subjective listening QA have not been performed. Tests cover each offered language, pronunciation traces, control effects, speed independence, extreme DSP values and WAV integrity. Optional WebMCP tools (`configure_island_voice`, `generate_island_voice`) feature-detect support; no supported browser validation context was available, so their runtime contract is unverified.

## References

- Reference generator: https://miichart.com/tomodachi-life-voice-generator
- eSpeak NG languages: https://github.com/espeak-ng/espeak-ng/blob/master/docs/languages.md
- eSpeak voice parameters: https://github.com/espeak-ng/espeak-ng/blob/master/docs/voices.md
- Emscripten distribution: https://github.com/echogarden-project/espeak-ng-emscripten
