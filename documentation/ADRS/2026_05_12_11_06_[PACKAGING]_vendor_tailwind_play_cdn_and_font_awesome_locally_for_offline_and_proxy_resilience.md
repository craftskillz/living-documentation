---
type: ADR
title: Vendor Tailwind Play Cdn And Font Awesome Locally For Offline And Proxy Resilience
description: Les bundles Tailwind Play CDN (`tailwindcss.js`, `tailwindcss-typography.js`) et le pack Font Awesome 6.7.2 (CSS + 8 webfonts) sont vendorés sous `src/frontend/vendor/` et référencés via `/vendor/...` pour que le frontend fonctionne derrière un proxy qui filtre les domaines `cdn.tailwindcss.com` et les binaires `.woff2` de `cdnjs.cloudflare.com`.
tags:
  - packaging
  - vendor
  - offline
  - proxy
  - tailwind
  - tailwindcss-typography
  - font-awesome
  - play-cdn
  - npx
  - copy-assets
  - license-mit
  - license-ofl
  - license-cc-by
  - superseded
timestamp: 2026-05-12T11:06:00Z
status: SuperSeeded
---

> **SuperSeeded** par [`2026_05_13_19_03_[PACKAGING]_revert_vendoring_tailwind_and_font_awesome_proxy_access_restored`](?doc=ADRS%252F2026_05_13_19_03_%255BPACKAGING%255D_revert_vendoring_tailwind_and_font_awesome_proxy_access_restored). Le proxy bloquant a été levé côté infrastructure ; le frontend est repassé sur les CDN d'origine (commits `e09a53a` et `a8d1114`). La procédure de revert documentée plus bas a été exécutée verbatim. La présente décision reste ici à titre de référence si la contrainte proxy revient un jour , le pattern de vendoring décrit ci-dessous reste réutilisable tel quel.

# Vendor Tailwind Play CDN et Font Awesome localement pour résilience offline et proxy

## Contexte

Le frontend chargeait trois familles d'assets externes au runtime :

- `https://cdn.tailwindcss.com` (Play CDN, Tailwind 4.x compilé en JIT navigateur) dans `admin.html`.
- `https://cdn.tailwindcss.com?plugins=typography` dans `index.html`, `context.html`, `diagram.html`, `shape-editor.html` et dans le template HTML d'export PDF généré par `export.js`.
- `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css` dans `index.html`. Ce CSS contient des règles `@font-face` qui pointent vers `../webfonts/fa-*.woff2` et `.ttf` sur le même CDN. C'est le navigateur lui-même qui suit ces déclarations à chaque rendu d'icône `fa-solid` / `fa-regular` / `fa-brands`.

Sur certains postes, le proxy d'entreprise bloque `cdn.tailwindcss.com` en entier, et autorise le CSS de `cdnjs.cloudflare.com` mais bloque les binaires `.woff2` , comportement classique de filtrage par type MIME / extension. Sans Tailwind, l'UI perd toute mise en forme. Sans Font Awesome, toutes les icônes apparaissent en carrés vides.

Le projet déclare déjà la convention `src/frontend/vendor/` (utilisée par `wordcloud2.js` notamment) et `scripts/copy-assets.ts` recopie récursivement `src/frontend/` → `dist/src/frontend/`. Combiné à `"files": ["dist/", "README.md"]` dans `package.json`, tout ce qui est posé dans `vendor/` est automatiquement embarqué dans le tarball npm et servi par `npx living-ai-documentation`.

Cas particulier de `export.js` : le HTML d'export PDF est injecté dans une nouvelle fenêtre via `window.open("", "_blank")` puis `document.write(...)`. La fenêtre est à `about:blank`, qui n'a pas d'origine , un path absolu `/vendor/...` ne s'y résoudrait pas. Il faut une URL absolue construite avec `window.location.origin` au moment de la génération du HTML.

## Décision

Vendorer les deux familles d'assets sous `src/frontend/vendor/` et basculer toutes les références sur des chemins locaux.

