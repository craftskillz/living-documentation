---
type: Document
title: Demarrage De Living Documentation
sources:
  - path: bin/cli.ts
    hash: cbbf78b195d6066b97e20c1c32914fab4af3cc99fdbbd6038059880f1d9f5fbf
    commit: f762fb64a92748df7792ed4c95863e6b481716cb
    dirty: false
  - path: src/lib/cli/headerMenuPrompt.ts
    hash: 1a016eff6f72a2e2fc9268f62051b01ca9172597bb57293caa3172c0f957d528
    commit: f762fb64a92748df7792ed4c95863e6b481716cb
    dirty: false
---

1 . Pour ouvrir un dossier de documentation existant, lancez l'outil en pointant vers ce dossier. Le mieux est de versionner ce dossier au sein de votre projet :

```bash
npx living-ai-documentation ./docs
```

Le serveur démarre sur le port **4321** par défaut. Ouvrez [http://localhost:4321](http://localhost:4321) dans votre navigateur.

Pour créer un nouveau projet de documentation, lancez la commande sans chemin :

```bash
npx living-ai-documentation
```

L’outil propose d’abord les projets configurés trouvés dans le dossier courant ou un niveau en dessous. Pour une nouvelle installation, il demande le dossier à créer, vérifie qu’il est absent ou vide, puis demande la langue du starter (`en` ou `fr`). Un chemin explicite sans `.living-doc.json` déclenche aussi l’initialisation.

Dans un terminal interactif, une liste de cinq cases initialement décochées permet d’afficher Workspace, Blueprint, Graph, Survival Kit et AI Context : **↑/↓** pour naviguer, **Espace** pour cocher/décocher, **Entrée** pour valider, **Échap** ou **Ctrl+C** pour annuler. Valider sans cocher garde ces menus masqués. Sans terminal interactif, les cinq menus restent masqués sans question supplémentaire.

Admin, Home, Favoris, Diagram, Files, Templates et Agents restent visibles. Le choix est modifiable ensuite dans **Admin → Menus du header**. Les projets déjà configurés conservent leurs préférences ; leurs pages restent accessibles par URL même lorsque leur menu est masqué.

L’initialisation écrit aussi `AGENTS.md`, `CLAUDE.md` et `memory/MEMORY.md` dans le dossier parent des docs. Elle refuse d’écraser ces fichiers s’ils contiennent déjà du texte.

---

### Options disponibles

Pour connaitre toutes les options disponibles faites

```bash
npx living-ai-documentation -h
```

```
Usage: living-ai-documentation [options] [folder]

Serve a local Markdown documentation viewer over HTTP on your machine.

Arguments:
  folder                         Relative path to an existing documentation
                                 folder. Omit it to start the interactive
                                 initializer.

Options:
  -V, --version                  output the version number
  --starter-language <language>  Starter language for the interactive
                                 initializer: en or fr
  -p, --port <number>            HTTP port to listen on (1-65535) (default:
                                 "4321")
  -o, --open                     Open the viewer in the default browser after
                                 startup
  -h, --help                     display help for command
```
