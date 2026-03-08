# 🚀 Comment lancer la plateforme Rapido Flash

## Étape 1 : Installer les dépendances

Ouvrez un terminal et exécutez :

```bash
# À la racine du projet
cd /Users/valentino/rapido_flash
npm install

# Puis pour le frontend
cd frontend
npm install
cd ..
```

## Étape 2 : Créer les fichiers .env

**Backend** - Créez `backend/.env` :
```
MONGODB_URI=mongodb://localhost:27017/rapido_flash
JWT_SECRET=rapido_flash_secret_key_2024_super_secure
PORT=5000
```

**Frontend** - Créez `frontend/.env` :
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Étape 3 : Vérifier MongoDB

Assurez-vous que MongoDB est en cours d'exécution :
```bash
# Sur macOS avec Homebrew
brew services start mongodb-community

# Ou vérifier si MongoDB tourne
mongosh --eval "db.version()"
```

## Étape 4 : Démarrer les serveurs

### Option 1 : Démarrer ensemble (recommandé)
```bash
npm run dev
```

### Option 2 : Démarrer séparément

**Terminal 1 - Backend :**
```bash
npm run server
```

**Terminal 2 - Frontend :**
```bash
cd frontend
npm start
```

## Étape 5 : Accéder à l'application

- **Frontend (Client)** : http://localhost:3000
- **Backend API** : http://localhost:5000/api

## ✅ Vérification

Le backend devrait afficher :
```
MongoDB connecté
Serveur démarré sur le port 5000
```

Le frontend devrait s'ouvrir automatiquement dans votre navigateur.

## 🐛 Problèmes courants

### Erreur MongoDB
Si MongoDB n'est pas installé :
```bash
brew install mongodb-community
brew services start mongodb-community
```

### Port déjà utilisé
Si le port 5000 ou 3000 est occupé, modifiez le PORT dans `backend/.env` ou arrêtez le processus qui utilise le port.

### Erreur de dépendances
Supprimez `node_modules` et réinstallez :
```bash
rm -rf node_modules frontend/node_modules
npm install
cd frontend && npm install && cd ..
```
