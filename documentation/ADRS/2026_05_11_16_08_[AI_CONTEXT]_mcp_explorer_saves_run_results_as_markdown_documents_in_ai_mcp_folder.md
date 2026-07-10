---
type: ADR
title: Mcp Explorer Saves Run Results As Markdown Documents In Ai Mcp Folder
description: "Les boutons \"Run tool\" et \"Get prompt\" de la page /context enregistrent les appels MCP en documents Markdown sous DOCS_FOLDER/AI/MCP, avec un contenu structuré pour les tools : description, schéma d'entrée, requête JSON-RPC et résultat JSON ou Markdown brut selon le type retourné."
tags:
  - ai-context
  - mcp-explorer
  - /api/context/mcp-result
  - runMcpItem
  - buildToolRunMarkdown
  - mcpItemsByKind
  - inputSchema
  - tools/call
  - AI/MCP
  - markdown-result
  - json-result
  - save-as-markdown
  - indexed-naming
timestamp: 2026-05-11T16:08:00Z
status: Accepted
sources:
  - path: src/frontend/context.html
    hash: 72382f6d7dc3aff332db94c2a806c499095437453a0c0022b79fbb5d90e15221
  - path: tests/e2e/context.spec.ts
    hash: bb7da3f7fedb2e4523b4294376a01b394219baa61d6f5632cfa076664f7c6f0e
  - path: src/routes/context.ts
    hash: 17c377aa156b0c12acb31f80e1acc262316cdfc1d0a809879417846ac60d8dec
---

# Sauvegarde des appels MCP en documents Markdown

## Contexte

La page `/context` embarque un explorateur MCP avec un bouton **Run tool** / **Get prompt** par item. Les premières versions affichaient le résultat inline dans un `<pre><code>`, puis l'enregistraient sous `AI/MCP/<NNN>-<kind>-<slug>.md` pour bénéficier du viewer Markdown principal.

Ce stockage était utile mais trop pauvre pour les tools : le document généré contenait seulement la sortie. Pour comprendre ou rejouer un appel, il manquait le contexte opérationnel : description du tool, schéma d'entrée et requête effectivement envoyée. Pour les tools qui retournent du Markdown, comme `get_server_guide`, il faut aussi conserver le rendu Markdown natif au lieu de l'enfermer dans un bloc de code.

## Décision

### 1. Endpoint de sauvegarde

[src/routes/context.ts](src/routes/context.ts) expose `POST /api/context/mcp-result` avec `{ name, kind, content }` :

- `kind` vaut `"tool"` ou `"prompt"` ; toute autre valeur est rejetée.
- Le contenu est écrit dans `DOCS_FOLDER/AI/MCP`.
- Le nom suit le format `<NNN>-<kind>-<slug>.md`.
- Un même couple `(kind, slug)` réutilise son fichier existant et l'écrase avec la dernière exécution.
- La validation du nom MCP et la résolution de chemin empêchent la traversée hors du dossier de documentation.

### 2. Contenu Markdown pour les tools

[src/frontend/context.html](src/frontend/context.html) garde une table `mcpItemsByKind.tool` alimentée lors du rendu de la liste MCP. Cette table permet à `runMcpItem` de récupérer les métadonnées du tool exécuté, pas seulement son nom.

Quand `kind === "tool"`, le contenu sauvegardé est construit par `buildToolRunMarkdown(item, name, args, envelope)` et contient :

1. un titre `# MCP tool: \`<name>\`` ;
2. une section `## Description` avec la description Markdown exposée par le MCP ;
3. une section `## Schéma d'entrée` avec `inputSchema` dans un bloc `json` ;
4. une section `## Requête effectuée` avec l'appel JSON-RPC `tools/call` réellement envoyé, incluant `name` et `arguments` ;
5. une section `## Résultat` avec soit un bloc `json` quand la sortie est du JSON, soit le texte/Markdown brut quand la sortie est textuelle.

Les blocs de code JSON sont échappés via `wrapCodeBlock` afin qu'un contenu contenant des backticks ne casse pas la structure Markdown. Les résultats texte/Markdown ne sont pas placés dans un bloc de code, pour que le viewer puisse rendre les titres, listes, liens et blocs déjà présents dans la réponse.

### 3. Extraction du résultat tool

`extractToolResultForMarkdown` cherche d'abord `envelope.result.content[*]` :

- si un item texte contient du JSON valide, il est parsé pour produire un bloc JSON formaté ;
- si un item texte n'est pas du JSON, il reste une chaîne Markdown rendue telle quelle sous `## Résultat` ;
- si plusieurs fragments existent, ils sont conservés dans un tableau JSON ;
- si aucun contenu spécifique n'est disponible, la fonction retombe sur `envelope.result`, puis sur l'enveloppe complète.

Cela garde les tools JSON lisibles tout en préservant le rendu Markdown des tools documentaires comme `get_server_guide`.

### 4. Prompts inchangés

Les prompts continuent d'utiliser `formatMcpDisplayValue(envelope)`. Le besoin de structure détaillée concerne les appels `tools/call`, où le schéma d'entrée et les arguments sont nécessaires pour diagnostiquer ou rejouer l'appel.

## Conséquences

### PROS

- Les documents `AI/MCP/*-tool-*.md` deviennent des journaux rejouables : on sait quel tool a été appelé, avec quels arguments, sur quel schéma, et quel résultat a été retourné.
- La description MCP est conservée dans le document généré, ce qui évite de retourner dans la page `/context` pour comprendre l'intention du tool.
- Les résultats JSON sont formatés dans un bloc dédié, donc plus faciles à lire, copier et comparer.
- Les résultats Markdown restent rendus comme du Markdown, notamment pour `get_server_guide`.
- Le comportement prompt reste stable et évite d'imposer une structure tool à des réponses qui ne sont pas des appels `tools/call`.

### CONS

- Le fichier généré est plus long que l'ancien résultat brut.
- La description et le schéma reflètent l'état du MCP au moment du rendu de la page. Si le serveur MCP change après chargement sans rafraîchir `/context`, le document gardera les métadonnées précédemment chargées.
- Les fragments multiples ou non textuels sont regroupés en JSON, donc un tool qui mélange Markdown et contenus structurés peut perdre une partie du rendu natif.

## Validation

- `npm run build`
- `npx playwright test tests/e2e/context.spec.ts`
