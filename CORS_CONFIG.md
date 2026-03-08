# Configuration CORS pour 4 Frontends

Le backend est configuré pour accepter les requêtes depuis **4 frontends différents**.

## Configuration automatique

### En développement local
Les URLs suivantes sont automatiquement autorisées :
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`
- `http://localhost:3003`

### En production
Vous devez définir les variables d'environnement suivantes :

```env
FRONTEND_URL_1=https://votre-frontend-1.onrender.com
FRONTEND_URL_2=https://votre-frontend-2.onrender.com
FRONTEND_URL_3=https://votre-frontend-3.onrender.com
FRONTEND_URL_4=https://votre-frontend-4.onrender.com
```

## Comment ça fonctionne

Le backend vérifie automatiquement l'origine de chaque requête :
1. Si l'origine correspond à l'une des 3 URLs configurées → ✅ Autorisé
2. Si l'origine n'est pas dans la liste → ❌ Bloqué (sauf en développement local)

## Configuration sur Render

1. Allez dans votre service Render → **Environment**
2. Ajoutez les 4 variables :
   - `FRONTEND_URL_1` = URL de votre premier frontend
   - `FRONTEND_URL_2` = URL de votre deuxième frontend
   - `FRONTEND_URL_3` = URL de votre troisième frontend
   - `FRONTEND_URL_4` = URL de votre quatrième frontend
3. Cliquez sur **Save Changes**

## Exemple de configuration

Si vous avez :
- Frontend 1 : `https://rapido-client-1.onrender.com`
- Frontend 2 : `https://rapido-admin.onrender.com`
- Frontend 3 : `https://rapido-partner.onrender.com`
- Frontend 4 : `https://rapido-delivery.onrender.com`

Configurez :
```
FRONTEND_URL_1=https://rapido-client-1.onrender.com
FRONTEND_URL_2=https://rapido-admin.onrender.com
FRONTEND_URL_3=https://rapido-partner.onrender.com
FRONTEND_URL_4=https://rapido-delivery.onrender.com
```

## Notes importantes

- Les requêtes sans origine (mobile apps, Postman, etc.) sont autorisées
- En développement (`NODE_ENV !== 'production'`), toutes les origines locales sont autorisées
- Les credentials (cookies, tokens) sont supportés via `credentials: true`
- Les méthodes HTTP autorisées : GET, POST, PUT, DELETE, PATCH, OPTIONS
