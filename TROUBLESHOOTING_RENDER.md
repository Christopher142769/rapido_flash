# Dépannage Render - Erreurs courantes

## ❌ Erreur 404 sur `/auth/login` ou autres routes API

### Symptôme
```
POST https://rapido-flash-backend.onrender.com/auth/login 404 (Not Found)
```

### Cause
La variable d'environnement `REACT_APP_API_URL` n'est pas correctement configurée ou ne se termine pas par `/api`.

### Solution

1. **Vérifiez la variable d'environnement sur Render** :
   - Allez dans votre service Static Site (frontend) sur Render
   - Cliquez sur **Environment**
   - Vérifiez que `REACT_APP_API_URL` est configurée comme suit :

   ```
   REACT_APP_API_URL=https://rapido-flash-backend.onrender.com/api
   ```

   ⚠️ **IMPORTANT** : L'URL doit se terminer par `/api` (pas juste l'URL du backend)

2. **Exemples corrects** :
   ```
   ✅ REACT_APP_API_URL=https://rapido-flash-backend.onrender.com/api
   ✅ REACT_APP_API_URL=https://votre-backend.onrender.com/api
   ```

3. **Exemples incorrects** :
   ```
   ❌ REACT_APP_API_URL=https://rapido-flash-backend.onrender.com
   ❌ REACT_APP_API_URL=https://rapido-flash-backend.onrender.com/
   ❌ REACT_APP_API_URL=http://rapido-flash-backend.onrender.com/api
   ```

4. **Après modification** :
   - Cliquez sur **Save Changes**
   - Render va automatiquement relancer un nouveau build
   - Attendez que le build soit terminé (3-5 minutes)
   - Testez à nouveau

## ❌ Erreur CORS

### Symptôme
```
Access to XMLHttpRequest at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

### Solution

1. **Vérifiez les variables d'environnement du backend** :
   - Allez dans votre service Web (backend) sur Render
   - Cliquez sur **Environment**
   - Vérifiez que les 4 URLs frontend sont configurées :

   ```
   FRONTEND_URL_1=https://votre-frontend-1.onrender.com
   FRONTEND_URL_2=https://votre-frontend-2.onrender.com
   FRONTEND_URL_3=https://votre-frontend-3.onrender.com
   FRONTEND_URL_4=https://votre-frontend-4.onrender.com
   ```

2. **Redémarrez le backend** :
   - Cliquez sur **Manual Deploy** → **Deploy latest commit**
   - Ou attendez que Render redémarre automatiquement

## ❌ Build échoue

### Symptôme
```
Failed to compile.
[eslint] ...
```

### Solution

1. **Vérifiez les logs de build** dans Render Dashboard
2. **Corrigez les erreurs** dans votre code local
3. **Poussez les corrections** sur GitHub
4. Render redéploiera automatiquement

## ✅ Checklist de configuration

### Backend (Web Service)
- [ ] `MONGODB_URI` configuré
- [ ] `JWT_SECRET` configuré
- [ ] `FRONTEND_URL_1` configuré (URL de votre frontend)
- [ ] `FRONTEND_URL_2` configuré (si vous avez un 2ème frontend)
- [ ] `FRONTEND_URL_3` configuré (si vous avez un 3ème frontend)
- [ ] `FRONTEND_URL_4` configuré (si vous avez un 4ème frontend)
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000` (ou laissez Render le définir automatiquement)

### Frontend (Static Site)
- [ ] `REACT_APP_API_URL=https://votre-backend.onrender.com/api` ⚠️ **Doit se terminer par `/api`**
- [ ] `REACT_APP_BASE_URL=https://votre-backend.onrender.com` (sans `/api`)
- [ ] Root Directory: `frontend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Publish Directory: `build`

## 🔍 Vérification rapide

Pour vérifier que votre configuration est correcte :

1. **Backend** : Testez `https://votre-backend.onrender.com/api/auth/me` (devrait retourner une erreur 401, pas 404)
2. **Frontend** : Vérifiez dans la console du navigateur que les requêtes vont vers `/api/auth/login` et non `/auth/login`

## 📞 Support

Si le problème persiste :
1. Vérifiez les logs dans Render Dashboard
2. Vérifiez la console du navigateur pour les erreurs détaillées
3. Vérifiez que toutes les variables d'environnement sont correctement configurées
