// Deterministic mono PCM processing, shared by the worker and numerical tests.
function biquad(input, sr, type, freq, gain, q = 0.8) {
  const A = Math.pow(10, gain / 40),
    w = (2 * Math.PI * freq) / sr,
    c = Math.cos(w),
    sn = Math.sin(w),
    alpha = sn / (2 * q),
    root = 2 * Math.sqrt(A) * alpha;
  let b0, b1, b2, a0, a1, a2;
  if (type === 'peak') {
    b0 = 1 + alpha * A;
    b1 = -2 * c;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * c;
    a2 = 1 - alpha / A;
  } else {
    b0 = A * (A + 1 + (A - 1) * c + root);
    b1 = -2 * A * (A - 1 + (A + 1) * c);
    b2 = A * (A + 1 + (A - 1) * c - root);
    a0 = A + 1 - (A - 1) * c + root;
    a1 = 2 * (A - 1 - (A + 1) * c);
    a2 = A + 1 - (A - 1) * c - root;
  }
  const out = new Float32Array(input.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i],
      y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}
function read(a, pos) {
  if (pos < 0 || pos >= a.length - 1) return 0;
  const i = Math.floor(pos),
    t = pos - i;
  return a[i] * (1 - t) + a[i + 1] * t;
}
export function processAudio(source, sampleRate, s) {
  if (!source.length) return new Float32Array();
  let signal = source.slice();
  if (s.nasal)
    signal = biquad(signal, sampleRate, 'peak', 1500, s.nasal * 0.12, 1.8);
  if (s.brightness)
    signal = biquad(signal, sampleRate, 'shelf', 2800, s.brightness * 0.12);
  const vibrato = s.vibrato / 100,
    chorus = s.chorus / 100,
    robot = s.robot / 100;
  const out = new Float32Array(
    signal.length + Math.ceil((vibrato || chorus ? 0.045 : 0) * sampleRate),
  );
  const crush = s.crush / 100,
    hold = Math.max(1, Math.round(1 + crush * 5)),
    steps = Math.pow(2, 16 - Math.round(crush * 11));
  let held = 0;
  for (let i = 0; i < out.length; i++) {
    const time = i / sampleRate;
    const delay = vibrato
      ? (0.004 +
          0.003 * vibrato * Math.sin(2 * Math.PI * s.vibratoRate * time)) *
        sampleRate
      : 0;
    let x = vibrato ? read(signal, i - delay) : signal[i] || 0;
    if (chorus)
      x =
        (x +
          chorus *
            0.6 *
            read(
              signal,
              i -
                (0.018 + 0.004 * Math.sin(2 * Math.PI * 0.8 * time)) *
                  sampleRate,
            )) /
        (1 + chorus * 0.6);
    x *= 1 - robot + robot * Math.cos(2 * Math.PI * 70 * time);
    if (crush) {
      if (i % hold === 0) held = Math.round(x * steps) / steps;
      x = held;
    }
    out[i] = Number.isFinite(x) ? x : 0;
  }
  // DC removal followed by attenuation-only peak normalization and a click-free edge.
  let previous = 0,
    filtered = 0,
    peak = 0;
  for (let i = 0; i < out.length; i++) {
    const x = out[i];
    filtered = x - previous + 0.995 * filtered;
    previous = x;
    out[i] = filtered;
    peak = Math.max(peak, Math.abs(filtered));
  }
  const level = (s.volume / 100) * Math.min(1, 0.95 / (peak || 1)),
    fade = Math.min(Math.floor(sampleRate * 0.004), Math.floor(out.length / 2));
  for (let i = 0; i < out.length; i++)
    out[i] *=
      level * Math.min(1, i / (fade || 1), (out.length - 1 - i) / (fade || 1));
  return out;
}
export function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2),
    view = new DataView(buffer);
  const str = (offset, text) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  };
  str(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(x * (x < 0 ? 32768 : 32767)), true);
  }
  return buffer;
}
