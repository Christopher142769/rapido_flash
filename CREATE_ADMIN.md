# 🔐 Créer le compte Admin

Le compte admin n'existe pas encore dans la base de données. Voici plusieurs méthodes pour le créer :

## Méthode 1 : Via le script (Recommandé)

Assurez-vous que MongoDB est en cours d'exécution, puis exécutez :

```bash
npm run create-admin
```

**Identifiants créés :**
- Email: `admin@rapido.com`
- Mot de passe: `admin123`

## Méthode 2 : Via l'API d'inscription

Si le script ne fonctionne pas, créez le compte via l'API :

### Option A : Avec curl

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Administrateur",
    "email": "admin@rapido.com",
    "password": "admin123",
    "role": "restaurant"
  }'
```

### Option B : Avec Postman ou un client HTTP

1. Méthode : `POST`
2. URL : `http://localhost:5000/api/auth/register`
3. Headers : `Content-Type: application/json`
4. Body (JSON) :
```json
{
  "nom": "Administrateur",
  "email": "admin@rapido.com",
  "password": "admin123",
  "role": "restaurant"
}
```

## Méthode 3 : Via l'interface web (temporaire)

1. Allez sur http://localhost:3000/register
2. Créez un compte avec :
   - Nom: Administrateur
   - Email: admin@rapido.com
   - Mot de passe: admin123
3. **Important** : Ouvrez la console du navigateur (F12) et modifiez la requête pour ajouter `"role": "restaurant"` dans le body, ou modifiez temporairement le code frontend pour permettre la sélection du rôle.

## Méthode 4 : Directement dans MongoDB

Si vous avez accès à MongoDB :

```javascript
// Dans mongosh ou MongoDB Compass
use rapido_flash

db.users.insertOne({
  nom: "Administrateur",
  email: "admin@rapido.com",
  password: "$2a$10$rK8...", // Hash bcrypt de "admin123"
  role: "restaurant",
  createdAt: new Date()
})
```

Pour générer le hash du mot de passe, utilisez Node.js :
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('admin123', 10).then(hash => console.log(hash));
```

## Vérification

Une fois le compte créé, connectez-vous avec :
- **Email**: `admin@rapido.com`
- **Mot de passe**: `admin123`

## ⚠️ Important

Changez le mot de passe après la première connexion pour des raisons de sécurité !
