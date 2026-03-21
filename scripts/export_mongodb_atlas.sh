#!/usr/bin/env bash
set -euo pipefail

# Base du projet (racine du repo)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Export MongoDB Atlas (cloud) -> JSONL + CSV (par collection).
# Prérequis:
#   - `mongosh` et `mongoexport` installés (ex: `brew install mongosh`).
# Utilisation:
#   export MONGODB_URI='mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/DB?....'
#   ./scripts/export_mongodb_atlas.sh [DB_NAME] [OUT_DIR]
#
# Exemple:
#   export MONGODB_URI='mongodb+srv://user:pass@cluster.mongodb.net/truckers?retryWrites=true&w=majority'
#   ./scripts/export_mongodb_atlas.sh

DB_NAME="${1:-}"
OUT_DIR="${2:-}"

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "Erreur: variable d'environnement MONGODB_URI manquante." >&2
  echo "Ajoute-la: export MONGODB_URI='mongodb+srv://USER:PASSWORD@.../DB?...'" >&2
  exit 1
fi

# On force HOME dans le repo pour éviter des erreurs de log dans ton dossier home.
export HOME="$REPO_ROOT"

if [[ -z "$DB_NAME" ]]; then
  # Extraire le nom de DB depuis l'URI: .../<db>?...
  # Note: si l'URI contient d'autres slash, on suppose le format standard Atlas.
  DB_NAME="$(python3 - <<'PY'
import os, re
u=os.environ['MONGODB_URI']
m=re.search(r'/([^/?]+)\?', u)
print(m.group(1) if m else '')
PY
  )"
fi

if [[ -z "$DB_NAME" ]]; then
  echo "Erreur: impossible de déterminer le DB_NAME depuis MONGODB_URI. Passe-le en argument." >&2
  exit 1
fi

if [[ -z "$OUT_DIR" ]]; then
  OUT_DIR="exports/mongodb_atlas/${DB_NAME}_$(date +%F)"
fi

mkdir -p "$OUT_DIR"

echo "DB      : $DB_NAME"
echo "OUT DIR : $OUT_DIR"

COLL_CSV="$(
  mongosh "$MONGODB_URI" --quiet --eval "print(db.getCollectionNames().join(','))"
)"

IFS=',' read -ra COLS <<< "$COLL_CSV"

echo "Collections: ${#COLS[@]}"

for c in "${COLS[@]}"; do
  echo "Export JSONL: $c"
  # mongoexport --type=json produit une sortie "JSONL" (1 document par ligne).
  mongoexport --uri "$MONGODB_URI" \
    --db "$DB_NAME" \
    --collection "$c" \
    --type=json \
    --out "${OUT_DIR}/${c}.json"
done

echo "Conversion JSONL -> CSV..."

export OUT_DIR_OVERRIDE="$OUT_DIR"

python3 - <<'PY'
import json
import csv
import os
from pathlib import Path

outdir_path = Path(os.environ["OUT_DIR_OVERRIDE"])

def normalize_extended(x):
    # MongoDB extended JSON -> valeurs CSV-friendly
    if isinstance(x, dict):
        if len(x) == 1:
            k, v = next(iter(x.items()))
            if k in {"$oid", "$date"}:
                return v
            if k in {"$numberLong", "$numberInt", "$numberDecimal"}:
                return str(v)
            if k == "$binary":
                # { $binary: { base64: '...', subType: '00' } }
                if isinstance(v, dict) and "base64" in v:
                    return v["base64"]
                return v
            if k == "$timestamp":
                # { $timestamp: { t: ..., i: ... } }
                if isinstance(v, dict):
                    return f"{v.get('t','')}:{v.get('i','')}"
                return v
        return {kk: normalize_extended(vv) for kk, vv in x.items()}
    if isinstance(x, list):
        return [normalize_extended(vv) for vv in x]
    return x

def flatten(x, prefix="", out=None):
    if out is None:
        out = {}
    if isinstance(x, dict):
        for k, v in x.items():
            new_prefix = f"{prefix}.{k}" if prefix else str(k)
            flatten(v, new_prefix, out)
    elif isinstance(x, list):
        # Garde les tableaux en string JSON (évite explosion en colonnes)
        out[prefix] = json.dumps(x, ensure_ascii=False)
    else:
        out[prefix] = x
    return out

def iter_docs_jsonl(p: Path):
    if p.stat().st_size == 0:
        return
    with p.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield normalize_extended(json.loads(line))

for json_path in sorted(outdir_path.glob("*.json")):
    csv_path = json_path.with_suffix(".csv")
    # 1) Collecter toutes les clés aplaties
    fields = set()
    count = 0
    for doc in iter_docs_jsonl(json_path):
        count += 1
        fields.update(flatten(doc).keys())

    if count == 0:
        csv_path.write_text("", encoding="utf-8")
        print(f"Converted {json_path.name} (0 docs) -> {csv_path.name}")
        continue

    field_list = sorted(fields)

    # 2) Écrire CSV
    with csv_path.open("w", encoding="utf-8", newline="") as fcsv:
        writer = csv.DictWriter(fcsv, fieldnames=field_list, extrasaction="ignore")
        writer.writeheader()
        for doc in iter_docs_jsonl(json_path):
            flat = flatten(doc)
            row = {k: ("" if v is None else v) for k, v in flat.items()}
            writer.writerow(row)
    print(f"Converted {json_path.name} ({count} docs) -> {csv_path.name}")
PY

echo "OK: export terminé."

