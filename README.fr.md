---
**language:** fr
---

# Living Documentation

[🇬🇧 Read in English](./README.md)

> **Hub local de documentation Markdown avec serveur MCP intégré , vos agents de code créent les ADR, dessinent les diagrammes et détectent la dérive pendant que vous codez.**

Du Markdown sur disque, pas de cloud, pas de base de données, pas d'étape de build. Pointez l'outil vers un dossier, ouvrez `http://localhost:4321`. Branchez n'importe quel agent IA compatible MCP (Claude Code, Claude Desktop, Cursor…) et votre documentation se maintient à mesure que le code évolue.

![npm](https://img.shields.io/npm/v/living-ai-documentation) ![Node.js](https://img.shields.io/badge/Node.js-20.19%2B-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![License](https://img.shields.io/badge/License-AGPL--3.0-blue) ![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP-purple)

```bash
npx living-ai-documentation@latest                # assistant interactif (EN/FR)
npx living-ai-documentation@latest ./docs         # servir un dossier existant
```

![Viewer Living Documentation](/images/living_documentation.jpg)

---

## Deux façons de l'utiliser

### 1. Avec un agent de code IA , la fonctionnalité phare

Living Documentation embarque un **serveur MCP** sur `POST /mcp`. N'importe quel agent compatible MCP peut lire, créer et auditer la documentation de votre projet de façon autonome.

| Vous dites…                                                  | L'agent déclenche…            | Ce qui se passe                                                                                                                                             |
| ------------------------------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _« feature done »_ / _« feature terminée »_                  | `create-adr`                  | Cherche les ADR existants, supplante l'ADR obsolète s'il y en a un, écrit un nouvel ADR en `To be validated`, attache les fichiers source via les métadonnées. |
| _« audit the ADRs »_ / _« vérifie la fiabilité des ADR »_    | `audit-adrs-drift`            | Liste chaque ADR sous 80 % de fiabilité et remet chacun en cohérence , re-baseline ou supersession après votre confirmation.                                |
| _« review this ADR »_ / _« vérifie la pertinence de cet ADR »_ | `review-adr-relevance`        | Examine un seul ADR à la lumière des fichiers source liés ; rafraîchit les hashes ou propose la supersession.                                               |
| _« backfill ADRs from git »_ / _« retrodocumente depuis git »_ | `retrodocument-adrs-from-git` | Parcourt l'historique git du plus ancien au plus récent et crée des ADR pour les décisions durables qui n'ont jamais été documentées.                       |
| _« give me the big picture »_                                | `generate-context-diagram`    | Crée un diagramme C4 de contexte **dérivé des documents**, jamais inventé.                                                                                  |

**Tous les nouveaux ADR atterrissent en `To be validated`.** _Vous_ les promouvez. L'agent ne promeut jamais à votre place.

### 2. En solo, sans IA

Un hub de documentation personnel : ADR, notes de réunion, journaux de développement, plans de fonctionnalités, esquisses d'architecture , tout reste en Markdown sur disque, git-friendly, zéro vendor lock-in. Édition inline, snippets, collage d'image, pièces jointes, éditeur de diagrammes, recherche plein-texte, export PDF/HTML/Notion/Confluence.

Les deux modes se mélangent librement : prenez des notes en solo toute la semaine, puis laissez votre agent enregistrer l'ADR quand la fonctionnalité est effectivement livrée.

---

## Démarrage rapide

```bash
# Assistant interactif , crée un dossier de doc de démarrage (EN ou FR), scaffold
# AGENTS.md / CLAUDE.md / memory/MEMORY.md à la racine du projet et crée des symlinks
# dans <docs>/AI/ pour que les agents IA les trouvent.
npx living-ai-documentation@latest

# Ou servir un dossier existant
npx living-ai-documentation@latest ./docs
npx living-ai-documentation@latest ./docs --port 4000 --open
```

Ensuite ouvrez [http://localhost:4321](http://localhost:4321) (viewer) et [http://localhost:4321/admin](http://localhost:4321/admin) (config).

> L'argument du dossier doit être un **chemin relatif** (`./docs`, `../shared/docs`…). Les chemins absolus et `~` sont rejetés pour que le fichier `.living-doc.json` généré reste portable et puisse être commité.

### Installation

Nécessite **Node.js 20.19 ou plus récent** (Vite 8 et Commander 14 ne prennent plus en charge Node.js 18).

```bash
npx living-ai-documentation@latest                 # zéro installation
npm install -g living-ai-documentation      # global
```

---

## Connectez votre agent IA

### Claude Code

```bash
claude mcp add --transport http living-ai-documentation http://localhost:4321/mcp
```

Ou manuellement dans `.claude/settings.json` :

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

### Claude Desktop

Dans `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS), puis redémarrez :

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

### Cursor, Continue, tout client MCP

Utilisez le même endpoint HTTP : `http://localhost:4321/mcp` (transport Streamable HTTP, sans état).

> Le serveur Living Documentation doit être lancé en premier (`npx living-ai-documentation@latest ./docs`) avant que l'agent ne se connecte.

---

## Concepts clés

- **Markdown sur disque** , chaque document est un fichier `.md`. La configuration vit dans `.living-doc.json` à côté. Les deux sont git-friendly.
- **Pattern de nom de fichier** , par défaut `YYYY_MM_DD_HH_mm_[Category]_title.md`. Le pattern est configurable ; la date, la catégorie et le titre sont extraits. Les fichiers qui ne correspondent pas apparaissent sous **General**.
- **Dossiers → catégories → docs** dans la barre latérale. Les noms de dossiers deviennent les libellés ; les préfixes numériques (`1_TUTORIAL`, `2_REFERENCE`) contrôlent l'ordre sans s'afficher dans l'UI.
- **Les ADR** sont l'enregistrement canonique des décisions. Le serveur MCP impose un frontmatter normalisé (`**date:**`, `**status:**`, `**description:**`, `**tags:**`) et un statut initial `To be validated` que seul un humain peut promouvoir.
- **`sourceRoot`** pointe vers le code du projet. Les tools MCP source (`list_source_files`, `read_source_file`, `search_source`) et l'attache de métadonnées en dépendent. Valeur par défaut : le parent du dossier de documentation.
- **Métadonnées de fichiers source + jauge de fiabilité** , liez un document aux fichiers source qu'il décrit. Chaque liaison stocke un SHA-256. La jauge dans l'en-tête du document (`🔴 → 🟡 → 🟢`) reflète le ratio `unchanged / total`. Dès qu'un fichier lié est modifié ou supprimé, la dérive est visible. Les **god files** (`package.json`, lock files, manifests, barrels) sont exclus par convention.
- **Les diagrammes sont des vues dérivées** , ils citent les documents sur lesquels ils s'appuient (`evidence`). Ils ne peuvent pas introduire des concepts absents de la documentation.

---

## Référence MCP

### Tools (19)

| Groupe                 | Tool                          | Description                                                                                                                                   |
| ---------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding             | `get_server_guide`            | Retourne le guide du serveur : workflow, conventions, règles de diagrammes.                                                                   |
| Documents              | `list_documents`              | Inventaire : `id`, `title`, `category`, `folder`, `linkHref`.                                                                                 |
|                        | `read_document`               | Contenu Markdown brut d'un document.                                                                                                          |
|                        | `create_document`             | Crée un nouveau fichier `.md` (nom de fichier dérivé du pattern configuré, paramètre `date` optionnel pour la rétrodocumentation).            |
|                        | `update_document`             | Écrase un document existant (correction de dérive, supersession).                                                                             |
| Diagrammes             | `list_diagrams`               | Liste les diagrammes sauvegardés.                                                                                                             |
|                        | `read_diagram`                | Lit les nœuds + arêtes d'un diagramme.                                                                                                        |
|                        | `create_diagram`              | Crée / écrase un diagramme (garde-fous côté serveur appliquent la progression C4 et les labels d'arêtes).                                     |
| Code source (fallback) | `list_source_files`           | Liste les fichiers sous `sourceRoot` (ignore : `node_modules`, `dist`, `.git`…).                                                              |
|                        | `read_source_file`            | Lit un fichier sous `sourceRoot`.                                                                                                             |
|                        | `search_source`               | Recherche texte de type grep sous `sourceRoot`.                                                                                               |
| Métadonnées            | `list_metadata`               | Liaisons de fichiers source d'un document.                                                                                                    |
|                        | `get_accuracy`                | Statut par entrée (`unchanged` / `modified` / `missing`) + accuracy pondérée ∈ [0, 1].                                                        |
|                        | `add_metadata`                | Lie un fichier source (chemin sous `sourceRoot`), enregistre le SHA-256. **Ignore les god files.**                                            |
|                        | `remove_metadata`             | Détache une liaison (idempotent , pour les renommages/suppressions).                                                                          |
|                        | `refresh_metadata`            | Re-hashe chaque liaison (re-baseline après une mise à jour).                                                                                  |
| Audit ADR              | `list_adrs_below_accuracy`    | Jusqu'à 10 ADR dont l'accuracy < 80 %, triés du plus dégradé au moins dégradé. Exclut `SuperSeeded` et les non-ADR.                           |
|                        | `review_adr_relevance`        | Rapport factuel sur un ADR + fichiers en dérive à relire. Retourne un `state` qui pilote l'arbre de décision du LLM.                          |
| Rétrodocumentation     | `retrodocument_adrs_from_git` | Jusqu'à 200 commits git (du plus ancien) classés `candidate` / `trivial` / `merge`, avec flags god-file. Pour backfiller les ADR manquants.   |

### Prompts (10)

| Groupe           | Prompt                        | Quand                                                                                                                  |
| ---------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Cycle de vie ADR | `create-adr`                  | Une fonctionnalité vient d'être implémentée ou modifiée. Enregistre la décision, supplante un ADR antérieur le cas échéant. |
|                  | `audit-adrs-drift`            | Audit par lot : ramener chaque ADR en dérive à un état clair (re-baseline ou supersession confirmée par l'utilisateur). |
|                  | `review-adr-relevance`        | Examen d'un seul ADR à la lumière des fichiers source liés.                                                             |
|                  | `retrodocument-adrs-from-git` | Backfill d'ADR depuis l'historique git quand le projet en manque.                                                       |
| Diagrammes       | `generate-context-diagram`    | DÉFAUT. Diagramme C4 de contexte, gardé côté serveur.                                                                   |
|                  | `generate-container-diagram`  | Sur demande explicite uniquement. Diagramme C4 de conteneur d'un système.                                                |
|                  | `generate-uml-diagram`        | Sur demande explicite uniquement. UML classe/séquence/état/activité/cas d'utilisation.                                   |
|                  | `generate-screen-guide`       | Sur demande explicite uniquement. Capture d'écran annotée avec callouts post-it.                                         |
|                  | `update-diagram-from-docs`    | Relit les documents source pour mettre à jour les diagrammes existants.                                                  |
|                  | `flow`, `erd`                 | Diagrammes de flux linéaire / entité-relation.                                                                            |

Un `GET http://localhost:4321/mcp` retourne les schémas live des tools + prompts pour inspection.

---

## Fonctionnalités d'édition

- **Éditeur inline** , éditez n'importe quel document dans le navigateur, sauvegarde instantanée sur disque.
- **Panneau Snippets** (`🧩 Snippets`) , constructions Markdown préfabriquées au curseur : blocs repliables, liens (intra-doc, inter-doc, ancre), listes, blocs de code, blockquotes, séparateurs, images. Plus un **éditeur de tableaux** (grille dynamique → tableau Markdown aligné) et un **éditeur d'arborescence** (indentation → arbre ASCII avec `├──` / `└──`). Sélectionner un snippet existant **détecte son type** et pré-remplit le formulaire pour édition.
- **Collage d'image** , collez depuis le presse-papier pendant l'édition, auto-upload vers `<docs>/images/`, inséré en Markdown.
- **Pièces jointes** , glissez, déposez, collez ou choisissez tout fichier non-image (PDF, archive, document bureautique). Uploadé sous `<docs>/files/`, inséré comme un pill trombone. Extensions bloquées et limites de taille configurables dans l'Admin.
- **Recherche plein-texte** , filtre instantané par nom de fichier + recherche serveur dans le contenu ; pour chaque fichier, liste chaque occurrence, les surligne et permet de naviguer vers elles.
- **Préfixe de recherche `metadata://<nomdefichier>`** , recherche inversée : quels documents référencent cette pièce jointe ?
- **Annotations** , marqueurs de surlignage persistants par document (jaune / rose / vert / bleu).
- **Navigation par ancre** , `[label](#heading-slug)` scrolle correctement après rendu asynchrone ; IDs auto-générés.
- **Mode sombre** , suit la préférence système, basculable manuellement. Coloration syntaxique toujours en mode sombre.

![Sidebar groupé par dossier → catégorie](/images/readme-sidebar.png)

![Recherche plein-texte](/images/readme-intelligent-search-demo.jpg)

---

## Éditeur de diagrammes

Éditeur de diagrammes canvas intégré (vis-network), accessible via `/diagram?id=...`.

- **Progression C4 imposée** , contexte d'abord (défaut), conteneur/composant uniquement sur demande explicite. UML sur demande explicite.
- **`kind` architectural vs `renderAs` visuel** , sépare le concept (`software_system`, `database`, `queue`, `api`, `cloud_service`…) de la forme (`box`, `ellipse`, `database`, `actor`, `post-it`…). Le MCP choisit des valeurs par défaut pertinentes pour chaque `kind`.
- **Provenance documentaire (`evidence`)** , chaque nœud/arête architectural peut citer le document et la section qui le justifient. L'éditeur signale les warnings d'evidence manquante.
- **Bibliothèques de formes personnalisées** sur `/shape-editor` , définissez vos propres formes (icônes SVG, ports, couleurs par défaut) et réutilisez-les dans tous les diagrammes.
- **Ports** pour arêtes ancrées, **guides d'alignement**, **undo/redo**, **snap-to-grid**, **collage d'images**, **export PNG**, **deep-link** vers un diagramme par id.

---

## Organisation des fichiers

```
docs/
├── 2024_01_15_09_30_[DevOps]_deploy.md          → catégorie : DevOps
├── 1_tutorial/                                   → dossier : Tutorial (préfixe caché dans l'UI)
│   └── 2024_03_01_10_00_[Onboarding]_setup.md   → dossier : Tutorial / catégorie : Onboarding
├── adrs/
│   └── 2024_04_01_10_15_[Architecture]_event_sourcing.md
└── 2_reference/
    └── api.md                                    → dossier : Reference / catégorie : General
```

- Le tag `[Category]` est extrait du nom de fichier quel que soit le dossier.
- Les fichiers sans `[Category]` tombent sous **General**. **General** est toujours rendu en premier.
- Les dossiers sont triés alphabétiquement , préfixez par `1_`, `2_`… pour forcer un ordre ; le préfixe est caché dans l'UI mais visible au survol.
- L'imbrication de sous-dossiers est supportée récursivement.

![Pattern de nom de fichier](/images/readme-filename-pattern.png)

---

## Configuration (`.living-doc.json`)

Créé automatiquement dans votre dossier de documentation au premier lancement. Modifiable depuis l'Admin ou à la main.

```json
{
  "filenamePattern": "YYYY_MM_DD_HH_mm_[Category]_title",
  "title": "Living Documentation",
  "theme": "system",
  "port": 4321,
  "extraFiles": ["../README.md", "../CLAUDE.md"],
  "sourceRoot": "../src",
  "blockedFileExtensions": [".exe", ".bin"]
}
```

| Champ                   | Rôle                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `filenamePattern`       | Convention de nom de fichier utilisée pour extraire date / catégorie / titre. Le token `[Category]` est obligatoire, exactement une fois.        |
| `extraFiles`            | Fichiers Markdown ordonnés **hors** du dossier docs (ex. `README.md`, `CLAUDE.md`). Affichés en premier dans General.                            |
| `sourceRoot`            | Où vit votre code (relatif au dossier docs). Défaut : `..`. Utilisé par les tools MCP source + métadonnées.                                      |
| `blockedFileExtensions` | Liste de sécurité des extensions de pièces jointes, éditable depuis l'Admin.                                                                     |

**Tous les chemins sont relatifs POSIX** pour que `.living-doc.json` reste portable. Les chemins absolus legacy sont migrés silencieusement à la première lecture.

![Extra files](/images/readme-extra-files.png)

---

## Export

| Format                  | Endpoint                    | Notes                                                              |
| ----------------------- | --------------------------- | ------------------------------------------------------------------ |
| PDF (par document)      | `POST /api/export/html`     | Boîte de dialogue d'impression du navigateur depuis le HTML rendu. |
| HTML , mode Notion      | `POST /api/export/html`     | Bundle HTML unique adapté à l'import Notion.                       |
| HTML , mode Confluence  | `POST /api/export/html`     | Bundle HTML zippé adapté à l'import Confluence.                    |
| Bundle Markdown         | `POST /api/export/markdown` | Zip de tous les documents avec liens normalisés.                   |

---

## Surfaces de l'UI

| URL             | Page                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `/`             | Viewer , sidebar, rendu de document, édition inline, snippets, recherche, pièces jointes.                  |
| `/admin`        | Config , titre, thème, pattern de nom de fichier, extra files, source root, liste de sécurité des fichiers. |
| `/diagram?id=`  | Éditeur de diagrammes (vis-network) avec conventions C4, ports, guides d'alignement, undo/redo.             |
| `/shape-editor` | Éditeur de bibliothèques de formes personnalisées , icônes SVG, couleurs par défaut, ports.                 |
| `/context`      | Page de contexte IA , instructions, règles, mémoire, **explorateur MCP** (testez les tools en live dans le navigateur). |

---

## API REST

<details>
<summary>API HTTP complète (cliquer pour déplier)</summary>

| Méthode  | Endpoint                       | Description                                                                                                               |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/documents`               | Liste les documents avec métadonnées (inclut les extra files).                                                            |
| `GET`    | `/api/documents/:id`           | Contenu du document + HTML rendu.                                                                                         |
| `POST`   | `/api/documents`               | Crée à partir de `{ title, category, folder?, content?, date? }`.                                                         |
| `PUT`    | `/api/documents/:id`           | Sauvegarde le contenu sur disque.                                                                                         |
| `DELETE` | `/api/documents/:id`           | Supprime un document.                                                                                                     |
| `GET`    | `/api/documents/search?q=`     | Recherche plein-texte.                                                                                                    |
| `GET`    | `/api/config`                  | Lit la configuration.                                                                                                     |
| `PUT`    | `/api/config`                  | Met à jour la configuration (`title`, `theme`, `filenamePattern`, `extraFiles`, `sourceRoot`, `blockedFileExtensions`…). |
| `GET`    | `/api/browse?path=`            | Liste les dossiers et fichiers `.md` à un chemin donné.                                                                   |
| `POST`   | `/api/browse/mkdir`            | Crée un dossier sous la racine docs.                                                                                      |
| `POST`   | `/api/images/upload`           | Upload d'une image base64 → `<docs>/images/`.                                                                             |
| `POST`   | `/api/files/upload`            | Upload d'une pièce jointe base64 → `<docs>/files/`.                                                                       |
| `GET`    | `/api/files`                   | Liste toutes les pièces jointes (ordre chronologique).                                                                    |
| `PUT`    | `/api/files/:filename`         | Remplace une pièce jointe.                                                                                                |
| `DELETE` | `/api/files/:filename`         | Supprime une pièce jointe.                                                                                                |
| `GET`    | `/api/metadata/:docId`         | Rapport de fiabilité pour un document.                                                                                    |
| `POST`   | `/api/metadata/:docId`         | Ajoute ou remplace une liaison.                                                                                           |
| `DELETE` | `/api/metadata/:docId`         | Retire une liaison.                                                                                                       |
| `POST`   | `/api/metadata/:docId/refresh` | Re-baseline les hashes.                                                                                                   |
| `GET`    | `/api/browse-source?path=`     | Navigue dans l'arbre source ancré sur `sourceRoot`.                                                                       |
| `GET`    | `/api/diagrams`                | Liste les diagrammes sauvegardés.                                                                                         |
| `GET`    | `/api/diagrams/:id`            | Lit un diagramme (nœuds + arêtes).                                                                                        |
| `PUT`    | `/api/diagrams/:id`            | Crée ou met à jour un diagramme.                                                                                          |
| `DELETE` | `/api/diagrams/:id`            | Supprime un diagramme.                                                                                                    |
| `GET`    | `/api/shape-libraries`         | Liste les bibliothèques de formes personnalisées.                                                                         |
| `PUT`    | `/api/shape-libraries/:id`     | Sauvegarde une bibliothèque de formes.                                                                                    |
| `GET`    | `/api/annotations[/:docId]`    | Liste les annotations (tous les docs / un doc).                                                                           |
| `POST`   | `/api/annotations/:docId`      | Ajoute une annotation.                                                                                                    |
| `DELETE` | `/api/annotations/:docId/:id`  | Supprime une annotation.                                                                                                  |
| `POST`   | `/api/export/html`             | Export HTML , modes Notion / Confluence.                                                                                  |
| `POST`   | `/api/export/markdown`         | Export bundle Markdown.                                                                                                   |
| `GET`    | `/api/wordcloud?path=&ext=`    | Concatène récursivement les fichiers source correspondants en texte brut.                                                 |
| `POST`   | `/mcp`                         | Endpoint Model Context Protocol (Streamable HTTP).                                                                        |
| `GET`    | `/mcp`                         | Résumé live des schémas tools + prompts.                                                                                  |

</details>

---

## Build et test

```bash
git clone https://github.com/craftskillz/living-documentation.git
cd living-documentation
npm install
npm run setup-hooks                      # une fois : active .githooks/ comme core.hooksPath
npm run dev -- ./documentation          # Vite (UI sur :5174, HMR) + backend Express (:4321)
npm run build                            # tsc (serveur) + vite build (UI → dist/frontend-svelte)
npm run test:e2e                         # Playwright end-to-end (~3 s, ~30 specs MCP)
npm run test:coverage                    # couverture c8 V8-natif
```

En **dev**, ouvrez l'UI sur **http://localhost:5174** (Vite sert l'app Svelte avec HMR et proxifie `/api`, `/mcp`, `/images`, `/files` vers le backend Express sur `:4321`).

Les tests end-to-end utilisent **Playwright**. Chaque test lance un vrai processus CLI enfant sur un fixture frais sur un port aléatoire , pas de fuite d'état, exécution en parallèle. Couverture côté serveur via **c8** (V8 natif, ~72 % de référence globale, 83 % sur `src/routes` et `src/lib`).

### Tester le package publié en local

Pas besoin de publier une version. Le CLI démarre un **serveur Express unique** qui sert l'UI Svelte pré-buildée **et** l'API/MCP sur un seul port , Vite (`:5174`) est uniquement pour le développement et n'existe pas pour les utilisateurs finaux.

```bash
# Lancer l'artefact de production exact, puis ouvrir http://localhost:4321
npm run build
node dist/bin/cli.js ./documentation

# Le plus fidèle : construire le tarball que npm publierait (respecte "files"), puis le lancer
npm pack                                 # → living-ai-documentation-<version>.tgz
npx ./living-ai-documentation-*.tgz ./documentation

npm pack --dry-run                       # inspecter exactement quels fichiers seraient publiés
```

> En production, il n'y a pas de `:5174`. L'endpoint MCP auquel les clients se connectent est **`http://localhost:4321/mcp`** (Express, port par défaut).

### Contribuer

Ce dépôt embarque un hook `pre-commit` (dans `.githooks/`) qui impose le contrat de README bilingue : si vous touchez `README.md`, vous devez aussi toucher `README.fr.md`, et inversement. Lancez `npm run setup-hooks` une fois après le clone pour l'activer. La même vérification s'exécute en CI sur chaque PR (voir `.github/workflows/readme-sync.yml`), donc la règle est appliquée même si un contributeur oublie la configuration locale.

---

## Licence

[AGPL-3.0](./LICENSE) , © Youssef MEDAGHRI-ALAOUI.