# Après envoi du Google Form → page merci Rapido

## Où configurer (interface actuelle)

Tu es au bon endroit sur ta capture :

1. Onglet **Settings** (Paramètres) — en haut du formulaire  
2. Section **Presentation** (Présentation) — déjà ouverte  
3. Bloc **AFTER SUBMISSION** (Après l’envoi)  
4. Ligne **Confirmation message** → cliquer **Edit** (Modifier)

C’est **ici** que tu configures le message affiché après un envoi réussi.

> **Important :** Google Forms standard **ne propose pas** de redirection automatique vers une URL externe (pas de case « Rediriger vers une URL »). Il faut soit mettre un **lien cliquable** dans le message de confirmation, soit utiliser une extension (voir plus bas).

---

## Option recommandée (gratuite) — Lien dans le message de confirmation

1. **Settings** → **Presentation** → **Confirmation message** → **Edit**
2. Remplace le texte par (ou adapte) :

```
Merci, votre candidature a bien été enregistrée.

Pour accéder à la page de confirmation Rapido, cliquez sur le lien ci-dessous :

https://rapido.bj/recrutement/merci
```

3. **Save** (Enregistrer)

Google transforme en général l’URL en lien cliquable. Le candidat clique une fois après **Envoyer** et arrive sur la page merci.

**Test :** https://rapido.bj/recrutement/merci

---

## Option redirection automatique (sans clic)

Google Forms seul ne le permet pas. Possibilités :

| Solution | Effort |
|----------|--------|
| Extension **Formfacade** (Google Workspace Marketplace) | Add-on → réglage « Redirect to a webpage » sur le bouton Envoyer |
| Formulaire hébergé sur le site (autre outil : Tally, Jotform, etc.) | Recréer le formulaire |
| Message de confirmation + lien (ci-dessus) | 2 minutes |

---

## Parcours candidat (avec lien dans le message)

`/recrutement` → **Postuler** → formulaire Google → **Envoyer** → message Google → **clic sur le lien** → `/recrutement/merci`
