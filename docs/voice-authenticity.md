# Voice authenticity — ground truth and statistical analysis

This documents what the *real* Tomodachi Life voice actually is, how we measure
our approximation against it, and the current known gaps. It is intentionally
kept separate from the feature code so the two can move independently.

> Caveat: everything below is **statistical**, not perceptual. Spectral and F0
> numbers are a coarse proxy for "sounds like the game" and can be over-fit.
> Human listening assessment against real clips is the next step, before any
> further tuning.

## Ground truth: what the game actually uses

Reverse-engineered from the patched game via [Talkmodachi](https://github.com/dylanpdx/talkmodachi):

- **Engine**: Nuance **"Vocalizer for Automotive"** (the original Siri voice),
  plus a Nintendo post-processing layer called **NTTSMiiVoice**. It is *not* eSpeak.
- The Japanese 3DS release uses **SharpTTS**; Tomodachi Life on Switch
  (Living the Dream) uses **NeoSpeech VoiceText**.
- **Voice parameters**: `pitch`, `speed`, `quality`, `tone`, `accent`
  (0–100, default 50), plus a discrete `intonation` (1–4).
- **Output**: 16000 Hz, mono, 16-bit PCM.
- **NTTSMiiVoice effects**: echo, 3-voice chorus, pitch modulation (vibrato),
  pitch smoothing, word-stretch modes, and pauses.

Real in-game voice presets (parameter values from the game's data):

| Preset       | pitch | speed | quality | tone | accent |
|--------------|-------|-------|---------|------|--------|
| Young male   | 60    | 59    | 72      | 25   | 25     |
| Young female | 83    | 65    | 78      | 25   | 25     |
| Adult male   | 33    | 52    | 39      | 25   | 25     |
| Adult female | 68    | 39    | 58      | 25   | 25     |
| Old male     | 25    | 29    | 39      | 15   | 25     |
| Old female   | 67    | 18    | 69      | 12   | 42     |

## How we compare

- `scripts/analyze-voice.mjs` measures duration, F0 statistics, pause structure,
  spectral centroid, brightness (>4 kHz energy ratio), and a 900 Hz nasality
  ratio from any 16-bit PCM WAV.
- **Real clips** were fetched from Talkmodachi's API, which runs the *patched
  game in Citra* — i.e. actual Nuance + NTTSMiiVoice output, not an
  approximation. miichart is an eSpeak approximation and is **not** ground truth.

## Measured comparison

> **Historical results — F0 comparison invalidated by review.** The original
> autocorrelation estimator measured a known 220 Hz tone as 73.39 Hz at 16 kHz
> and 220.5 Hz at 22.05 kHz. The estimator has been corrected and tested, but
> the real-game samples were not retained, so the table below has not been
> regenerated. Its F0 agreement is not evidence of successful tuning. See
> [review-fixes.md](review-fixes.md) for controlled before/after results.


Same text ("Hello! Welcome to my little island."), our default voice vs the
real adult-male voice:

| Metric                | Real (adult male) | Ours (before tuning) | Ours (after tuning) |
|-----------------------|-------------------|----------------------|---------------------|
| Duration              | 1.92 s            | 2.53 s               | **1.95 s ✓**        |
| F0 mean               | 122 Hz            | 135 Hz               | **117 Hz ✓**        |
| Spectral centroid     | 417 Hz            | ~800–950 Hz          | ~860 Hz ⚠️          |
| Brightness (>4 kHz)   | 0.0007            | 0.0032               | ~0.0026 ⚠️          |
| Sample rate           | 16000 Hz          | 22050 Hz             | 22050 Hz            |

## What we did and deliberately did not do

- **Tuned presets** so duration and pitch align with the real voices (see
  `public/engine/config.js`): default speed raised to ~220 wpm, baseline darkened
  (`brightness −25`, `crush 45`), and per-preset speeds remapped to the game's
  young/adult/elder pacing.
- **Did not** close the brightness gap. Our output is still ~1.7–2× the real
  centroid. The cause is structural, not a preset value:
  1. the real engine renders at **16 kHz** (band-limited to 8 kHz), ours is 22.05 kHz; and
  2. our muffle lowpass sits at **5500 Hz**, while Nuance's automotive voice
     rolls off around **~4 kHz**.
  These are DSP changes (downsample + lower lowpass), left out for now pending
  human listening assessment.

## Sources

- Reverse engineering + real-clip backend: <https://github.com/dylanpdx/talkmodachi>
- eSpeak-based approximation (not ground truth): <https://miichart.com/tomodachi-life-voice-generator>

Real clips are Nintendo-copyrighted game audio; they are fetched transiently
for analysis and are **not** committed to this repository.
