# Review fixes: controlled before/after comparison

Baseline: `4c472dd51f8d83292fa335f7d093f8bf5e13541d`.
The implementation changes fix the five reproduced findings. No preset tuning
was changed; initial load and Reset now select the actual Islander settings.

## 1. Pitch shifting preserves voiced content

Test: a continuous 220 Hz sine, three seconds long at 22,050 Hz. The output
length is three seconds in both versions; the old version incorrectly filled
part of that length with silence. “Silent tail” is consecutive trailing samples
below an absolute amplitude of 1e-7.

| Shift | Silent tail before | Silent tail after |
|---|---:|---:|
| −12 semitones | 0.562 s | 0.000 s |
| −6 semitones | 0.701 s | 0.000 s |
| +3 semitones | 1.131 s | 0.000 s |
| +6 semitones | 1.441 s | 0.000 s |
| +12 semitones | 1.672 s | 0.000 s |

`pitchshift.js` now searches around an independent nominal analysis position
instead of accumulating alignment corrections. It compares the actual output
overlap, uses normalized correlation, and normalizes window weights at the
boundaries. Partial frames are rendered. Additional regressions check the pitch
and voiced energy of changing tones at the start, middle and end, and short clips.

## 2. Lilt affects sentence openings, not capitals

The engine's `-k` option no longer drives this control. Generated, escaped SSML
raises the first phrase of each sentence: off / +5% / +10% / +20%. The phrase
ends at the first comma, colon or semicolon, or after three lexical words.
`Intl.Segmenter` uses the selected speech language. Raw user markup is escaped.

| Sample | Distinct PCM outputs across four levels, before | After |
|---|---:|---:|
| Lowercase English | 1 | 4 |
| Mandarin | 1 | 4 |

For both comparison phrases, the four corrected outputs retain the same phoneme
trace. A separate regression verifies that `hello world` and `Hello World`
produce identical audio under the same settings, with no capitalization beep.
This verifies synthesis behavior, not a perceptual match to Nintendo's engine.

## 3. Leading hyphens remain speech input

| Input | Before | After |
|---|---|---|
| `--version` | No such file or directory | 12,740 audio samples |
| `-hello` | No such file or directory | 11,656 audio samples |

The CLI receives `--` before the text argument. SSML-looking input is spoken as
literal text rather than executed as markup. Sample counts use the base settings
with lilt level 2 and 22,050 Hz output; they are not prescribed durations.

## 4. Known-pitch measurements agree across sample rates

Test: a 0.3-second, 220 Hz sine encoded as 16-bit PCM. Values are median F0.

| Sample rate | Before | After | Ground truth |
|---|---:|---:|---:|
| 16,000 Hz | 73.394 Hz | 220.016 Hz | 220 Hz |
| 22,050 Hz | 220.500 Hz | 220.009 Hz | 220 Hz |

The analyzer uses a cumulative-mean normalized difference function, selects the
first convincing local minimum, and interpolates the period. Tests also cover
80, 120, 180, 220, 300 and 440 Hz at both rates and two phases, harmonic mixtures,
silence and seeded noise. The existing 60–500 Hz analysis range is unchanged.
Speech F0 extraction remains an estimate; these tests do not validate every voice.
The historical real-game comparison in `voice-authenticity.md` is marked as
invalidated for F0; the original real-game clips were not retained for reanalysis.

## 5. Initial load, Reset and Islander selection agree

Previously, load/Reset selected Islander by name while using different values:
transpose 3 rather than 0, intonation 40 rather than 25, vibrato 8 rather than 20,
and chorus 10 rather than 20. All three paths now use the shared `initialPreset`
record, preserving Islander's existing tuning.

## Listening artifacts

Generated local artifacts are intentionally excluded from Git. The pitch-shift
pairs use the **same decoded source PCM**, base effect settings and +6 semitones;
only the pitch-shift algorithm differs, so lilt changes cannot confound this A/B.

| Language | Before | After |
|---|---|---|
| English | [WAV](../outputs/review-comparison/before/english-shifted.wav) | [WAV](../outputs/review-comparison/after/english-shifted.wav) |
| Mandarin | [WAV](../outputs/review-comparison/before/mandarin-shifted.wav) | [WAV](../outputs/review-comparison/after/mandarin-shifted.wav) |

The output directory also contains the original raw clips, corrected lilt levels
1–4, the baseline pitch-shift/analyzer snapshots, `compare.mjs`, and `results.json`.
Rerun this captured comparison with `node outputs/review-comparison/compare.mjs`.
The regression suite is persistent source; use `npm test` on a fresh checkout.

Automated validation: 19 tests, TypeScript checks, production build. Browser
interaction and subjective listening assessment have not been performed.
