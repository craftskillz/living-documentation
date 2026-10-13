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
sources:
  - path: scripts/copy-assets.ts
    hash: 9c9ea3b5045e7fcf70f1515fd6888024a38405015b7a0845bbf08311c58a4f60
  - path: scripts/dev.js
    hash: d7fef27d9d947c9a96408cde38ea298cdb9650dc684349da28868e59bd4d41f5
  - path: scripts/check-frontend-js.js
    hash: 23b0919fac275e93dd924382ffbe16a8be08ca863e402539270b77851aa1387d
  - path: scripts/check-readme-sync.sh
    hash: 407b90db48c7e17eddc76d4b7855df829253ef42605252cd015e2fa17cd4da53
  - path: scripts/check-workflows.sh
    hash: 87fd1df9a19c4b83bfe1a30ea804fa08133d3ee6d781a66cd5c36339501d5c6c
  - path: .githooks/pre-commit
    hash: 27ca498b1ded56e7d83e09cdfcc44b5d45ad0baff29e3eef8b66ee78fa6bea91
  - path: .github/workflows/readme-sync.yml
    hash: 1f0e5a24a6dc096081262189b2fda59a0e706f670a6658c5632499588c86aaea
  - path: .github/workflows/publish.yml
    hash: 8e6afbb35b461d938ea96fe94dc53ded211e69c395536074ad5477b6b0e5f3b5
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