### Tailwind Play CDN

Ajout de deux bundles avec un bandeau MIT préservant le copyright Tailwind Labs :

- `src/frontend/vendor/tailwindcss.js` , bundle Play CDN de base, téléchargé depuis `https://cdn.tailwindcss.com`.
- `src/frontend/vendor/tailwindcss-typography.js` , bundle Play CDN + plugin Typography, téléchargé depuis `https://cdn.tailwindcss.com?plugins=typography`.

Substitutions :

- `admin.html` → `<script src="/vendor/tailwindcss.js"></script>`.
- `index.html`, `context.html`, `diagram.html`, `shape-editor.html` → `<script src="/vendor/tailwindcss-typography.js"></script>`.
- `export.js` → `<script src="${window.location.origin}/vendor/tailwindcss-typography.js"></script>` (URL absolue car cible `about:blank`).

### Font Awesome 6.7.2

Vendoring complet du pack pour préserver les URLs relatives `../webfonts/...` présentes dans `all.min.css` :

- `src/frontend/vendor/font-awesome/css/all.min.css` (banniere de licence Font Awesome Free 6.7.2 déjà incluse en tête de fichier).
- `src/frontend/vendor/font-awesome/webfonts/fa-brands-400.{woff2,ttf}`.
- `src/frontend/vendor/font-awesome/webfonts/fa-regular-400.{woff2,ttf}`.
- `src/frontend/vendor/font-awesome/webfonts/fa-solid-900.{woff2,ttf}`.
- `src/frontend/vendor/font-awesome/webfonts/fa-v4compatibility.{woff2,ttf}`.

Substitution : `index.html` → `<link rel="stylesheet" href="/vendor/font-awesome/css/all.min.css" />`.

La structure `css/` + `webfonts/` est strictement conservée pour que les chemins relatifs `url("../webfonts/fa-*.woff2")` du CSS résolvent correctement vers les webfonts vendorées sans patch du CSS.

### Licences

