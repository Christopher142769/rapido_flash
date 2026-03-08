# Correction du problème de secret Git

## Problème
GitHub a détecté un secret Mapbox dans le fichier `MAPBOX_SETUP.md` et a bloqué le push.

## Solution appliquée
Le token Mapbox a été remplacé par un placeholder dans `MAPBOX_SETUP.md`.

## Commandes à exécuter

Exécutez ces commandes dans votre terminal pour corriger le commit et repousser :

```bash
# 1. Ajouter le fichier corrigé
git add MAPBOX_SETUP.md

# 2. Modifier le dernier commit pour inclure la correction
git commit --amend --no-edit

# 3. Repousser avec force (car on a modifié l'historique)
git push --force-with-lease
```

## Alternative : Si vous préférez créer un nouveau commit

Si vous ne voulez pas modifier l'historique, vous pouvez créer un nouveau commit :

```bash
# 1. Ajouter le fichier corrigé
git add MAPBOX_SETUP.md

# 2. Créer un nouveau commit
git commit -m "fix: remove Mapbox token from MAPBOX_SETUP.md"

# 3. Pousser normalement
git push
```

## Note importante

Le fichier `MAPBOX_SETUP.md` contient maintenant un placeholder `votre_token_mapbox_ici` au lieu du token réel. C'est la bonne pratique pour éviter d'exposer des secrets dans le code.
