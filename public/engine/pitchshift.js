// Deterministic mono pitch shifting (formant-shifting), matching the reference's
// SoundTouch "Mii-ify pitch" knob: resample to move pitch and formants together,
// then SOLA time-stretch back to the original length.
const FRAME = 1024;
const OVERLAP = FRAME >> 1; // 512, synthesis hop
const SEEK = OVERLAP; // max alignment search, samples

function resample(input, ratio) {
  const outLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const j = Math.floor(pos);
    const frac = pos - j;
    const a = input[j] ?? 0;
    const b = input[j + 1] ?? 0;
    out[i] = a + (b - a) * frac;
  }
  return out;
}
// Periodic Hann window so overlap-added frames sum to unity.
const win = new Float32Array(FRAME);
for (let i = 0; i < FRAME; i++)
  win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / FRAME));
function bestOverlap(input, out, inPos, outPos, limit) {
  let best = 0,
    bestCorr = -Infinity;
  for (let d = 0; d <= SEEK && inPos + d + OVERLAP <= limit; d++) {
    let corr = 0;
    const base = inPos + d;
    for (let i = 0; i < OVERLAP; i++)
      corr += input[base + i] * out[outPos - OVERLAP + i];
    if (corr > bestCorr) {
      bestCorr = corr;
      best = d;
    }
  }
  return inPos + best;
}
export function timeStretch(input, factor) {
  if (!input.length || factor <= 0) return new Float32Array();
  if (Math.abs(factor - 1) < 1e-4) return input.slice();
  const Ss = OVERLAP; // synthesis hop
  const Sa = Math.max(1, Math.round(Ss / factor)); // analysis hop
  const out = new Float32Array(Math.round(input.length * factor));
  const limit = input.length;
  let inPos = 0,
    outPos = 0,
    first = true;
  while (outPos + FRAME <= out.length) {
    const start = first ? inPos : bestOverlap(input, out, inPos, outPos, limit);
    for (let i = 0; i < FRAME; i++) {
      const value = (input[start + i] ?? 0) * win[i];
      const idx = outPos + i;
      if (i < OVERLAP && !first) out[idx] += value;
      else out[idx] = value;
    }
    first = false;
    inPos = start + Sa;
    outPos += Ss;
  }
  return out;
}
export function pitchShift(input, sampleRate, semitones) {
  if (!input.length || !semitones) return input.slice();
  const ratio = Math.pow(2, semitones / 12);
  return timeStretch(resample(input, ratio), ratio);
}
