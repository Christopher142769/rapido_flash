# Connexion Google — app installée depuis le Play Store (erreur code 10)

L’erreur **code 10** = `DEVELOPER_ERROR` : l’empreinte **SHA-1** de l’APK installée n’est pas enregistrée chez Google.

## Important

| Source de l’app | SHA-1 à enregistrer |
|-----------------|---------------------|
| APK installée **depuis le Play Store** (test interne) | **App signing** (Play Console) |
| APK installée en local (`debug` / fichier `.apk` à la main) | Keystore **debug** ou **upload** |

L’APK du Play Store est signée par Google (**App signing**), pas par ton keystore upload seul.

---

## Étape 1 — Récupérer la SHA-1 Play Console

1. [Play Console](https://play.google.com/console) → **Rapido**
2. **Tester et publier** → **Intégrité de l’app** (ou **Configuration** → **Intégrité de l’app**)
3. Onglet **Signature d’application** / **App signing**
4. Section **Certificat de signature d’application** (App signing key certificate)
5. Copie la empreinte **SHA-1** (format `AA:BB:CC:…`)

Ajoute aussi la SHA-1 **Upload key** (certificat de téléchargement) si elle est affichée :

```
SHA-1 upload (keystore rapido-play-upload.jks) :
C5:67:84:E4:FA:BF:27:49:12:A0:AF:2D:F7:C4:16:96:C8:3A:4A:4F
```

---

## Étape 2 — Firebase (recommandé si tu utilises Firebase / FCM)

1. [Firebase Console](https://console.firebase.google.com) → projet Rapido
2. **Paramètres du projet** (engrenage) → **Vos applications**
3. Appli Android **bj.rapido.mobile**
4. **Ajouter une empreinte digitale** → colle la SHA-1 **App signing** (et l’upload si besoin)
5. Enregistrer → télécharger le nouveau **google-services.json** → remplacer `frontend/android/app/google-services.json`
6. Rebuild AAB si tu as changé `google-services.json`

---

## Étape 3 — Google Cloud (OAuth)

1. [Google Cloud Console](https://console.cloud.google.com/) → même projet que `GOOGLE_CLIENT_ID`
2. **APIs et services** → **Identifiants**
3. **Créer des identifiants** → **ID client OAuth** → **Application Android**
   - Nom : `Rapido Android Play`
   - Nom du package : `bj.rapido.mobile`
   - Empreinte SHA-1 : celle de l’**App signing** Play Console
4. Vérifier que l’ID client **Application Web** (celui dans Render `GOOGLE_CLIENT_ID` / `REACT_APP_GOOGLE_CLIENT_ID`) existe toujours
5. Sur ce client **Web** → **Origines JavaScript autorisées**, ajouter si absent :
   - `https://localhost`

Ne remplace pas le client Web par le client Android dans le code : l’app utilise le client **Web** pour le jeton ; le client **Android** sert à valider la signature de l’APK.

---

## Étape 4 — Attendre et retester

- Attendre **5 à 30 minutes** après l’enregistrement des SHA-1
- Sur le téléphone : **Paramètres** → **Applications** → Rapido → **Vider le cache**
- Relancer l’app → **Continuer avec Google**

---

## Contournement immédiat

Connexion **email / mot de passe** (compte test Play) :

- Email : `christopherguidibi@gmail.com`
- Mot de passe : `12345678`

---

## Vérifier côté Render

`GOOGLE_CLIENT_ID` sur le backend Render = même valeur que `REACT_APP_GOOGLE_CLIENT_ID` dans le build (client type **Application Web**).
