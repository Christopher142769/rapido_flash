#!/bin/bash

# Script pour redémarrer le serveur de développement avec un cache propre

echo "🧹 Nettoyage du cache..."
rm -rf node_modules/.cache
rm -rf .cache

echo "🔄 Redémarrage du serveur de développement..."
npm start
