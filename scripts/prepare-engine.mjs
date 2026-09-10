import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Copy the pinned, checksum-verified eSpeak NG CLI WebAssembly build into the
// public assets. The binary is vendored in-repo (no CDN, no npm distribution).
const vendor = fileURLToPath(new URL('../vendor/espeak-ng-cli/', import.meta.url));
const destination = fileURLToPath(new URL('../public/engine/', import.meta.url));
const sums = await readFile(join(vendor, 'SHA256SUMS'), 'utf8');
const expected = new Map(
  sums
    .trim()
    .split('\n')
    .map((line) => {
      const [hash, name] = line.trim().split(/\s+/);
      return [name, hash];
    }),
);
await mkdir(destination, { recursive: true });
for (const name of ['espeak-ng.js', 'espeak-ng.wasm', 'COPYING']) {
  const data = await readFile(join(vendor, name));
  const actual = createHash('sha256').update(data).digest('hex');
  if (expected.get(name) && actual !== expected.get(name))
    throw new Error(`Engine checksum mismatch for ${name}.`);
  await writeFile(join(destination, name), data);
}
console.log('Speech engine assets ready.');
