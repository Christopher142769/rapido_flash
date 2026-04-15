#!/bin/bash

# Script de configuration Kkiapay pour Rapido Flash

echo "🔧 Configuration de Kkiapay pour Rapido Flash"
echo ""

# Configuration Frontend
echo "📝 Configuration du fichier frontend/.env..."
cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_KKIAPAY_PUBLIC_KEY=cf27e12e7d7320dac0b807845855b06e5f231798
REACT_APP_KKIAPAY_SANDBOX=false
EOF
echo "✅ Fichier frontend/.env créé"

# Configuration Backend
echo "📝 Configuration du fichier backend/.env..."
cat > backend/.env << EOF
MONGODB_URI=mongodb://localhost:27017/rapido_flash
PORT=5000
JWT_SECRET=your_jwt_secret_key_change_in_production
KKIAPAY_PRIVATE_KEY=your_private_key_here
KKIAPAY_SECRET=your_secret_here
EOF
echo "✅ Fichier backend/.env créé"

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📋 Clés API configurées :"
echo "   - Public Key: cf27e12e7d7320dac0b807845855b06e5f231798"
echo "   - Private Key: (set in backend/.env only)"
echo "   - Secret: (set in backend/.env only)"
echo ""
echo "⚠️  Important : Redémarrez le serveur frontend et backend pour que les changements prennent effet"
echo "   - Frontend: npm run client (ou cd frontend && npm start)"
echo "   - Backend: npm run server (ou cd backend && node server.js)"