- Tailwind CSS et plugin Typography → MIT. Bandeau de copyright Tailwind Labs ajouté manuellement en tête des bundles (les builds Play CDN n'incluaient pas de bandeau visible).
- Font Awesome Free 6.7.2 → triple licence : icônes en CC BY 4.0, polices en SIL OFL 1.1, code CSS/JS en MIT. Pas d'attribution visible requise pour la version Free ; le bandeau de copyright dans `all.min.css` suffit.

Les trois licences autorisent la redistribution, y compris en SaaS et en commercial. Compatibles avec l'AGPL-3.0 du projet : les assets restent sous leurs licences d'origine, ils ne sont pas relicenciés.

### Intégration dans le packaging

Aucune modification de `package.json` ni de `scripts/copy-assets.ts` nécessaire :

- `copy-assets.ts` fait déjà un `copyFreshDir` récursif de `src/frontend/` vers `dist/src/frontend/`.
- `package.json` déclare `"files": ["dist/", "README.md"]`, donc `vendor/` part dans le tarball npm.
- Le serveur Express monte `app.use(express.static(frontendPath))`, donc `/vendor/...` est routé sur `dist/src/frontend/vendor/...` en production.

## Comment revenir en arrière

Si un proxy n'est plus un problème (et qu'on veut alléger le tarball npm d'environ 1,5 Mo), la marche à suivre est :

### Reverter Tailwind

1. Dans `src/frontend/admin.html`, remplacer `<script src="/vendor/tailwindcss.js"></script>` par `<script src="https://cdn.tailwindcss.com"></script>`.
2. Dans `src/frontend/index.html`, `context.html`, `diagram.html`, `shape-editor.html`, remplacer `<script src="/vendor/tailwindcss-typography.js"></script>` par `<script src="https://cdn.tailwindcss.com?plugins=typography"></script>`.
3. Dans `src/frontend/export.js`, ligne du script Tailwind, remplacer `${window.location.origin}/vendor/tailwindcss-typography.js` par `https://cdn.tailwindcss.com?plugins=typography`.
4. Supprimer `src/frontend/vendor/tailwindcss.js` et `src/frontend/vendor/tailwindcss-typography.js`.

### Reverter Font Awesome

1. Dans `src/frontend/index.html`, remplacer le `<link rel="stylesheet" href="/vendor/font-awesome/css/all.min.css" />` par `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />`.
2. Supprimer le dossier `src/frontend/vendor/font-awesome/` en entier.

### Vérifications post-revert

1. `npm run build` doit toujours réussir.
2. `grep -rn "/vendor/tailwindcss" src/` et `grep -rn "/vendor/font-awesome" src/` doivent ne plus rien retourner.
3. Tester le rendu : `npm run dev`, ouvrir `/`, `/admin`, `/diagram`, vérifier que Tailwind charge (texte avec `font-sans`, classes `prose`, dark mode) et que les icônes Font Awesome s'affichent.
4. Tester l'export PDF depuis l'UI pour confirmer que la nouvelle fenêtre rend correctement.

### Migration vers un build Tailwind statique (alternative future)

Plutôt que retourner sur Play CDN, on peut aussi migrer vers le pipeline officiel de Tailwind :

1. Installer `tailwindcss` + `@tailwindcss/typography` en devDependencies.
2. Créer `tailwind.config.js` avec `content: ["src/frontend/**/*.{html,js}"]` et `darkMode: "class"`.
3. Ajouter une étape `tailwindcss -i input.css -o src/frontend/vendor/tailwind.css` dans `scripts/copy-assets.ts` ou en step du `build`.
4. Remplacer les `<script>` par un `<link rel="stylesheet" href="/vendor/tailwind.css" />`.
5. Supprimer le bloc inline `tailwind.config = { darkMode: "class", ... }` dans chaque HTML (la config vit dans le fichier de config).

Cette migration sort du scope de cet ADR et nécessite son propre ADR si entreprise.

## Conséquences

### PROS

- Frontend fonctionne intégralement offline et derrière n'importe quel proxy filtrant.
- Zéro modification de `package.json`, `copy-assets.ts` ou `server.ts` , la convention `vendor/` existante est strictement appliquée.
- Bundle npm autonome : `npx living-ai-documentation` n'a plus aucune dépendance externe au runtime navigateur (le seul restant est `unpkg.com/vis-network` sur `diagram.html` et `cdnjs.cloudflare.com/highlight.js`, hors scope car non bloqués par le proxy actuel).
- Reproductibilité : Tailwind Play CDN sert toujours la dernière version, vendoré on fige la version utilisée (4.x au 2026-05-12).
- Pas d'impact licence : conserve les bandeaux de copyright dans les fichiers (MIT pour Tailwind, multi-licence pour Font Awesome).

### CONS

- Tarball npm grossit d'environ 1,5 Mo (Tailwind ~890 Ko, Font Awesome CSS + webfonts ~1 Mo) , acceptable pour un outil docs.
- Tailwind Play CDN reste un compilateur JIT navigateur, donc affiche toujours en console `cdn.tailwindcss.com should not be used in production`. C'est cosmétique mais visible. Une migration future vers le build CLI éliminerait ce warning (cf. section revert).
- Mises à jour manuelles : pour suivre une nouvelle version de Tailwind ou Font Awesome, re-télécharger les fichiers et remplacer dans `vendor/`. Aucune automatisation en place.
- Le HTML d'export PDF (`export.js`) reste couplé à `window.location.origin` ; si l'export est jamais sauvegardé sur disque et ouvert hors serveur, Tailwind ne se chargera pas. Le flux actuel ouvre la fenêtre depuis le serveur, donc pas de régression.
- La règle `playwright-coverage-through-cli` n'est pas affectée : aucun test n'imite l'environnement proxy. Une régression sur `/vendor/...` serait détectée par les tests E2E existants qui frappent le serveur réel et chargent les pages.
