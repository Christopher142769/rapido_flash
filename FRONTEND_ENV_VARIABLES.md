# Variables d'environnement Frontend

## Variables obligatoires

### `REACT_APP_API_URL`
URL de l'API backend
```
REACT_APP_API_URL=https://votre-backend.onrender.com/api
```

### `REACT_APP_BASE_URL`
URL de base du backend (pour les images et fichiers statiques)
```
REACT_APP_BASE_URL=https://votre-backend.onrender.com
```

## Variables optionnelles

### `REACT_APP_KKIAPAY_PUBLIC_KEY`
Clé publique Kkiapay (si vous utilisez Kkiapay)
```
REACT_APP_KKIAPAY_PUBLIC_KEY=votre_clé_publique_kkiapay
```

### `REACT_APP_KKIAPAY_SANDBOX`
Mode sandbox pour Kkiapay (true/false)
```
REACT_APP_KKIAPAY_SANDBOX=true
```

### `REACT_APP_MAPBOX_TOKEN`
Token Mapbox (si vous utilisez Mapbox)
```
REACT_APP_MAPBOX_TOKEN=votre_token_mapbox
```

## Configuration sur Render

1. Allez dans votre service Static Site → **Environment**
2. Ajoutez chaque variable avec sa valeur
3. Cliquez sur **Save Changes**
4. Un nouveau build sera automatiquement lancé

## ⚠️ Important

- Les variables `REACT_APP_*` sont injectées au moment du **build**
- Si vous changez une variable, vous devez **redéployer** pour que les changements prennent effet
- Les variables sont **publiques** dans le code JavaScript compilé (ne mettez jamais de secrets)

## Exemple de configuration complète

Pour un frontend connecté à un backend sur Render :

```
REACT_APP_API_URL=https://rapido-flash-backend.onrender.com/api
REACT_APP_BASE_URL=https://rapido-flash-backend.onrender.com
REACT_APP_KKIAPAY_PUBLIC_KEY=votre_clé_publique
REACT_APP_KKIAPAY_SANDBOX=false
```
