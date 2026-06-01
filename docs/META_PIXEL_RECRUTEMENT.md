# Meta Pixel — Recrutement RAPIDO

**ID pixel :** `1536465181424806`

## Pourquoi l’outil « Configuration des évènements » affiche une erreur

Sur `https://rapido.bj/recrutement`, la page Carrières est affichée dans une **iframe** (contrainte Render + React). L’outil Meta analyse uniquement la page parente (souvent vide côté boutons), pas le contenu de l’iframe — d’où le message *« Pas de bouton ni d'URL détecté »*.

Le pixel fonctionne quand même si les évènements sont envoyés en **code** (déjà en place) ou configurés **par URL** dans le Gestionnaire d’évènements.

## Configuration recommandée (sans l’outil visuel)

Dans [Meta Events Manager](https://www.facebook.com/events_manager) → votre pixel → **Configurer les évènements** → **À partir de l’activité** (ou règles personnalisées) :

| Évènement Meta | Quand | URL (contient ou égal) |
|----------------|--------|-------------------------|
| **ViewContent** | Page carrières | `/recrutement` (pas `/merci`) |
| **ViewContent** | Ouverture formulaire | `/form/formulaire-de-candidature` |
| **Lead** | Clic Postuler (code) | Évènement `Lead` envoyé au clic |
| **CompleteRegistration** | Après envoi | `/recrutement/merci` |

## Évènements envoyés automatiquement par le code

- **Page Carrières** : `ViewContent` au chargement de `carrieres.html` + relais vers la fenêtre parente
- **Clic Postuler** (Manager / Commercial / Cuisine) : `Lead` avec `content_name` du poste
- **Formulaire** : `ViewContent` sur `/form/...`
- **Merci** : `CompleteRegistration` sur `/recrutement/merci`

## Vérifier que ça marche

1. Extension navigateur **Meta Pixel Helper** sur `rapido.bj/recrutement`
2. Cliquer **Postuler** → l’URL doit passer à `/form/...` et le Helper doit montrer un **Lead**
3. Après envoi du formulaire → URL `/recrutement/merci` et évènement **CompleteRegistration**

## Domaines

- https://rapido.bj
- https://rapido.online

Vérifier que les deux domaines sont ajoutés dans les **paramètres du pixel** (domaines vérifiés / liste autorisée).
