Dossier réservé au JSON « compte de service » Firebase (FCM côté serveur).

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
