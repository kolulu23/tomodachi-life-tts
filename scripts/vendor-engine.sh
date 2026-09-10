#!/usr/bin/env bash
set -euo pipefail
# Verify and copy the pinned, vendored eSpeak NG CLI WebAssembly build.
root="$(cd "$(dirname "$0")/.." && pwd)"
vendor="$root/vendor/espeak-ng-cli"
cd "$vendor"
shasum -a 256 -c SHA256SUMS
mkdir -p "$root/public/engine"
cp espeak-ng.js espeak-ng.wasm COPYING "$root/public/engine/"
echo 'Speech engine assets ready.'
