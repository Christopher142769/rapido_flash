# Déploiement Hostinger (frontend + API sur un seul site Node)

Depuis cette version, le site Node Hostinger sert **à la fois** l’API (`/api`, `/uploads`, `/healthz`)
et le frontend React (`frontend/build`). Render n’est plus nécessaire.

## Réglages du site Node.js (hPanel → Websites → site → Node.js)

| Réglage | Valeur |
|---|---|
| Dépôt / branche | `Christopher142769/rapido_flash`, `main` |
| Framework | Express / Other |
| Version Node | 22 |
| Commande d’installation | `npm install` |
| Script de build (`build_script`) | `build` (= `npm run build`) |
| Fichier d’entrée | `backend/server.js` (ou `server.js`) |

`npm run build` (racine, `scripts/buildFrontend.js`) charge le `.env` écrit par Hostinger, installe le frontend avec ses devDependencies (`react-scripts`) et le construit
avec `REACT_APP_API_URL=/api` : le site appelle l’API **sur sa propre origine**, quel que soit le domaine
(rapido.bj, rapido.online, sous-domaine Hostinger).

## Variables d’environnement

Runtime (déjà en place pour l’API) : `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, SMTP, FCM, etc.

Rien à ajouter : `REACT_APP_GOOGLE_CLIENT_ID` reprend `GOOGLE_CLIENT_ID` (même client OAuth Web),
la clé publique FedaPay a une valeur par défaut dans `Checkout.js`, les domaines SEO ont leurs défauts.
On peut surcharger au besoin avec `REACT_APP_*` (relancer un build ensuite).

Ne pas définir `REACT_APP_API_URL` / `REACT_APP_BASE_URL` sur Hostinger : le script de build les force.

## Domaines

- Domaine principal du site : `rapido.bj` (+ `www.rapido.bj`)
- Domaine parqué (alias) : `rapido.online` (+ `www.rapido.online`)
- Garder le sous-domaine `*.hostingersite.com` tant que des APK Android pointent dessus.

CORS : `rapido.bj`, `rapido.online`, leurs `www` et `*.hostingersite.com` sont acceptés en dur
dans `backend/server.js` ; en même origine, le navigateur n’envoie de toute façon pas de requête CORS.

## Comportement du serveur (`backend/utils/serveFrontend.js`)

- `/static/*` : cache 1 an `immutable` (fichiers hashés)
- `index.html`, `service-worker.js`, `manifest.json`, pages `.html` : `no-cache`
- `robots.txt`, sitemaps, images : cache 1 h
- URLs propres reprises de `_redirects` : `/politique-confidentialite`, `/privacy`, `/recrutement`,
  `/recrutement/merci`, `/shop/static/*`
- Toute autre route GET non-API → `index.html` (fallback SPA)
- Fichier avec extension introuvable ou `/static/*` absent → 404 (pas de `index.html`)
- `/api/*` inconnue → 404 JSON

## Test local

```bash
npm run build
NODE_ENV=production PORT=5077 node server.js
```

Puis ouvrir http://localhost:5077/repas.
