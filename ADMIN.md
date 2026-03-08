# 🔐 Identifiants du compte Admin

## Compte Admin par défaut

Pour créer le compte admin, exécutez la commande suivante :

```bash
npm run create-admin
```

## Identifiants de connexion

Une fois le compte créé, utilisez ces identifiants :

- **Email**: `admin@rapido.com`
- **Mot de passe**: `admin123`

⚠️ **IMPORTANT**: Changez le mot de passe après la première connexion pour des raisons de sécurité !

## Accès au Dashboard

1. Connectez-vous avec les identifiants ci-dessus
2. Accédez au dashboard : http://localhost:3000/dashboard
3. Vous pourrez :
   - Gérer votre restaurant
   - Ajouter des plats
   - Voir les commandes
   - **Gérer les bannières** (nouvelle fonctionnalité)

## Créer un autre compte admin

Si vous souhaitez créer un autre compte avec le rôle restaurant, vous pouvez :

1. **Via l'interface** : Créer un compte normal puis modifier le rôle dans la base de données
2. **Via l'API** : Faire un POST sur `/api/auth/register` avec `role: "restaurant"`

## Notes

- Le rôle utilisé est `restaurant` car c'est le seul rôle qui donne accès au dashboard
- Tous les utilisateurs avec le rôle `restaurant` ou `gestionnaire` peuvent gérer les bannières
- Le mot de passe est automatiquement hashé lors de la création
