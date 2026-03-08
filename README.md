# Rapido Flash - Plateforme de Livraison

Plateforme complète de livraison de repas avec dashboard restaurant et application client.

## 🚀 Fonctionnalités

### Application Client
- ✅ Page de chargement avec logo
- ✅ Onboarding avec illustrations (bienvenue, sélection de position)
- ✅ Inscription et connexion
- ✅ Page d'accueil avec bannières et restaurants
- ✅ Sélection de position sur carte interactive
- ✅ Découverte des restaurants les plus proches
- ✅ Visualisation des menus de restaurant
- ✅ Panier d'achat
- ✅ Commande avec sélection d'adresse de livraison
- ✅ Design responsive (mobile-first)

### Dashboard Restaurant
- ✅ Carte interactive pour positionner le restaurant
- ✅ Gestion des informations du restaurant
- ✅ Création et gestion des plats (images, noms, prix)
- ✅ Gestion de la disponibilité des plats par restaurant
- ✅ Création de comptes gestionnaires
- ✅ Visualisation et gestion des commandes
- ✅ Mise à jour du statut des commandes

## 🛠️ Technologies

- **Backend**: Node.js, Express.js
- **Base de données**: MongoDB
- **Frontend**: React.js
- **Cartes**: Leaflet (OpenStreetMap)
- **Authentification**: JWT

## 📦 Installation

### Prérequis
- Node.js (v14+)
- MongoDB (local ou MongoDB Atlas)
- npm ou yarn

### Installation des dépendances

```bash
# Installer les dépendances du backend
npm install

# Installer les dépendances du frontend
cd frontend
npm install
cd ..
```

### Configuration

1. Créer un fichier `.env` à la racine du projet :

```env
MONGODB_URI=mongodb://localhost:27017/rapido_flash
JWT_SECRET=votre_secret_key_ici
PORT=5000
```

2. Pour le frontend, créer un fichier `.env` dans le dossier `frontend` :

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Démarrage

```bash
# Démarrer le backend et le frontend en même temps
npm run dev

# Ou séparément :
# Backend
npm run server

# Frontend (dans un autre terminal)
cd frontend
npm start
```

## 🎨 Design

Couleurs principales :
- **Marron** (#8B4513) - Couleur primaire
- **Jaune** (#FFD700) - Couleur secondaire
- **Blanc** (#FFFFFF) - Fond

## 📱 Utilisation

### Pour les clients
1. Accéder à `http://localhost:3000`
2. Suivre l'onboarding (loading → bienvenue → position)
3. Créer un compte ou se connecter
4. Explorer les restaurants et commander

### Pour les restaurants
1. Créer un compte avec le rôle "restaurant"
2. Se connecter et accéder au dashboard
3. Positionner le restaurant sur la carte
4. Ajouter des plats
5. Gérer les commandes

## 📁 Structure du projet

```
rapido_flash/
├── backend/
│   ├── models/          # Modèles MongoDB
│   ├── routes/          # Routes API
│   ├── middleware/      # Middleware (auth)
│   └── server.js       # Serveur Express
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── client/      # Pages client
│   │   │   └── restaurant/  # Pages dashboard
│   │   ├── components/       # Composants réutilisables
│   │   └── context/          # Context React (Auth)
│   └── public/
└── package.json
```

## 🔐 Rôles utilisateurs

- **client**: Utilisateur standard qui commande
- **restaurant**: Propriétaire de restaurant
- **gestionnaire**: Gestionnaire de restaurant (créé par le propriétaire)

## 📝 Notes

- Les images des plats peuvent être des URLs externes
- La géolocalisation utilise l'API du navigateur
- Les cartes utilisent OpenStreetMap (gratuit, pas besoin de clé API)
