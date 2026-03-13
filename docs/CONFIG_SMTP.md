# Configuration SMTP (envoi du code de connexion)

Ajoute ces variables dans ton fichier **`.env`** à la racine du projet (`rapido_flash/.env`).  
Si `SMTP_HOST` et `SMTP_USER` sont renseignés, les codes de connexion sont envoyés par email. Sinon, le code s’affiche dans la console du backend.

## Variables

| Variable     | Obligatoire | Description |
|-------------|-------------|-------------|
| `SMTP_HOST` | oui        | Serveur SMTP (ex. `smtp.gmail.com`) |
| `SMTP_PORT` | non        | Port (défaut : `587`) |
| `SMTP_SECURE` | non      | `true` pour port 465, sinon `false` |
| `SMTP_USER` | oui        | Adresse email ou identifiant SMTP |
| `SMTP_PASS` | oui        | Mot de passe ou mot de passe d’application |
| `MAIL_FROM` | non        | Expéditeur affiché (défaut : valeur de `SMTP_USER`) |

---

## Exemples par fournisseur

### Gmail

1. Active la « validation en 2 étapes » sur ton compte Google.
2. Crée un **mot de passe d’application** : [Compte Google → Sécurité → Mots de passe des applications](https://myaccount.google.com/apppasswords).
3. Dans `.env` :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tonadresse@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
MAIL_FROM=Rapido Flash <tonadresse@gmail.com>
```

### Outlook / Microsoft 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tonadresse@outlook.com
SMTP_PASS=ton_mot_de_passe
MAIL_FROM=Rapido Flash <tonadresse@outlook.com>
```

### SendGrid

Dans SendGrid : API Keys → Create API Key, puis :

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=ta_cle_api_sendgrid
MAIL_FROM=Rapido Flash <noreply@votredomaine.com>
```

### Mailjet

```env
SMTP_HOST=in-v3.mailjet.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ta_cle_publique_mailjet
SMTP_PASS=ta_cle_privee_mailjet
MAIL_FROM=Rapido Flash <noreply@votredomaine.com>
```

### Brevo (ex-Sendinblue)

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ton_email_brevo
SMTP_PASS=ta_cle_smtp_brevo
MAIL_FROM=Rapido Flash <noreply@votredomaine.com>
```

---

## Vérification

1. Crée le fichier `.env` à la racine du projet (copie `.env.example` si besoin).
2. Renseigne au minimum `SMTP_HOST`, `SMTP_USER` et `SMTP_PASS`.
3. Redémarre le backend : `npm run server` ou `node backend/server.js`.
4. Sur la page de connexion, clique sur « Se connecter avec un code envoyé par email », entre ton email et envoie. L’email doit arriver (ou une erreur s’affichera dans la console du serveur).
