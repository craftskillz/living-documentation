---
type: Document
title: Scripts
description: Le dossier `scripts/` regroupe les scripts d'automatisation qui relient le build, le serveur de développement, les contrôles frontend, les hooks Git et les gates CI du projet.
tags:
  - scripts
  - build
  - dev
  - npm
  - hooks
  - ci
  - readme-sync
  - zizmor
  - frontend-check
  - copy-assets
timestamp: 2026-06-01T17:40:00Z
status: To be validated
---

Le dossier `scripts/` contient l'outillage local du projet et sert à automatiser les tâches qui entourent le développement : préparer `dist/`, lancer un environnement de dev confortable, vérifier la syntaxe du frontend statique, et appliquer quelques garde-fous avant commit ou publication.

C'est un dossier volontairement petit : chaque script correspond à une responsabilité opérationnelle précise, appelée depuis `package.json`, depuis les hooks Git, ou depuis GitHub Actions.

## Vue d'ensemble

---

### copy-assets.js

[![scripts copy-assets](/images/scripts_copy_assets.png)](/diagram?id=d1780349800332)

---

### dev.js

[![scripts dev-js](/images/scripts_dev_js.png)](/diagram?id=d1780349961347)

---

### check_readme_sync.sh

[![script check-readme-sync](/images/script_check_readme_sync.png)](/diagram?id=d1780350000793)

---

### check-workflows.sh

[![script check-workflows](/images/script_check_workflows.png)](/diagram?id=d1780350085601)

---

### check-frontend-js.js

[![Scripts check-frontend](/images/scripts_check_frontend.png)](/diagram?id=d1780343848906)

---