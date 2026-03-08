# Variables d'environnement requises

## Variables obligatoires

### `MONGODB_URI`
Chaîne de connexion MongoDB Atlas
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rapido_flash?retryWrites=true&w=majority
```

### `JWT_SECRET`
Clé secrète pour signer les tokens JWT (minimum 32 caractères)
```
JWT_SECRET=votre_clé_secrète_jwt_très_longue_et_aléatoire
```

Pour générer une clé aléatoire :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `PORT`
Port sur lequel le serveur écoute (Render définit automatiquement, mais vous pouvez utiliser 10000)
```
PORT=10000
```

### `NODE_ENV`
Environnement d'exécution
```
NODE_ENV=production
```

## Variables optionnelles

### `FRONTEND_URL_1`, `FRONTEND_URL_2`, `FRONTEND_URL_3`, `FRONTEND_URL_4`
URLs des 4 frontends pour la configuration CORS
```
FRONTEND_URL_1=https://votre-frontend-1.onrender.com
FRONTEND_URL_2=https://votre-frontend-2.onrender.com
FRONTEND_URL_3=https://votre-frontend-3.onrender.com
FRONTEND_URL_4=https://votre-frontend-4.onrender.com
```

**Note** : En développement local, les URLs `http://localhost:3000`, `http://localhost:3001`, `http://localhost:3002`, et `http://localhost:3003` sont automatiquement autorisées.

### `KKIAPAY_PRIVATE_KEY`
Clé privée Kkiapay (si vous utilisez Kkiapay)
```
KKIAPAY_PRIVATE_KEY=votre_clé_privée
```

### `KKIAPAY_SECRET`
Secret Kkiapay (si vous utilisez Kkiapay)
```
KKIAPAY_SECRET=votre_secret
```

## Configuration sur Render

1. Allez dans votre service Render → **Environment**
2. Ajoutez chaque variable avec sa valeur
3. Cliquez sur **Save Changes**
4. Le service redémarrera automatiquement
