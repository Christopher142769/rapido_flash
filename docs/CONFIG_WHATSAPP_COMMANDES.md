# Notifications WhatsApp — nouvelles commandes

À chaque commande **Shop** ou **application**, le backend peut envoyer un message WhatsApp à l’équipe Rapido.

**Numéro par défaut :** `+229 40 31 75 68` (`22940317568` dans `.env`).

## Variables

| Variable | Description |
|----------|-------------|
| `RAPIDO_WHATSAPP` | Destinataire (chiffres avec indicatif, ex. `22940317568`). Même valeur que `REACT_APP_RAPIDO_WHATSAPP` côté frontend. |
| `CALLMEBOT_WHATSAPP_APIKEY` | **Option simple** — clé CallMeBot liée au téléphone qui reçoit les alertes. |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | **Option pro** — jeton API WhatsApp Business (Meta). |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | ID du numéro WhatsApp Business qui envoie les messages. |

Configurer **au moins une** option d’envoi (CallMeBot ou Cloud). Sinon, le texte est seulement affiché dans les logs backend (mode dev).

---

## Option A — CallMeBot (recommandé pour démarrer)

1. Sur le téléphone **+229 40 31 75 68**, ajoute le contact CallMeBot et envoie le message d’activation indiqué sur [callmebot.com](https://www.callmebot.com/blog/free-api-whatsapp-messages/).
2. Récupère ta **apikey**.
3. Dans `.env` (prod) :

```env
RAPIDO_WHATSAPP=22940317568
CALLMEBOT_WHATSAPP_APIKEY=ta_cle
```

4. Redémarre le backend et passe une commande test.

---

## Option B — WhatsApp Cloud API (Meta)

1. Compte [Meta Business](https://business.facebook.com/) + application WhatsApp.
2. Numéro Business vérifié, jeton d’accès permanent et `Phone number ID`.
3. Dans `.env` :

```env
RAPIDO_WHATSAPP=22940317568
WHATSAPP_CLOUD_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_CLOUD_PHONE_NUMBER_ID=123456789
```

**Note :** pour envoyer un message **sans** que le destinataire ait écrit récemment, Meta exige souvent un **modèle** (template) approuvé. Les messages texte libres fonctionnent dans la fenêtre de 24 h après un message du client. CallMeBot évite cette contrainte pour un numéro personnel.

---

Les messages clients (confirmation après « Suivre ma commande ») utilisent la Cloud API si elle est configurée.
