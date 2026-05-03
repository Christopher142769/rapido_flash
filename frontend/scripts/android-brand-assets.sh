#!/usr/bin/env bash
# Régénère icônes + splash Android à partir de store-app-icon/source-logo.png (prioritaire),
# sinon public/images/logo.png. Utilise sharp + marges pour la zone sûre adaptive (évite le logo coupé).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/android/app/src/main/res"
PAD="$ROOT/scripts/android-brand-pad.cjs"

resolve_logo() {
  if [[ -f "$ROOT/store-app-icon/source-logo.png" ]]; then
    echo "$ROOT/store-app-icon/source-logo.png"
  elif [[ -f "$ROOT/store-app-icon/source-logo.webp" ]]; then
    echo "$ROOT/store-app-icon/source-logo.webp"
  elif [[ -f "$ROOT/public/images/logo.png" ]]; then
    echo "$ROOT/public/images/logo.png"
  else
    echo ""
  fi
}

LOGO="$(resolve_logo)"
if [[ -z "$LOGO" ]]; then
  echo "Aucun logo trouvé : place store-app-icon/source-logo.png ou public/images/logo.png" >&2
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "node est requis (sharp) pour générer les icônes." >&2
  exit 1
fi

echo "Source logo: $LOGO"

# Foreground adaptive : contenu ~58 % du carré (marge pour masque circulaire / squircle)
for s in 108:mdpi 162:hdpi 216:xhdpi 324:xxhdpi 432:xxxhdpi; do
  px="${s%%:*}"; d="${s##*:}"
  node "$PAD" "$LOGO" "$BASE/mipmap-${d}/ic_launcher_foreground.png" "$px" 0.58
done

# Icônes carrées classiques (launcher sans adaptive sur vieux devices) : un peu plus grand
for s in 48:mdpi 72:hdpi 96:xhdpi 144:xxhdpi 192:xxxhdpi; do
  px="${s%%:*}"; d="${s##*:}"
  node "$PAD" "$LOGO" "$BASE/mipmap-${d}/ic_launcher.png" "$px" 0.78
  cp "$BASE/mipmap-${d}/ic_launcher.png" "$BASE/mipmap-${d}/ic_launcher_round.png"
done

mkdir -p "$BASE/drawable-nodpi"
# Splash : logo plus petit sur fond blanc (évite bords coupés sur Android 12+)
node "$PAD" "$LOGO" "$BASE/drawable-nodpi/splash_logo.png" 512 0.62

echo "OK — icônes + splash_logo régénérés depuis $(basename "$LOGO") (marges zone sûre)."
