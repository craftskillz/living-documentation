---
type: ADR
title: Images And Codeblock Style And Alignment
description: Four boolean config flags (imageRoundedCorners, imageCentered, imageBorder, codeBlockLightTheme) added to StoredConfig let users control image and code block rendering from the admin panel; migration backfills existing .living-doc.json files on first startup after upgrade.
tags:
  - admin
  - config
  - StoredConfig
  - image-style
  - code-block
  - highlight.js
  - hljs
  - codeBlockLightTheme
  - migration
  - readAndMigrate
  - home.css
timestamp: 2026-06-06T22:32:00Z
status: To be validated
---

## Contexte

Le viewer affichait les images alignées à gauche sans style et les blocs de code toujours avec le thème sombre `github-dark` (highlight.js). Nous souhaitions offrir des images centrées, arrondies et avec un box-shadow élégant, et des blocs de code en thème clair avec fond `#f6f8fa`.

## Décision

Quatre options booléennes sont ajoutées à `StoredConfig` et exposées dans l'admin (section Appearance) :

| Clé                   | Défaut upgrade | Effet                                                  |
| --------------------- | -------------- | ------------------------------------------------------ |
| `imageRoundedCorners` | `true`         | `[&_img]:rounded-xl` sur `#doc-content`                |
| `imageCentered`       | `true`         | `[&_img]:mx-auto [&_img]:block`                        |
| `imageBorder`         | `true`         | double `box-shadow` (0 0 0 1px + 0 4px 12px)           |
| `codeBlockLightTheme` | `false`        | swap hljs stylesheet dark↔light + classes Tailwind pre |

### Implémentation image

Les classes Tailwind sont concaténées conditionnellement sur le `div#doc-content` dans `DocViewer.svelte`. Aucun CSS custom requis , les sélecteurs `[&_img]:*` de Tailwind suffisent.

### Implémentation code block

Deux `<link>` CDN coexistent dans `index.html` (ids `hljs-dark` et `hljs-light`). Un `$effect` dans `Home.svelte` réactif sur `home.codeBlockLightTheme` **et** `dark` (le `$state` local du toggle dark mode) swap leurs attributs `disabled`. La classe `ld-code-light` est posée sur `<body>` pour que les overrides CSS dans `home.css` s'appliquent uniquement en mode clair (`html:not(.dark) body.ld-code-light`).

En dark mode, les classes Tailwind `dark:prose-pre:bg-[#0d1117] dark:prose-pre:text-gray-100 dark:prose-pre:border-gray-700` reprennent le dessus, et le `$effect` remet `hljs-dark` actif.

### Migration backward-compatible

`readAndMigrate()` dans `config.ts` backfille les clés manquantes avec leurs valeurs par défaut au premier démarrage, puis réécrit le fichier (`dirty = true`). Les utilisateurs existants obtiennent les styles images activés et le thème clair désactivé sans toucher à l'admin.

### Route PUT /api/config

Les quatre clés sont ajoutées à la liste `allowed` pour passer le filtre de sécurité.

## Conséquences

- Les utilisateurs peuvent activer/désactiver chaque option indépendamment.
- Le thème clair highlight.js ne s'applique qu'en mode clair OS/navigateur , en dark mode le thème sombre est toujours utilisé.
- La syntaxe Shiki (plus fine) n'est pas reproduite : les couleurs hljs restent différentes.
- Tests : `tests/e2e/admin.spec.ts` couvre la présence, la persistance et l'application des classes CSS.
