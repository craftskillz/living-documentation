---
**date:** 2026-06-01
**status:** To be validated
**description:** Le dossier `scripts/` regroupe les scripts d'automatisation qui relient le build, le serveur de développement, les contrôles frontend, les hooks Git et les gates CI du projet.
**tags:** scripts, build, dev, npm, hooks, ci, readme-sync, zizmor, frontend-check, copy-assets
---

# Dossier `scripts/`

Le dossier `scripts/` contient l'outillage local du projet et sert à automatiser les tâches qui entourent le développement : préparer `dist/`, lancer un environnement de dev confortable, vérifier la syntaxe du frontend statique, et appliquer quelques garde-fous avant commit ou publication.

C'est un dossier volontairement petit : chaque script correspond à une responsabilité opérationnelle précise, appelée depuis `package.json`, depuis les hooks Git, ou depuis GitHub Actions.

## Vue d'ensemble

[![Scripts — Points d'entrée et scripts associés](/images/scripts_points_d_entr_e_et_scripts_associ_s.png)](/diagram?id=d1780343848906)