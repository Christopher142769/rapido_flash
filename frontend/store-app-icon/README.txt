Icône / logo application Android (Capacitor)
===========================================

Fichier attendu par le script du repo (prioritaire) :
  source-logo.png   (512×512 ou 1024×1024 ; PNG ou WebP source-logo.webp)

Commande qui régénère les mipmaps + splash à partir de ce fichier (marges « zone sûre » pour éviter le rognage) :
  cd frontend && npm run android:brand

Ce script est aussi exécuté automatiquement avant `npm run android:sync` et `npm run android:studio`.

Si tu préfères Android Studio « Image Asset », les fichiers générés dans le projet s’appellent en pratique :
  ic_launcher.png
  ic_launcher_round.png
  ic_launcher_foreground.png / ic_launcher_background.png (selon gabarit)
dans les dossiers res/mipmap-* et res/mipmap-anydpi-v26/ — tu ne renommes pas à la main en dehors de ce flux.

Ensuite, dans Android Studio :
  File → New → Image Asset → Launcher Icons (Adaptive and Legacy)
  Path "Foreground layer" : ce fichier (ou copie depuis ce dossier)

Fichiers générés / à remplacer dans le projet :
  frontend/android/app/src/main/res/mipmap-*/ic_launcher.png
  frontend/android/app/src/main/res/mipmap-*/ic_launcher_round.png
  frontend/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml (adaptive)

Après modification : depuis frontend/
  npm run build && npx cap sync android

Le petit pictogramme barre de notifications (monochrome) reste dans :
  frontend/android/app/src/main/res/drawable/ic_stat_rapido.xml
