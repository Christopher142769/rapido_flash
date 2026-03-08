# Guide de déploiement du Frontend sur Render

Ce guide vous explique comment déployer le frontend React Rapido Flash sur Render.

## 📋 Prérequis

1. Un compte Render (gratuit) : [https://render.com](https://render.com)
2. Votre backend déjà déployé sur Render (ou l'URL de votre backend)
3. Votre code sur GitHub/GitLab

## 🚀 Étapes de déploiement

### 1. Préparer votre code

Assurez-vous que votre code est sur GitHub/GitLab et que tous les fichiers sont commités.

### 2. Créer un nouveau service Static Site sur Render

1. Connectez-vous à [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"Static Site"**
3. Connectez votre repository GitHub/GitLab
4. Sélectionnez le repository `rapido_flash`

### 3. Configurer le service

Remplissez les champs suivants :

- **Name** : `rapido-flash-frontend` (ou le nom de votre choix)
- **Branch** : `main` (ou votre branche principale)
- **Root Directory** : `frontend` ⚠️ **IMPORTANT** : Spécifiez `frontend` car votre frontend est dans un sous-dossier
- **Build Command** : `npm install && npm run build`
- **Publish Directory** : `build`

### 4. Configurer les variables d'environnement

Dans la section **"Environment Variables"**, ajoutez les variables suivantes :

#### Variables obligatoires :

```
REACT_APP_API_URL=https://votre-backend.onrender.com/api
```

Remplacez `https://votre-backend.onrender.com` par l'URL réelle de votre backend déployé sur Render.

```
REACT_APP_BASE_URL=https://votre-backend.onrender.com
```

Même URL que ci-dessus, mais sans `/api` à la fin (pour les images et fichiers statiques).

#### Variables optionnelles :

Si vous utilisez Kkiapay :
```
REACT_APP_KKIAPAY_PUBLIC_KEY=votre_clé_publique_kkiapay
REACT_APP_KKIAPAY_SANDBOX=true
```

Si vous utilisez Mapbox (si vous l'avez réintégré) :
```
REACT_APP_MAPBOX_TOKEN=votre_token_mapbox
```

### 5. Déployer

1. Cliquez sur **"Create Static Site"**
2. Render va automatiquement :
   - Cloner votre repository
   - Installer les dépendances (`npm install`)
   - Builder l'application (`npm run build`)
   - Servir les fichiers statiques depuis le dossier `build`
3. Attendez que le déploiement soit terminé (environ 3-5 minutes)

### 6. Vérifier le déploiement

Une fois le déploiement terminé, vous verrez :
- ✅ **Live** avec une URL comme : `https://rapido-flash-frontend.onrender.com`

Testez l'application :
- Ouvrez l'URL dans votre navigateur
- Vérifiez que l'application se charge correctement
- Testez la connexion au backend

## 🔧 Configuration avancée

### Redirection pour React Router

Render gère automatiquement les redirections pour les routes React Router. Si vous avez des problèmes avec les routes, créez un fichier `frontend/public/_redirects` :

```
/*    /index.html   200
```

### Custom Domain

1. Allez dans **Settings** → **Custom Domain**
2. Ajoutez votre domaine personnalisé
3. Suivez les instructions pour configurer le DNS

### Variables d'environnement par environnement

Vous pouvez créer plusieurs services pour différents environnements :
- **Production** : `rapido-flash-frontend-prod`
- **Staging** : `rapido-flash-frontend-staging`

Chaque service peut avoir ses propres variables d'environnement.

## ⚠️ Points importants

### Build et Performance

- Le build peut prendre 3-5 minutes
- Les fichiers statiques sont servis via un CDN global
- Le premier chargement peut être plus lent (cold start)

### Variables d'environnement

- Les variables `REACT_APP_*` sont injectées au moment du build
- **Important** : Si vous changez une variable d'environnement, vous devez redéployer pour que les changements prennent effet
- Les variables sont publiques dans le code JavaScript compilé (ne mettez jamais de secrets)

### Mise à jour du backend

Si vous changez l'URL de votre backend, mettez à jour `REACT_APP_API_URL` et redéployez le frontend.

## 🔄 Mise à jour

Pour mettre à jour votre frontend :
1. Poussez vos changements sur GitHub
2. Render détectera automatiquement les changements
3. Un nouveau build sera lancé automatiquement

Ou manuellement :
1. Allez dans **Manual Deploy** → **Deploy latest commit**

## 📝 Configuration pour 4 frontends

Si vous avez 4 frontends différents à déployer :

1. Créez **4 services Static Site** séparés sur Render
2. Chaque service peut pointer vers le même backend ou des backends différents
3. Configurez les variables d'environnement pour chaque service :
   - Frontend 1 : `REACT_APP_API_URL=https://backend.onrender.com/api`
   - Frontend 2 : `REACT_APP_API_URL=https://backend.onrender.com/api`
   - Frontend 3 : `REACT_APP_API_URL=https://backend.onrender.com/api`
   - Frontend 4 : `REACT_APP_API_URL=https://backend.onrender.com/api`

4. Assurez-vous que votre backend a bien configuré les 4 URLs dans les variables `FRONTEND_URL_1`, `FRONTEND_URL_2`, `FRONTEND_URL_3`, `FRONTEND_URL_4`

## 🐛 Dépannage

### Erreur de build

Si le build échoue :
1. Vérifiez les logs dans Render Dashboard
2. Vérifiez que toutes les dépendances sont dans `package.json`
3. Vérifiez que le `Root Directory` est bien `frontend`

### Erreur 404 sur les routes

Si les routes React ne fonctionnent pas :
1. Créez le fichier `frontend/public/_redirects` avec `/*    /index.html   200`
2. Redéployez

### Erreur de connexion au backend

Si l'application ne peut pas se connecter au backend :
1. Vérifiez que `REACT_APP_API_URL` est correctement configuré
2. Vérifiez que le backend est bien déployé et accessible
3. Vérifiez les CORS dans le backend (les 4 URLs frontend doivent être autorisées)

## 🎉 C'est tout !

Votre frontend est maintenant en ligne sur Render ! 🚀

N'oubliez pas de :
- Mettre à jour les variables d'environnement si nécessaire
- Tester toutes les fonctionnalités
- Configurer votre domaine personnalisé si vous en avez un
