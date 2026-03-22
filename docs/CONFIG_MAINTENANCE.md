# Mode maintenance (site public)

## Variables `.env` (backend)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `PLATFORM_ADMIN_EMAIL` | non | Une ou plusieurs adresses email **séparées par des virgules** autorisées à activer/désactiver la maintenance depuis le dashboard. Si **non défini**, tout compte **restaurant** ou **gestionnaire** peut modifier le paramètre. |

## Comportement

- **`GET /api/app-settings/public`** : indique si la maintenance est active et le message affiché (sans authentification).
- **`PUT /api/app-settings`** : met à jour la maintenance (JWT requis ; droits selon la règle ci-dessus).

Le frontend affiche une page dédiée pour les visiteurs ; les routes **`/dashboard`** et les pages de connexion (`/login`, `/register`, `/loading`, `/welcome`, `/location`) restent accessibles.
