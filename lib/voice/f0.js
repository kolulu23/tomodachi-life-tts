// Period estimation from the cumulative-mean normalized squared difference.
// Select the first convincing local minimum, rather than a higher-scoring
// multiple of the period. A fixed comparison length avoids lag-length bias.
export function estimateF0(
  samples,
  sampleRate,
  start = 0,
  frameLength = samples.length - start,
) {
  const minLag = Math.max(2, Math.ceil(sampleRate / 500));
  const maxLag = Math.min(
    Math.floor(sampleRate / 60),
    Math.floor(frameLength / 2) - 1,
  );
  if (maxLag <= minLag) return null;
  const length = frameLength - maxLag - 1;
  const difference = new Float64Array(maxLag + 2);
  difference[0] = 1;
  let total = 0;
  for (let lag = 1; lag <= maxLag + 1; lag++) {
    let squared = 0;
    for (let i = 0; i < length; i++) {
      const delta = samples[start + i] - samples[start + i + lag];
      squared += delta * delta;
    }
    total += squared;
    difference[lag] = total > 1e-12 ? (squared * lag) / total : 1;
  }
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (difference[lag] >= 0.15) continue;
    while (lag < maxLag && difference[lag + 1] < difference[lag]) lag++;
    const left = difference[lag - 1],
      center = difference[lag],
      right = difference[lag + 1];
    const curvature = left - 2 * center + right;
    const offset =
      curvature > 1e-12
        ? Math.max(-1, Math.min(1, (left - right) / (2 * curvature)))
        : 0;
    const hz = sampleRate / (lag + offset);
    return hz >= 60 && hz <= 500 ? hz : null;
  }
  return null; // Noise / unvoiced frames have no sufficiently clear period.
}
