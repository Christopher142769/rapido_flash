# Déploiement Hostinger (frontend + API sur un seul site Node)

Depuis cette version, le site Node Hostinger sert **à la fois** l’API (`/api`, `/uploads`, `/healthz`)
et le frontend React (`frontend/build`). Render n’est plus nécessaire.

## Réglages du site Node.js (hPanel → Websites → site → Node.js)

| Réglage | Valeur |
|---|---|
| Dépôt / branche | `Christopher142769/rapido_flash`, `main` |
| Framework | Express / Other |
| Version Node | 20.x (ou 22.x) |
| Commande d’installation | `npm install` |
| Commande de build | `npm run build` |
| Fichier d’entrée | `server.js` |

`npm run build` (racine) installe le frontend avec ses devDependencies (`react-scripts`) et le construit
avec `REACT_APP_API_URL=/api` : le site appelle l’API **sur sa propre origine**, quel que soit le domaine
(rapido.bj, rapido.online, sous-domaine Hostinger).

## Variables d’environnement

Runtime (déjà en place pour l’API) : `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, SMTP, FCM, etc.

À **ajouter** (lues au build par React — refaire un build après modification) :

- `REACT_APP_GOOGLE_CLIENT_ID` (connexion Google)
- `REACT_APP_FEDAPAY_PUBLIC_KEY`
- `REACT_APP_SITE_URL=https://www.rapido.bj`
- `REACT_APP_SITE_URL_ALT=https://www.rapido.online`
- optionnels : `REACT_APP_RAPIDO_WHATSAPP`, `REACT_APP_SHOP_WHATSAPP`, `REACT_APP_SUPPORT_EMAIL`,
  `REACT_APP_GOOGLE_CLIENT_ID_CAPACITOR`, `REACT_APP_FIREBASE_VAPID_KEY`

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
