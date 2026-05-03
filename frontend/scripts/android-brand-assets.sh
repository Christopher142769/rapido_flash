#!/usr/bin/env bash
# Régénère icônes + splash Android à partir de public/images/logo.png (après un `cap sync` si besoin).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGO="$ROOT/public/images/logo.png"
BASE="$ROOT/android/app/src/main/res"
if [[ ! -f "$LOGO" ]]; then
  echo "Manquant: $LOGO (télécharge le logo Rapido 1024² PNG)." >&2
  exit 1
fi
for s in 108:mdpi 162:hdpi 216:xhdpi 324:xxhdpi 432:xxxhdpi; do
  px="${s%%:*}"; d="${s##*:}"
  sips -z "$px" "$px" "$LOGO" -o "$BASE/mipmap-${d}/ic_launcher_foreground.png"
done
for s in 48:mdpi 72:hdpi 96:xhdpi 144:xxhdpi 192:xxxhdpi; do
  px="${s%%:*}"; d="${s##*:}"
  sips -z "$px" "$px" "$LOGO" -o "$BASE/mipmap-${d}/ic_launcher.png"
  cp "$BASE/mipmap-${d}/ic_launcher.png" "$BASE/mipmap-${d}/ic_launcher_round.png"
done
mkdir -p "$BASE/drawable-nodpi"
sips -z 512 512 "$LOGO" -o "$BASE/drawable-nodpi/splash_logo.png"
echo "OK — icônes + splash_logo régénérés."
