// Move pitch and formants together, then restore duration with waveform-aligned
// overlap-add. Alignment corrections never advance the nominal input clock.
const FRAME = 1024;
const HOP = FRAME / 2;
const SEEK = HOP;
const window = Float32Array.from(
  { length: FRAME },
  (_, i) => 0.5 * (1 - Math.cos((2 * Math.PI * i) / FRAME)),
);
function resample(input, ratio) {
  const out = new Float32Array(Math.max(1, Math.round(input.length / ratio)));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio,
      j = Math.floor(pos),
      fraction = pos - j;
    out[i] =
      (input[j] ?? 0) * (1 - fraction) +
      (input[j + 1] ?? input[j] ?? 0) * fraction;
  }
  return out;
}
function alignedStart(input, out, weights, nominal, outStart) {
  const reference = new Float32Array(HOP);
  let referenceEnergy = 0;
  for (let i = 0; i < HOP; i++) {
    const j = outStart + i;
    const value =
      j >= 0 && j < out.length && weights[j] > 1e-8 ? out[j] / weights[j] : 0;
    reference[i] = value;
    referenceEnergy += value * value;
  }
  if (referenceEnergy < 1e-10) return nominal;
  const min = Math.max(-HOP, nominal - SEEK);
  const max = Math.min(input.length - HOP, nominal + SEEK);
  let best = nominal,
    bestScore = -Infinity;
  function consider(start) {
    let dot = 0,
      energy = 0;
    for (let i = 0; i < HOP; i++) {
      const x = input[start + i] ?? 0;
      dot += x * reference[i];
      energy += x * x;
    }
    const score =
      energy > 1e-10
        ? dot / Math.sqrt(energy * referenceEnergy) -
          (Math.abs(start - nominal) / SEEK) * 0.001
        : -Infinity;
    if (score > bestScore) {
      bestScore = score;
      best = start;
    }
  }
  consider(nominal);
  // Coarse search plus local refinement avoids a full sample-by-sample scan.
  for (let start = min; start <= max; start += 4) consider(start);
  const coarse = best;
  for (
    let start = Math.max(min, coarse - 3);
    start <= Math.min(max, coarse + 3);
    start++
  )
    consider(start);
  return best;
}
export function timeStretch(
  input,
  factor,
  outputLength = Math.round(input.length * factor),
) {
  if (!Number.isFinite(factor) || factor <= 0)
    throw new RangeError('Invalid stretch factor.');
  if (!input.length) return new Float32Array();
  if (Math.abs(factor - 1) < 1e-4 && outputLength === input.length)
    return input.slice();
  const out = new Float32Array(outputLength),
    weights = new Float32Array(outputLength);
  // Center frames at both boundaries and include the final partial frame.
  // Normalize their actual weights instead of leaving the final block unwritten.
  for (let center = 0; center < outputLength + HOP; center += HOP) {
    const outStart = center - HOP;
    const nominal = Math.max(
      -HOP,
      Math.min(input.length - HOP, Math.round(center / factor) - HOP),
    );
    const start =
      center === 0
        ? nominal
        : alignedStart(input, out, weights, nominal, outStart);
    for (let i = 0; i < FRAME; i++) {
      const j = outStart + i;
      if (j < 0 || j >= out.length) continue;
      out[j] += (input[start + i] ?? 0) * window[i];
      weights[j] += window[i];
    }
  }
  for (let i = 0; i < out.length; i++)
    if (weights[i] > 1e-8) out[i] /= weights[i];
  return out;
}
export function pitchShift(input, sampleRate, semitones) {
  if (
    !Number.isFinite(semitones) ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0
  )
    throw new RangeError('Invalid pitch shift.');
  if (!input.length || !semitones) return input.slice();
  const ratio = Math.pow(2, semitones / 12);
  return timeStretch(resample(input, ratio), ratio, input.length);
}
