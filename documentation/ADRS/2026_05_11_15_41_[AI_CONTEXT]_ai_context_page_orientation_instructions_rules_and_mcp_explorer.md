---
**date:** 2026-05-10
**status:** To be validated
**description:** Ajout d'une page /context dédiée à l'orientation des agents IA : symlinks vers les fichiers d'instructions (CLAUDE.md, AGENTS.md, MEMORY.md), CRUD de règles AI à frontmatter, et explorateur du endpoint MCP local listant tools et prompts.
**tags:** ai-context, context-engineering, orientation, instructions, claude.md, agents.md, memory.md, ai-rules, mcp-explorer, /api/context
---

# Page AI Context (orientation, règles, explorateur MCP)

## Contexte

Living Documentation servait jusqu'ici de viewer Markdown + éditeur de diagrammes. Au fil des semaines, les ADRs et le SERVER_GUIDE ont rendu explicite le fait que ce projet vit en co-écriture avec des agents IA (Claude Code, etc.). Trois manques apparaissaient pour ces agents :

- Aucune **vue centralisée** des fichiers d'orientation (`CLAUDE.md`, `AGENTS.md`, `MEMORY.md`, `project-instructions.md`) que l'utilisateur veut faire pointer vers son projet. Ces fichiers vivent souvent à la racine du repo, pas dans `documentation/`.
- Pas de format **structuré pour les règles** projet (style « pas de magic numbers », « toujours commenter pourquoi »). Les écrire en prose dans `CLAUDE.md` les rendait peu searchable et difficiles à appliquer à un sous-ensemble de fichiers.
- Aucun moyen visuel de **vérifier que le serveur MCP exposé est fonctionnel** : un agent doit savoir quelles tools et quels prompts sont disponibles sans devoir scripter un appel JSON-RPC.

## Décision

### 1. Endpoint Express `/api/context` + page `/context`

`src/routes/context.ts` expose un routeur monté sur `/api/context` qui couvre trois ressources :

- `GET /orientation` — retourne `{ instructions, rules, sourceRoot, rulesFolder }`. Les `instructions` sont la liste des `.md` du dossier `<docsFolder>/AI/` (typiquement des **symlinks** créés depuis le viewer vers des fichiers extérieurs comme `CLAUDE.md`). Les `rules` sont les `.md` de `<docsFolder>/AI/rules/`, parsées via une frontmatter dédiée.
- `POST /instructions` + `DELETE /instructions/:filename` — création d'un symlink dans `AI/` à partir d'un chemin absolu fourni, ou suppression. Le serveur valide que le fichier source existe, est un `.md` visible, et que la cible reste sous `docsFolder`.
- `POST /rules` — création d'une nouvelle règle AI à partir d'un titre, d'une sévérité, de tags et d'un corps. Le serveur génère le slug (`id`), construit la frontmatter YAML et écrit `AI/rules/<id>.md`.

`src/server.ts` monte ces routes et sert la page statique [src/frontend/context.html](src/frontend/context.html) à l'URL `/context`.

### 2. Frontmatter des règles AI

Chaque règle est un fichier Markdown autonome avec :

```
---
id: no-magic-numbers
title: No magic numbers
severity: must
description: Une phrase explicative
tags: ["clean-code", "readability"]
appliesTo: ["**/*.ts", "**/*.js"]
---
Body markdown détaillant la règle …
```

`severity` est libre (par défaut `guideline`) ; `tags` et `appliesTo` sont des arrays JSON inline. Le parseur de frontmatter est intentionnellement permissif (lignes `key: value` simples, arrays inline) pour rester lisible côté humain.

### 3. Explorateur MCP côté frontend

La page `/context` interroge l'endpoint MCP local (`POST /mcp` Streamable HTTP) pour récupérer la liste des `tools` et `prompts` exposés, puis les rend dans deux panneaux verticaux avec leur description. Le statut de connexion (transport, endpoint, état) est affiché en clair pour permettre à l'utilisateur de vérifier que son client AI verra bien le même serveur. Un bouton `Refresh` rejoue la séquence `initialize` + `tools/list` + `prompts/list`.

L'explorateur a aussi un rôle pédagogique : il montre au lecteur ce qu'un agent IA branché sur le MCP est capable de faire.

### 4. Liens dans la barre principale

Le viewer (`index.html`) reçoit un nouveau bouton `🧠 AI Context` à côté de `📁 Metadata Files` et `Admin`. Les chaînes sont ajoutées dans les deux catalogues i18n (`en.json` + `fr.json`).

## Conséquences

### PROS

- Les fichiers d'orientation IA restent à leur place naturelle (racine du repo) tout en étant accessibles depuis la page de documentation. Le symlink garantit qu'il n'y a pas de duplication.
- Les règles AI deviennent un **artefact projet versionné**, recherchable par tag, et applicable à un glob de fichiers. Elles peuvent être chargées par un agent au démarrage.
- L'explorateur MCP fait du serveur un objet observable. C'est aussi un outil de diagnostic quand un client AI ne « voit » pas les bons outils.
- L'endpoint `/api/context/orientation` peut être consommé par un futur agent qui voudrait s'auto-orienter (lire `CLAUDE.md` + `rules/*.md` en un appel).

### CONS

- Le symlink suppose un filesystem POSIX. Sur Windows non-NTFS, le `fs.symlinkSync` peut échouer ; un fallback copie serait à ajouter si le besoin émerge.
- Les règles ont leur propre frontmatter, différente de celle des ADRs. Risque de confusion ; documenté dans cette ADR pour figer la convention.
- L'explorateur MCP s'attend à `POST /mcp` Streamable HTTP. Si on bascule un jour vers un autre transport (SSE, stdio), la page devra suivre.
