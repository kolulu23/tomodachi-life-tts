# Island Voice Lab

A functional Tomodachi Life–inspired voice playground: React 19, TypeScript, Vinext/Vite, eSpeak NG and a dedicated audio worker. The UI uses small components and CSS tokens so it can be restyled independently of the voice engine.

## Run

Node 22.13 or newer:

```sh
npm ci
npm run dev
```

Open the URL printed by the server. No API keys, native speech tools, or voice subscriptions are needed. Speech runs on the device; an ~18 MB WebAssembly speech engine loads once and can be cached by the browser. Local dev uses the scaffold's Cloudflare-compatible runtime; deployed speech still executes only in the browser.

```sh
npm test
npm run typecheck
npm run build
```

## Features

- 19 character presets and 19 working synthesis/effect controls.
- Male/female voice register and character age (child → elder) shaping of the source voice.
- Mandarin (Chinese characters), Cantonese, US/UK English, Japanese, Korean, French, German, Spanish, Italian, Brazilian Portuguese, Russian, Hindi, Vietnamese.
- Source pitch, semitone transposition and a formant-shifting Mii pitch shift; independent rate, formant depth, intonation, sing-song lilt, word gap, syllable stress, breath and roughness.
- Nasal EQ, brightness, vibrato, chorus, ring modulation, a lowpass toy-radio muffle and output level.
- WAV playback/export, real waveform, before-effects comparison and phoneme trace.
- Device-local saved presets plus validated JSON import/export.
- Cancellable worker execution, initialization/generation timeouts, retry states and stale-output indication.

## Audio architecture

`public/engine/config.js` is the shared settings schema, validation, language list and preset bank. `synthesis.js` writes a custom eSpeak variant into the engine's filesystem and drives the CLI with argv: `-s` (rate), `-p` (pitch), `-P` (intonation range), `-k` (lilt — capital-letter pitch emphasis), and `-g` (word gap). The variant encodes the voice `gender` (male/female), an age-scaled pitch baseline and formant resonances, and age-based `flutter`/`roughness`, so the same synthesis path produces child, adult and elder voices. The semitone knob changes the glottal source's pitch baseline, while depth changes formant resonances directly. This does not resample an existing clip and does not require formant-preserving time stretching. Speech rate is an eSpeak synthesis parameter; stress/accent changes syllable emphasis, not geographic pronunciation.

`pitchshift.js` applies a SOLA time-stretch pitch shifter: it resamples the source to move pitch and formants together (the “Mii pitch” knob), then stretches back to the original length. `dsp.js` runs the reference-aligned “Mii-ify” chain: a 180 Hz high-pass, a 900 Hz nasal-formant peak, a lowpass toy-radio muffle, vibrato and chorus modulated delays, ring modulation, a 2500 Hz brightness shelf and a tanh soft-clip, followed by DC removal, attenuation-only peak normalization, output gain and short fades. All DSP runs in `worker.js`, keeping synthesis off the UI thread. WAVs are mono 16-bit PCM at 22,050 Hz. `lib/voice/client.ts` handles worker lifetime, cancellation and errors; React only handles state and playback. The “before effects” clip retains the source (including Mii pitch) but bypasses the DSP section.

The engine is the eSpeak NG command-line build compiled to WebAssembly (`espeak-ng.js` + `espeak-ng.wasm`, ~18 MB). It is vendored in `vendor/espeak-ng-cli/` with SHA-256 checksums and served as same-origin assets, avoiding CDN dependencies and bundler transformations of Emscripten. `scripts/prepare-engine.mjs` and `scripts/vendor-engine.sh` verify the checksums and copy the assets into `public/engine` before development, tests, and builds. The generated `public/engine` binaries are excluded from Git. See `public/engine/NOTICE.txt` and `LICENSE` for engine sources and licenses. Application code is GPL-3.0-or-later.

## Accuracy and scope

This is an original approximation of a robotic character style, not Nintendo's engine or a bit-exact reproduction of miichart. No miichart application source code is copied; the speech engine is the open-source eSpeak NG (GPL-3.0), vendored from the reference generator's hosted WebAssembly build and checksum-pinned. The reference's public interface informed the feature comparison. The reference itself describes eSpeak plus DSP as an approximation.

The real game uses Nuance "Vocalizer for Automotive" plus a Nintendo layer (NTTSMiiVoice) at 16 kHz; see `docs/voice-authenticity.md` for the reverse-engineered parameters, a WAV-analysis tool, and a measured comparison of our output against real game clips. That comparison is statistical only — human listening assessment is still pending, and the numbers are intentionally not treated as a finished tuning target.

Chinese uses the engine's bundled Mandarin/Cantonese dictionaries. Pronunciation is robotic and language quality varies; Japanese/Chinese names, uncommon characters, polyphonic characters, mixed-language phrases and extreme controls may need adjusted spelling or settings. Low intonation can hurt tonal-language intelligibility. Automated tests verify nonempty pronunciation/audio, not native-listener comprehension or similarity to the game. The main controls are set before rendering, not live effects on a playing clip. First-load caching is browser-managed; this is not an offline-installable PWA.

Browser UI and subjective listening QA have not been performed. Tests cover each offered language, pronunciation traces, control effects, speed independence, extreme DSP values and WAV integrity. Optional WebMCP tools (`configure_island_voice`, `generate_island_voice`) feature-detect support; no supported browser validation context was available, so their runtime contract is unverified.

## References

- Reference generator: https://miichart.com/tomodachi-life-voice-generator
- eSpeak NG languages: https://github.com/espeak-ng/espeak-ng/blob/master/docs/languages.md
- eSpeak voice parameters: https://github.com/espeak-ng/espeak-ng/blob/master/docs/voices.md
- eSpeak NG command line: https://github.com/espeak-ng/espeak-ng

## Interface translations

The header's interface language selector supports English, French, Simplified Chinese (`zh-Hans`) and Traditional Chinese (`zh-Hant`). It is independent of the speech language and does not reset input text, settings or generated audio. The first visit follows the browser's preferred supported language; an explicit selection is saved locally. Traditional Chinese is detected for Taiwan, Hong Kong and Macau unless an explicit script tag says otherwise.

Translations are in `lib/i18n/messages.js`, with English source messages as lookup keys. `core.js` handles locale resolution, interpolation and presentation of engine errors; `use-i18n.ts` handles browser preferences, document language, title and description. Status messages retain keys and values so switching languages also updates an existing message. User-written text and preset names are preserved. Native audio player controls follow the browser's own UI language. Catalog coverage, interpolation, error translation and locale detection are tested; browser interaction QA remains pending.

## Instant preview and presets drawer

“Apply instantly” starts unchecked. When enabled, text, language, knob, reset and preset changes regenerate and attempt to play the voice after a 350 ms pause in edits. Renders are serialized; changes made during a render are picked up afterward, and stale results are not automatically played. Failed attempts do not retry indefinitely. Unchecking stops queued previews; Cancel also disables the option. Browsers may require pressing Play before allowing automatic audio playback. This regenerates clips rather than changing DSP on an already playing buffer.

The Presets side control opens a right-side drawer, closed by default. It contains built-in presets, random selection, and saved-preset/import/export controls. Escape, the close button, or the backdrop dismisses it. Both features are translated into all four interface languages.
