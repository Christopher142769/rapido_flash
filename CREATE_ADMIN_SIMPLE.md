# 🔐 Créer le compte Admin - Méthode Simple

## ⚡ Méthode la plus rapide

Le compte admin n'existe pas encore. Créez-le en une seule commande :

### Avec curl (Terminal)

```bash
curl -X POST http://localhost:5000/api/admin/create-admin
```

### Avec votre navigateur

Ouvrez simplement cette URL dans votre navigateur :
```
http://localhost:5000/api/admin/create-admin
```

**Note** : Si vous utilisez un navigateur, vous devrez peut-être utiliser un outil comme Postman ou faire un POST avec curl car les navigateurs font des requêtes GET par défaut.

### Avec Postman ou un client HTTP

1. Méthode : `POST`
2. URL : `http://localhost:5000/api/admin/create-admin`
3. Pas besoin de body ou headers

## ✅ Identifiants créés

Une fois le compte créé, utilisez ces identifiants pour vous connecter :

- **Email**: `admin@rapido.com`
- **Mot de passe**: `admin123`

## 🔒 Important

Changez le mot de passe après la première connexion !

## 🐛 Si ça ne fonctionne pas

Assurez-vous que :
1. Le serveur backend est en cours d'exécution (port 5000)
2. MongoDB est en cours d'exécution
3. Vous n'avez pas déjà créé un compte avec cet email

Si un compte existe déjà, vous verrez le message "Un compte admin existe déjà".
