#!/usr/bin/env bash
# Affiche SHA-1 / SHA-256 pour enregistrement Firebase / Google Cloud (connexion Google native).
# Release : lit android/keystore.properties (non versionné). Sinon : keystore DEBUG local.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
PROP="$ANDROID/keystore.properties"

if ! command -v keytool &>/dev/null; then
  echo "keytool introuvable (installe un JDK et assure-toi que JAVA_HOME/bin est dans PATH)." >&2
  exit 1
fi

print_cert() {
  local ks=$1
  local alias=$2
  local storepass=$3
  local label=$4
  echo ""
  echo "=== ${label} ==="
  echo "Keystore: $ks"
  echo "Alias: $alias"
  echo ""
  # Forcer la locale JVM : sur fr_FR, keytool peut planter (MissingFormatArgumentException) à l'affichage du cert.
  keytool -J-Duser.language=en -J-Duser.country=US -list -v -keystore "$ks" -alias "$alias" -storepass "$storepass" \
    | grep -E 'SHA1:|SHA256:|Owner:|Alias name:'
}

if [[ -f "$PROP" ]]; then
  storeFile=$(grep '^storeFile=' "$PROP" | head -1 | cut -d= -f2- | tr -d '\r')
  keyAlias=$(grep '^keyAlias=' "$PROP" | head -1 | cut -d= -f2- | tr -d '\r')
  storePassword=$(grep '^storePassword=' "$PROP" | head -1 | cut -d= -f2- | tr -d '\r')
  if [[ -z "$storeFile" || -z "$keyAlias" || -z "$storePassword" ]]; then
    echo "keystore.properties incomplet : storeFile, keyAlias, storePassword requis." >&2
    exit 1
  fi
  KS="$ANDROID/$storeFile"
  if [[ ! -f "$KS" ]]; then
    KS="$ROOT/$storeFile"
  fi
  if [[ ! -f "$KS" ]]; then
    echo "Keystore introuvable pour storeFile=$storeFile (essayé $ANDROID/ et $ROOT/)." >&2
    exit 1
  fi
  print_cert "$KS" "$keyAlias" "$storePassword" "RELEASE (keystore.properties)"
  echo ""
  echo "Ajoute la ligne SHA-1 dans Firebase → Paramètres du projet → ton appli Android."
  echo "Sur Play Store, ajoute aussi la SHA-1 « App signing » depuis Play Console."
else
  echo "Pas de android/keystore.properties — empreintes du keystore DEBUG (installs locales ./gradlew installDebug uniquement)."
  DBG="${HOME}/.android/debug.keystore"
  if [[ ! -f "$DBG" ]]; then
    echo "Keystore debug absent : $DBG (lance une build debug une fois pour le créer)." >&2
    exit 1
  fi
  print_cert "$DBG" androiddebugkey android "DEBUG"
  echo ""
  echo "Pour la prod, crée keystore.properties + keystore release et relance ce script."
fi
