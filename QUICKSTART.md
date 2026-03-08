# Guide de Démarrage Rapide

## Installation rapide

### 1. Installer les dépendances

```bash
# À la racine du projet
npm install

# Dans le dossier frontend
cd frontend
npm install
cd ..
```

### 2. Configurer MongoDB

Assurez-vous que MongoDB est installé et en cours d'exécution, ou utilisez MongoDB Atlas.

### 3. Créer les fichiers .env

**Backend** (`backend/.env`):
```
MONGODB_URI=mongodb://localhost:27017/rapido_flash
JWT_SECRET=mon_secret_key_super_securise_12345
PORT=5000
```

**Frontend** (`frontend/.env`):
```
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Démarrer l'application

```bash
# Démarrer backend et frontend ensemble
npm run dev

# Ou séparément :
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
cd frontend && npm start
```

### 5. Accéder à l'application

- **Application client**: http://localhost:3000
- **API Backend**: http://localhost:5000

## Première utilisation

### Créer un compte restaurant

1. Aller sur http://localhost:3000/register
2. Créer un compte avec le rôle "restaurant" (modifier le code temporairement ou utiliser l'API)
3. Se connecter
4. Accéder au dashboard
5. Positionner le restaurant sur la carte
6. Ajouter des plats

### Créer un compte client

1. Suivre l'onboarding (loading → bienvenue → position)
2. Créer un compte
3. Explorer les restaurants et commander

## Notes importantes

- Les images des plats doivent être des URLs externes pour l'instant
- La géolocalisation nécessite HTTPS en production (ou localhost fonctionne)
- MongoDB doit être en cours d'exécution avant de démarrer le backend
