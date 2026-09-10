#!/usr/bin/env bash
set -euo pipefail
# Reproduce the pinned, unmodified vendored engine from the npm distribution.
root="$(cd "$(dirname "$0")/.." && pwd)"
staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT
npm pack @echogarden/espeak-ng-emscripten@0.3.5 --pack-destination "$staging"
archive="$staging/echogarden-espeak-ng-emscripten-0.3.5.tgz"
expected=4817314c0a9aed9653785e4b4b45802960ac8c5a
actual="$(shasum "$archive" | cut -d ' ' -f 1)"
if [[ "$actual" != "$expected" ]]; then echo 'Engine archive checksum mismatch' >&2; exit 1; fi
tar -xzf "$archive" -C "$staging"
mkdir -p "$root/public/engine"
cp "$staging/package/espeak-ng.js" "$staging/package/espeak-ng.data" "$staging/package/COPYING" "$root/public/engine/"
