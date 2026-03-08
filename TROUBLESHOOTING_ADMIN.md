# 🔧 Dépannage - Connexion Admin

## Problème : Impossible de se connecter avec admin@rapido.com

### Solution 1 : Créer/Réinitialiser le compte via l'API

Ouvrez un terminal et exécutez :

```bash
curl -X POST http://localhost:5000/api/admin/create-admin
```

Cette commande va :
- Créer le compte s'il n'existe pas
- Réinitialiser le mot de passe à "admin123" s'il existe déjà

### Solution 2 : Utiliser le script Node.js

```bash
npm run create-admin-direct
```

Ce script va :
- Se connecter directement à MongoDB
- Vérifier si le compte existe
- Le créer ou réinitialiser le mot de passe

### Solution 3 : Vérifier manuellement dans MongoDB

Si vous avez accès à MongoDB :

```javascript
// Dans mongosh
use rapido_flash
db.users.findOne({ email: "admin@rapido.com" })
```

Si le compte existe mais que le mot de passe ne fonctionne pas, supprimez-le et recréez-le :

```javascript
db.users.deleteOne({ email: "admin@rapido.com" })
```

Puis utilisez la Solution 1 ou 2 pour le recréer.

## Identifiants corrects

- **Email**: `admin@rapido.com` (exactement, sans espaces)
- **Mot de passe**: `admin123` (exactement, sans espaces)

## Vérifications

1. ✅ Le backend est-il en cours d'exécution sur le port 5000 ?
2. ✅ MongoDB est-il en cours d'exécution ?
3. ✅ Avez-vous créé le compte avec l'une des méthodes ci-dessus ?
4. ✅ Utilisez-vous exactement `admin@rapido.com` (pas d'espaces) ?
5. ✅ Utilisez-vous exactement `admin123` (pas d'espaces) ?

## Erreurs courantes

### "Email ou mot de passe incorrect"
- Le compte n'existe pas → Utilisez Solution 1 ou 2
- Le mot de passe a été modifié → Utilisez Solution 1 pour le réinitialiser

### "Cet email est déjà utilisé" (lors de l'inscription)
- Le compte existe déjà → Utilisez la page de connexion, pas d'inscription

### Le backend ne répond pas
- Vérifiez que le serveur tourne : `lsof -i:5000`
- Redémarrez le backend si nécessaire

## Test de connexion

Pour tester si le compte fonctionne, utilisez curl :

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rapido.com","password":"admin123"}'
```

Si ça fonctionne, vous devriez recevoir un token JWT.
