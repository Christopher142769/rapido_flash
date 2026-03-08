#!/bin/bash

# Script de démarrage pour Rapido Flash

echo "🚀 Démarrage de Rapido Flash..."

# Créer les fichiers .env si ils n'existent pas
if [ ! -f backend/.env ]; then
    echo "📝 Création de backend/.env..."
    cat > backend/.env << EOF
MONGODB_URI=mongodb://localhost:27017/rapido_flash
JWT_SECRET=rapido_flash_secret_key_2024_super_secure
PORT=5000
EOF
fi

if [ ! -f frontend/.env ]; then
    echo "📝 Création de frontend/.env..."
    cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:5000/api
EOF
fi

# Installer les dépendances si nécessaire
if [ ! -d node_modules ]; then
    echo "📦 Installation des dépendances backend..."
    npm install
fi

if [ ! -d frontend/node_modules ]; then
    echo "📦 Installation des dépendances frontend..."
    cd frontend && npm install && cd ..
fi

# Démarrer l'application
echo "✅ Démarrage des serveurs..."
npm run dev
