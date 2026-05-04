Dossier réservé au JSON « compte de service » Firebase (FCM côté serveur).

--- Pourquoi Render ne « voit » pas ce fichier ---
Ce fichier est dans .gitignore : il reste sur ta machine, il n’est PAS dans le dépôt GitHub.
Le clone sur Render ne contient donc pas service-account.json. C’est voulu (sécurité).
Pour un TEST sur Render, n’essaie pas de le committer : GitHub bloque en général le push (secret scanning).

--- Test rapide sur Render (sans fichier dans Git) ---
1. Ouvre ton service-account.json en local (dans ce dossier).
2. Copie TOUT le contenu JSON (une seule « ligne » : enlève les retours à la ligne ou minifie le JSON).
3. Render → ton service backend → Environment → ajoute :
   FCM_SERVICE_ACCOUNT_JSON = <colle le JSON ici>
4. Supprime ou vide FCM_SERVICE_ACCOUNT_PATH si tu l’avais mis, pour éviter les conflits.
5. Save + redeploy, puis GET .../healthz → "fcm": true

1) En local : copie ton fichier téléchargé depuis la console Firebase ici sous le nom exact :
   service-account.json

2) Variable d’environnement backend (ex. backend/.env ou Render) :
   FCM_SERVICE_ACCOUNT_PATH=./secrets/firebase/service-account.json
   (le répertoire de travail du process Node doit être la racine du dépôt, comme avec « npm start » à la racine.)

3) Sur Render (sans mettre le secret sur GitHub) :
   - Option A (recommandée) : variable FCM_SERVICE_ACCOUNT_JSON = contenu JSON sur une ligne.
   - Option B : « Secret files » Render pour écrire le fichier sur le disque au déploiement, puis par ex. :
     FCM_SERVICE_ACCOUNT_PATH=/etc/secrets/firebase/service-account.json
     (utilise le chemin exact indiqué par Render pour ton fichier secret.)

4) Vérification après déploiement : GET https://<ton-backend>/healthz  doit afficher "fcm": true.

Ne commite jamais service-account.json : c’est une clé privée.
GitHub bloque en général le push si ce fichier est versionné (secret scanning / push protection).
Sur Render : FCM_SERVICE_ACCOUNT_JSON ou « Secret file », pas le dépôt Git.
