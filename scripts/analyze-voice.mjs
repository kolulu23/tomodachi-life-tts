#!/usr/bin/env node
// Analyze a speech WAV for the metrics that matter for a Tomodachi-style voice:
// duration, fundamental-frequency statistics, pause structure, spectral
// brightness and a ~900 Hz nasal-formant ratio. Reads 16-bit PCM mono/stereo WAV.
// Usage: node scripts/analyze-voice.mjs <file.wav> [<file2.wav> ...]
import { readFileSync } from 'node:fs';

function decodeWav(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 44) throw new Error('Not a WAV file.');
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff !== 'RIFF' || wave !== 'WAVE') throw new Error('Not a RIFF/WAVE file.');
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bits = view.getUint16(34, true);
  const dataLen = view.getUint32(40, true);
  if (bits !== 16) throw new Error('Expected 16-bit PCM.');
  const frameCount = dataLen / (2 * channels);
  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++)
    samples[i] = view.getInt16(44 + i * 2 * channels, true) / 32768;
  return { samples, sampleRate };
}
function analyze(file) {
  const { samples, sampleRate } = decodeWav(readFileSync(file));
  const frame = Math.floor(sampleRate * 0.04);
  const hop = Math.floor(sampleRate * 0.01);
  const f0s = [];
  const rmsFrames = [];
  let nasalEnergy = 0,
    brightEnergy = 0,
    totalEnergy = 0,
    centroidAcc = 0,
    centroidW = 0;
  for (let start = 0; start + frame <= samples.length; start += hop) {
    // RMS + autocorrelation F0
    let e = 0;
    for (let i = 0; i < frame; i++) e += samples[start + i] ** 2;
    const rms = Math.sqrt(e / frame);
    rmsFrames.push(rms);
    // coarse spectrum (linear bins) for brightness/nasality/centroid
    let nb = 0,
      bb = 0,
      tb = 0,
      cm = 0,
      cw = 0;
    for (let k = 1; k <= 48; k++) {
      const f = (k * sampleRate) / (2 * 48);
      let re = 0,
        im = 0;
      for (let i = 0; i < frame; i++) {
        const ang = (2 * Math.PI * k * i) / (2 * 48);
        re += samples[start + i] * Math.cos(ang);
        im -= samples[start + i] * Math.sin(ang);
      }
      const mag = re * re + im * im;
      tb += mag;
      cm += f * mag;
      cw += mag;
      if (f >= 700 && f <= 1100) nb += mag;
      if (f >= 4000) bb += mag;
    }
    if (rms > 1e-4) {
      nasalEnergy += nb;
      brightEnergy += bb;
      totalEnergy += tb;
      centroidAcc += cm;
      centroidW += cw;
    }
    // F0 via normalized autocorrelation, voiced only
    const minLag = Math.floor(sampleRate / 500);
    const maxLag = Math.floor(sampleRate / 60);
    let bestLag = 0,
      bestCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let num = 0,
        d1 = 0,
        d2 = 0;
      for (let i = 0; i < frame - lag; i++) {
        const a = samples[start + i];
        const b = samples[start + i + lag];
        num += a * b;
        d1 += a * a;
        d2 += b * b;
      }
      const corr = num / (Math.sqrt(d1) * Math.sqrt(d2) || 1);
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
    if (rms > 0.01 && bestCorr > 0.5) f0s.push(sampleRate / bestLag);
  }
  // pause structure from RMS
  const noiseFloor = Math.max(1e-4, median(rmsFrames) * 0.25);
  const pauses = [];
  let inPause = false,
    pauseStart = 0;
  for (let i = 0; i < rmsFrames.length; i++) {
    const silent = rmsFrames[i] < noiseFloor;
    if (silent && !inPause) {
      inPause = true;
      pauseStart = i;
    } else if (!silent && inPause) {
      inPause = false;
      pauses.push((i - pauseStart) * hop / sampleRate);
    }
  }
  const voicedRatio = f0s.length / rmsFrames.length;
  const brightness = totalEnergy ? brightEnergy / totalEnergy : 0;
  const nasality = totalEnergy ? nasalEnergy / totalEnergy : 0;
  const centroid = centroidW ? centroidAcc / centroidW : 0;
  return {
    file,
    duration: samples.length / sampleRate,
    sampleRate,
    f0Hz: stats(f0s),
    voicedRatio,
    pauseCount: pauses.length,
    meanPauseSec: pauses.length ? mean(pauses) : 0,
    spectralCentroidHz: centroid,
    brightness,
    nasality900Hz: nasality,
  };
}
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const mean = (a) => (a.length ? a.reduce((p, x) => p + x, 0) / a.length : 0);
const stats = (a) =>
  a.length
    ? {
        count: a.length,
        mean: mean(a),
        median: median(a),
        min: Math.min(...a),
        max: Math.max(...a),
      }
    : { count: 0 };
const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/analyze-voice.mjs <file.wav> [<file2.wav> ...]');
  process.exit(1);
}
const results = files.map(analyze);
console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
