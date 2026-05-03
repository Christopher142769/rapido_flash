Icône / logo application Android (Capacitor)
===========================================

Dépose ici ton visuel source haute définition (nom libre), par exemple :
  source-logo.png   (recommandé : 1024×1024 px, contenu important dans le centre ~66 % pour l’icône adaptive)

Après passage par Android Studio « Image Asset », les fichiers générés dans le projet s’appellent en pratique :
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
