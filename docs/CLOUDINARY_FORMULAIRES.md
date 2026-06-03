# Fichiers des formulaires (CV, PDF, images)

## Problème sur Render

Les fichiers stockés dans `backend/uploads/custom-forms/` sur le disque du serveur **disparaissent à chaque redéploiement** (disque éphémère). Les liens du type `/uploads/custom-forms/cf-xxx.jpg` renvoient alors `Cannot GET`.

## Solution

Les nouveaux envois sont uploadés sur **Cloudinary** (dossier `rapido/custom-forms`). Les URLs en base ressemblent à :

`https://res.cloudinary.com/.../rapido/custom-forms/cf-....pdf`

Elles restent valides après redéploiement.

## Variables backend (obligatoires en production)

Sur le service **backend** Render :

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

(Les mêmes que pour les images produits / médias.)

Redéployer le **backend** après ajout ou modification de ces variables.

## Récupérer les anciens fichiers (urgent)

Les fichiers sur le disque Render sont **supprimés à chaque redéploiement**. Un lien comme  
`https://rapido.bj/uploads/custom-forms/cf-xxx.jpg` renvoie **404** une fois le serveur redéployé.

### 1. Scanner la base de production et tenter le téléchargement

Sur ta machine, avec l’URI MongoDB **de production** dans `backend/.env` :

```bash
cd backend
node scripts/recoverCustomFormFiles.js
```

- Fichiers encore en ligne → sauvés dans `exports/recovered-custom-forms/`
- Puis Cloudinary + correction des liens en base :

```bash
node scripts/recoverCustomFormFiles.js --upload
```

### 2. Si tu as une copie des fichiers (backup, autre PC, export Render)

Place les fichiers `cf-....jpg` / `.pdf` dans un dossier, puis :

```bash
cd backend
node scripts/importCustomFormFilesFolder.js /chemin/vers/le/dossier
```

### 3. Autres pistes si tout est 404

- Boîtes mail qui ont reçu les notifications (liens peut‑être encore ouverts **avant** le deploy)
- Ancienne instance Render / snapshot disque (support Render)
- Demander aux candidats de renvoyer CV/PDF si introuvable

La base MongoDB ne contient que les **URLs**, pas le contenu des fichiers.

## Nouvelles soumissions

Après déploiement du backend avec `CLOUDINARY_*`, les nouveaux fichiers restent accessibles après redéploiement.
