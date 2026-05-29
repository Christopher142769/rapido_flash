# Redirection Google Form → page merci

Après un envoi réussi du formulaire, le candidat doit arriver sur la page de remerciement Rapido.

## URL à configurer dans Google Forms

**Production (à utiliser dans le formulaire) :**

```
https://rapido.bj/recrutement/merci
```

Si tu utilises aussi `rapido.online`, Google Forms n’accepte qu’**une** URL de redirection : garde `rapido.bj` (la page merci fonctionne pareil).

**Test en local :**

```
http://localhost:3000/recrutement/merci
```

## Étapes dans Google Forms (à faire une fois)

1. Ouvre le formulaire en édition : [forms.gle/zbSuG4Ernog2aZdR6](https://forms.gle/zbSuG4Ernog2aZdR6) → icône **crayon** / « Modifier le formulaire ».
2. Clique sur **Paramètres** (engrenage en haut).
3. Onglet **Présentation**.
4. Coche **Rediriger vers une URL** (ou « Redirect to a URL »).
5. Colle : `https://rapido.bj/recrutement/merci`
6. Enregistre.

## Parcours candidat

1. `/recrutement` → clic **Postuler**
2. Formulaire Google (même onglet)
3. Clic **Envoyer** → Google redirige vers `/recrutement/merci` (page `merci.html`)

## Vérification

- Envoie une réponse test depuis le formulaire.
- Tu dois voir la page « Merci. Votre dossier est entre nos mains. » avec le sceau vert.

Si tu restes sur l’écran de confirmation Google sans redirection, l’option **Rediriger vers une URL** n’est pas activée ou l’URL est incorrecte.
