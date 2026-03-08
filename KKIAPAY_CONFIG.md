# Configuration Kkiapay - Clés API

## ✅ Clés API configurées

Les clés API Kkiapay ont été intégrées dans le code. Voici les clés utilisées :

- **Public API Key**: `261f38e09ef211f0989243766f89f726`
- **Private API Key**: `tpk_261f87009ef211f0989243766f89f726`
- **Secret**: `tsk_261f87019ef211f0989243766f89f726`

## Configuration automatique

Les clés sont déjà configurées dans le code avec des valeurs par défaut. Pour une configuration via variables d'environnement (recommandé en production), créez les fichiers suivants :

### Frontend (.env)

Créez le fichier `frontend/.env` avec le contenu suivant :

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_KKIAPAY_PUBLIC_KEY=261f38e09ef211f0989243766f89f726
REACT_APP_KKIAPAY_SANDBOX=false
```

### Backend (.env)

Créez le fichier `backend/.env` avec le contenu suivant :

```env
MONGODB_URI=mongodb://localhost:27017/rapido_flash
PORT=5000
JWT_SECRET=your_jwt_secret_key_change_in_production
KKIAPAY_PRIVATE_KEY=tpk_261f87009ef211f0989243766f89f726
KKIAPAY_SECRET=tsk_261f87019ef211f0989243766f89f726
```

## Fonctionnement

1. **Frontend** : Utilise la clé publique pour initialiser le widget de paiement Kkiapay
2. **Backend** : Les clés privées et le secret sont disponibles pour vérifier les webhooks (à implémenter si nécessaire)

## Mode Sandbox

Pour tester en mode sandbox, modifiez `REACT_APP_KKIAPAY_SANDBOX=true` dans `frontend/.env`

## Vérification

Le paiement Kkiapay est déclenché automatiquement lors de la finalisation d'une commande dans la page Checkout. Après un paiement réussi :
- La commande est automatiquement confirmée
- Le panier est vidé
- L'utilisateur est redirigé vers la page des commandes

## Script Kkiapay

Le script Kkiapay est chargé depuis : `https://cdn.kkiapay.me/k.js`
