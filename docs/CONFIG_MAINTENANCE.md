# Mode maintenance (site public)

## Variables `.env` (backend)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `PLATFORM_ADMIN_EMAIL` | non | Une ou plusieurs adresses **séparées par des virgules** : droit maintenance dashboard, modération conversations, et **destinataires des e-mails** à chaque nouvelle commande (Shop + app). Envoi via `SMTP_*` / `MAIL_FROM` (voir [CONFIG_SMTP.md](./CONFIG_SMTP.md)). Si **non défini** pour la maintenance, tout compte **restaurant** ou **gestionnaire** peut modifier le paramètre ; pour les e-mails commandes, repli local sur `rapido002026@gmail.com`. |

## Comportement

- **`GET /api/app-settings/public`** : indique si la maintenance est active et le message affiché (sans authentification).
- **`PUT /api/app-settings`** : met à jour la maintenance (JWT requis ; droits selon la règle ci-dessus).

Le frontend affiche une page dédiée pour les visiteurs ; les routes **`/dashboard`** et les pages de connexion (`/login`, `/register`, `/loading`, `/welcome`, `/location`) restent accessibles.
