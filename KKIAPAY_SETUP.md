# Configuration Kkiapay

## Variables d'environnement

Pour utiliser Kkiapay, vous devez ajouter les variables suivantes dans votre fichier `frontend/.env` :

```env
REACT_APP_KKIAPAY_PUBLIC_KEY=votre_cle_publique_kkiapay
REACT_APP_KKIAPAY_SANDBOX=true
```

## Obtention des clés

1. Créez un compte sur [Kkiapay](https://kkiapay.me)
2. Accédez à votre tableau de bord
3. Récupérez votre clé publique (Public Key)
4. Pour les tests, utilisez le mode sandbox (`REACT_APP_KKIAPAY_SANDBOX=true`)

## Configuration

- **Public Key** : Votre clé publique Kkiapay
- **Sandbox** : `true` pour les tests, `false` pour la production

## Fonctionnement

Le paiement est déclenché automatiquement lors de la finalisation de la commande dans la page Checkout. Après un paiement réussi, la commande est automatiquement confirmée.
