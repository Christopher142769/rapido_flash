# Guide de déploiement sur Render

Ce guide vous explique comment déployer le backend Rapido Flash sur Render.

## 📋 Prérequis

1. Un compte Render (gratuit) : [https://render.com](https://render.com)
2. Un compte MongoDB Atlas (gratuit) : [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
3. Votre code sur GitHub (recommandé) ou GitLab

## 🚀 Étapes de déploiement

### 1. Préparer votre code

Assurez-vous que votre code est sur GitHub/GitLab et que tous les fichiers sont commités.

### 2. Créer un nouveau service Web sur Render

1. Connectez-vous à [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"Web Service"**
3. Connectez votre repository GitHub/GitLab
4. Sélectionnez le repository `rapido_flash`

### 3. Configurer le service

Remplissez les champs suivants :

- **Name** : `rapido-flash-backend` (ou le nom de votre choix)
- **Environment** : `Node`
- **Region** : Choisissez la région la plus proche de vos utilisateurs
- **Branch** : `main` (ou votre branche principale)
- **Root Directory** : Laissez vide (le projet est à la racine)
- **Build Command** : `npm install`
- **Start Command** : `npm start`

### 4. Configurer les variables d'environnement

Dans la section **"Environment Variables"**, ajoutez les variables suivantes :

#### Variables obligatoires :

```
NODE_ENV=production
PORT=10000
```

**Note** : Render définit automatiquement le `PORT`, mais vous pouvez le laisser à 10000 pour la compatibilité.

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rapido_flash?retryWrites=true&w=majority
```

Remplacez `username`, `password`, et `cluster` par vos vraies valeurs MongoDB Atlas.

```
JWT_SECRET=votre_clé_secrète_jwt_très_longue_et_aléatoire
```

Générez une clé aléatoire sécurisée (minimum 32 caractères). Vous pouvez utiliser :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Variables optionnelles (pour Kkiapay) :

```
KKIAPAY_PRIVATE_KEY=votre_clé_privée_kkiapay
KKIAPAY_SECRET=votre_secret_kkiapay
```

#### Variables pour CORS (pour les 4 frontends) :

```
FRONTEND_URL_1=https://votre-frontend-1.render.com
FRONTEND_URL_2=https://votre-frontend-2.render.com
FRONTEND_URL_3=https://votre-frontend-3.render.com
FRONTEND_URL_4=https://votre-frontend-4.render.com
```

Remplacez par les URLs de vos 4 frontends déployés. Si vous n'avez qu'un ou deux frontends, laissez les autres vides.

### 5. Configurer MongoDB Atlas

1. Connectez-vous à [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Allez dans **Network Access**
3. Ajoutez l'adresse IP `0.0.0.0/0` pour autoriser toutes les connexions (ou l'IP de Render si disponible)
4. Allez dans **Database Access** et créez un utilisateur avec les permissions de lecture/écriture
5. Copiez la connection string et utilisez-la dans `MONGODB_URI`

### 6. Déployer

1. Cliquez sur **"Create Web Service"**
2. Render va automatiquement :
   - Cloner votre repository
   - Installer les dépendances (`npm install`)
   - Démarrer le serveur (`npm start`)
3. Attendez que le déploiement soit terminé (environ 2-5 minutes)

### 7. Vérifier le déploiement

Une fois le déploiement terminé, vous verrez :
- ✅ **Live** avec une URL comme : `https://rapido-flash-backend.onrender.com`

Testez l'API :
```bash
curl https://votre-service.onrender.com/api/auth/me
```

## 🔧 Configuration avancée

### Auto-deploy

Par défaut, Render déploie automatiquement à chaque push sur la branche principale. Vous pouvez désactiver cela dans les paramètres.

### Health Check

Render vérifie automatiquement que votre service répond. Assurez-vous que votre serveur démarre correctement.

### Logs

Vous pouvez voir les logs en temps réel dans le dashboard Render :
- **Logs** → Voir les logs du serveur
- **Events** → Voir l'historique des déploiements

### Custom Domain

1. Allez dans **Settings** → **Custom Domain**
2. Ajoutez votre domaine personnalisé
3. Suivez les instructions pour configurer le DNS

## ⚠️ Points importants

### Stockage des fichiers

**ATTENTION** : Sur le plan gratuit de Render, le système de fichiers est **éphémère**. Les fichiers uploadés (images) seront perdus lors des redémarrages.

**Solutions** :
1. Utiliser un service de stockage cloud (AWS S3, Cloudinary, etc.)
2. Passer au plan payant de Render qui offre un stockage persistant
3. Utiliser MongoDB GridFS pour stocker les images

### Performance

- Le plan gratuit met le service en veille après 15 minutes d'inactivité
- Le premier démarrage après veille peut prendre 30-60 secondes
- Pour un service toujours actif, passez au plan payant

### Variables d'environnement sensibles

Ne commitez **JAMAIS** votre fichier `.env` dans Git. Utilisez uniquement les variables d'environnement dans Render.

## 🔄 Mise à jour

Pour mettre à jour votre service :
1. Poussez vos changements sur GitHub
2. Render détectera automatiquement les changements
3. Un nouveau déploiement sera lancé automatiquement

Ou manuellement :
1. Allez dans **Manual Deploy** → **Deploy latest commit**

## 📞 Support

En cas de problème :
1. Vérifiez les logs dans Render Dashboard
2. Vérifiez que toutes les variables d'environnement sont correctement configurées
3. Vérifiez que MongoDB Atlas autorise les connexions depuis Render

## 🎉 C'est tout !

Votre backend est maintenant en ligne sur Render ! 🚀

N'oubliez pas de mettre à jour l'URL de l'API dans votre frontend :
```javascript
REACT_APP_API_URL=https://votre-service.onrender.com/api
```
