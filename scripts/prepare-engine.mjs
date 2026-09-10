import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Keep the engine's import.meta.url-relative data file next to its JS module.
// A pinned dependency and npm integrity checks reproduce the unmodified build.
const source = dirname(fileURLToPath(import.meta.resolve('@echogarden/espeak-ng-emscripten')));
const destination = fileURLToPath(new URL('../public/engine/', import.meta.url));
await mkdir(destination, { recursive: true });
for (const name of ['espeak-ng.js', 'espeak-ng.data', 'COPYING']) {
  await copyFile(join(source, name), join(destination, name));
}
console.log('Speech engine assets ready.');
