---
**language:** fr
---

# Living Documentation

[🇬🇧 Read in English](./README.md)

> **Un atelier local pour générer, maintenir, versionner et automatiser votre documentation.**

**Living Documentation** n'est pas un générateur de code. C'est un outil de production documentaire : Markdown local, notes, process, ADR, diagrammes, Git, agents IA, providers LLM, images générées, MCP et automatisations.

Tout reste dans vos fichiers. Vous lancez l'outil, vous ouvrez le navigateur, vous documentez. Puis vous pouvez brancher Git, vos agents, vos LLMs et vos workflows.

![npm](https://img.shields.io/npm/v/living-ai-documentation) ![Node.js](https://img.shields.io/badge/Node.js-20.19%2B-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![License](https://img.shields.io/badge/License-AGPL--3.0-blue) ![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP-purple)

```bash
npx living-ai-documentation@latest
```

![Atelier Living Documentation](./images/DOCUMENTATION/concept-01-hero-produit.png)

---

## Pourquoi l'utiliser ?

La documentation finit souvent dispersée : README, notes, tickets, captures, ADR, prompts, exports, diagrammes, conversations IA, fichiers joints. **Living Documentation** sert à remettre tout cela dans un espace local unique, lisible, versionnable et exploitable par des agents.

| Besoin             | Ce que Living Documentation apporte                                                  |
| ------------------ | ------------------------------------------------------------------------------------ |
| Écrire vite        | Éditeur Markdown, snippets, tableaux, images, fichiers joints, annotations.          |
| Structurer         | Dossiers, catégories, conventions de nommage, recherche plein texte.                 |
| Versionner         | Intégration Git, commits automatiques, comparaison visuelle, restauration par blocs. |
| Visualiser         | Éditeur de diagrammes, images, exports, liens cliquables dans les documents.         |
| Automatiser        | Workspace, providers LLM, agents réutilisables, tools MCP internes.                  |
| Garder la maîtrise | Fichiers locaux, pas de cloud imposé, pas de base de données propriétaire.           |

---

## Les fonctionnalités qui changent tout

### Documentation local-first

Vos documents sont de simples fichiers Markdown dans un dossier.

- lisibles dans n'importe quel éditeur
- versionnables avec Git
- utilisables par vos LLMs
- portables d'un projet à l'autre
- faciles à sauvegarder

![Modèle local-first](./images/DOCUMENTATION/concept-03-local-first.png)

### Git intégré, versions et restauration

Quand l'intégration Git est activée, Living Documentation peut créer un commit à chaque sauvegarde documentaire. Vous pouvez ensuite ouvrir l'historique d'un document, comparer le HEAD avec un ancien commit et restaurer des blocs précis dans le document courant.

![Git, versions et restauration](./images/DOCUMENTATION/concept-08-git-versions-restore.png)

### Workspace, LLMs et agents

Le <kbd>Workspace</kbd> permet de configurer des providers LLM et de créer des agents documentaires : traduction, correction, résumé, génération d'image, amélioration Markdown, production de brouillons, audit de documents.

Les agents peuvent travailler en mode **Chat only** ou avec les **tools MCP** de Living Documentation quand le provider les accepte.

![Workspace providers agents](./images/DOCUMENTATION/concept-07-workspace-providers-agents.png)

### Agents lancés depuis toute l'application

Une fois créés, les agents sont disponibles depuis le menu <kbd>Agents</kbd>, quelle que soit la page ouverte. Chaque exécution produit un document de run avec statut, input, réponse, et debug optionnel.

![Menu Agents](./images/DOCUMENTATION/execution_d_agents.png)

### Diagrammes et schémas

Living Documentation contient un éditeur de diagrammes intégré. Vous pouvez dessiner à la main, relier des diagrammes à des documents Markdown, exporter, ou laisser un agent proposer une première version à partir d'un document.

![Exemple de diagramme](./images/DOCUMENTATION/exemple_diagramme_documentation.png)

### Laboratoire d'automatisation agentique

Avec Workspace, MCP, les providers LLM et les tools internes, Living Documentation devient un laboratoire d'automatisation appliquée à la documentation. Vous pouvez créer des agents qui lisent un document, le transforment, génèrent une image, écrivent un compte rendu ou enrichissent votre base documentaire.

![Laboratoire agentique](./images/DOCUMENTATION/concept-12-laboratoire-agentique.png)

---

## Démarrage rapide

Nécessite **Node.js 20.19 ou plus récent**.

```bash
# Assistant interactif : crée un starter EN ou FR
npx living-ai-documentation@latest

# Ou servir un dossier existant
npx living-ai-documentation@latest ./docs

# Port explicite
npx living-ai-documentation@latest ./docs --port 4000 --open
```

Puis ouvrez :

- application : [http://localhost:4321](http://localhost:4321)
- admin : [http://localhost:4321/admin](http://localhost:4321/admin)
- MCP : [http://localhost:4321/mcp](http://localhost:4321/mcp)

Le premier lancement peut créer un starter documentaire complet, en français ou en anglais, avec des guides intégrés pour comprendre Home, Markdown, Workspace, Agents et Diagram.

> Le dossier passé au CLI doit être un chemin relatif (`./docs`, `../documentation`). Les chemins absolus et `~` sont rejetés pour garder `.living-doc.json` portable.

---

## Ce que contient l'application

| Surface               | Usage                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| <kbd>Home</kbd>       | Lire, créer, éditer, rechercher et organiser les documents Markdown.      |
| <kbd>Workspace</kbd>  | Configurer les providers LLM, MCP, agents et providers image.             |
| <kbd>Agents</kbd>     | Lancer les agents depuis n'importe quelle page.                           |
| <kbd>Diagram</kbd>    | Créer et modifier des diagrammes liés aux documents.                      |
| <kbd>Files</kbd>      | Parcourir les fichiers joints et assets documentaires.                    |
| <kbd>AI Context</kbd> | Inspecter le contexte IA, les règles, la mémoire et l'explorateur MCP.    |
| <kbd>Admin</kbd>      | Configurer thème, langue, Git, patterns, sécurité fichiers, debug agents. |

---

## Écrire dans Living Documentation

Le viewer Home est aussi un éditeur Markdown.

Fonctions utiles :

- édition inline avec sauvegarde disque
- snippets Markdown
- tableaux assistés
- arbres ASCII
- blocs repliables
- callouts
- images collées depuis le presse-papier
- fichiers joints
- annotations
- table des matières automatique
- recherche plein texte

Les fichiers sont classés par dossiers réels et par catégories extraites du nom :

```text
PROCESSUS/2026_06_30_10_00_[GUIDE]_preparer_une_reunion.md
```

Ici :

- `PROCESSUS` est le dossier
- `GUIDE` est la catégorie
- `preparer_une_reunion` est le titre

---

## Git et versions

L'intégration Git est optionnelle, mais fortement recommandée.

Elle permet :

- commits automatiques après les sauvegardes
- push désactivé ou push tous les N commits
- avertissement si Git n'est pas configuré
- détection des changements hors dossier documentaire
- bouton <kbd>Versions</kbd> sur les documents
- diff visuel entre HEAD et un commit sélectionné
- restauration de blocs depuis une ancienne version

Living Documentation ne commit que le dossier documentaire configuré. Les changements hors de ce dossier sont ignorés et signalés.

---

## Agents et MCP

Living Documentation expose un serveur MCP local sur :

```text
http://localhost:4321/mcp
```

Les agents compatibles MCP peuvent utiliser les tools internes pour :

- lister et lire les documents
- créer ou mettre à jour un document
- gérer les métadonnées
- générer des diagrammes
- générer des images via un provider image configuré
- lire le sourceRoot quand c'est nécessaire
- sauvegarder un contexte d'exécution

L'endpoint `GET /mcp` retourne les schémas live des tools et prompts disponibles. Le README ne duplique volontairement pas cette liste : elle évolue avec le produit.

### Exemple Claude Code

```bash
claude mcp add --transport http living-ai-documentation http://localhost:4321/mcp
```

### Exemple Claude Desktop

```json
{
  "mcpServers": {
    "living-ai-documentation": {
      "type": "http",
      "url": "http://localhost:4321/mcp"
    }
  }
}
```

Même endpoint pour Cursor, Continue ou tout client MCP compatible Streamable HTTP.

---

## Configuration

La configuration est stockée dans `.living-doc.json`, dans le dossier documentaire.

Exemple :

```json
{
  "filenamePattern": "YYYY_MM_DD_HH_mm_[Category]_title",
  "title": "Living Documentation",
  "theme": "system",
  "language": "fr",
  "port": 4321,
  "sourceRoot": "..",
  "extraFiles": [],
  "gitIntegration": {
    "mode": "enabled",
    "pushMode": "never",
    "pushEveryCommits": 1,
    "commitMessage": "docs: update living documentation"
  }
}
```

Points importants :

- les chemins sont stockés en relatif quand c'est possible
- `sourceRoot` sert aux tools source et aux agents
- `[Category]` est utilisé pour classer les documents
- Git peut rester non configuré, désactivé, ou activé explicitement
- les extensions de fichiers jointes peuvent être bloquées dans Admin

---

## Exports

Living Documentation sait exporter :

- un document en HTML imprimable / PDF navigateur
- un bundle HTML pour Notion ou Confluence
- un bundle Markdown complet
- des diagrammes en image ou `.drawio` selon le cas

---

## Développement local

```bash
git clone https://github.com/craftskillz/living-documentation.git
cd living-documentation
npm install
npm run dev -- ./documentation
```

En développement :

- UI Vite : [http://localhost:5174](http://localhost:5174)
- backend Express : [http://localhost:4321](http://localhost:4321)
- proxy Vite : `/api`, `/mcp`, `/images`, `/files`

Commandes utiles :

```bash
npm run build
npm run test:e2e
npm run test:coverage
npm run setup-hooks
```

Pour tester le package comme il sera publié :

```bash
npm run build
node dist/bin/cli.js ./documentation

npm pack
npx ./living-ai-documentation-*.tgz ./documentation
```

> En production, il n'y a pas de serveur Vite sur `:5174`. Le CLI sert l'UI, l'API et MCP depuis Express, sur le port configuré.

---

## Contribution

Le dépôt applique un contrat de README bilingue : si vous modifiez `README.fr.md`, vous devez aussi mettre à jour `README.md`, et inversement.

Activez les hooks locaux après le clone :

```bash
npm run setup-hooks
```

La même vérification tourne en CI via `.github/workflows/readme-sync.yml`.

---

## Licence

[AGPL-3.0](./LICENSE), © Youssef MEDAGHRI-ALAOUI.
