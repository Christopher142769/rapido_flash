# 🗺️ Configuration Google Maps

## Installation

La dépendance `@react-google-maps/api` a été ajoutée au `package.json`. 

Pour l'installer, exécutez :

```bash
cd frontend
npm install
```

## Configuration de la clé API

### 1. Obtenir une clé API Google Maps

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez les APIs suivantes :
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
4. Créez des identifiants (Credentials) → Clé API
5. Copiez votre clé API

### 2. Ajouter la clé dans le fichier .env

Créez ou modifiez le fichier `frontend/.env` :

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=votre_cle_api_google_maps_ici
```

### 3. Redémarrer le serveur

Après avoir ajouté la clé API, redémarrez le serveur frontend :

```bash
cd frontend
npm start
```

## Fonctionnalités utilisant Google Maps

- **Page de sélection de localisation** (`/location`) : Carte Google Maps avec recherche d'adresses
- **Modification d'adresse dans Settings** : Éditeur de localisation avec Google Maps
- **Modification d'adresse depuis Home** : Clic sur la section de localisation pour modifier

## Note importante

⚠️ **Sans la clé API Google Maps**, les cartes ne fonctionneront pas. Vous verrez un message d'avertissement.

Pour le développement local, vous pouvez utiliser une clé API avec des restrictions pour limiter les coûts.
