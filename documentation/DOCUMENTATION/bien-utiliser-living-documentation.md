---
type: Document
title: Bien utiliser Living Documentation
description: Guide d'usage commun aux utilisateurs et aux agents IA, qui présente le modèle de fichiers, les conventions d'écriture, le travail avec ou sans MCP et les pièges à éviter.
tags:
  - guide
  - usage
  - agents-ia
  - mcp
  - okf
  - frontmatter
  - git
  - cli
timestamp: 2026-11-04T12:00:00Z
status: Draft
---

# Bien utiliser Living Documentation

Ce guide s'adresse à deux lecteurs : la personne qui utilise l'application et l'agent IA qui travaille dans un dossier documentaire. Les trois premières parties sont communes, puis chacun a sa partie.

Pour un agent, la référence reste ce que le serveur expose en direct : `GET /mcp` et `get_server_guide`.

## L'idée en trois points

- **Vos documents sont des fichiers Markdown locaux.** Pas de base de données : un éditeur de texte et Git suffisent pour les lire.
- **Le document est la source de vérité.** Un diagramme en est une vue dérivée et n'ajoute pas d'information absente des documents.
- **La documentation peut se vérifier.** Un document relié à ses fichiers source signale quand ceux-ci ont changé.

## Démarrer

Node.js 20.19 ou plus récent est nécessaire.

```bash
npx living-ai-documentation@latest                       # détecte un projet proche ou crée un starter
npx living-ai-documentation@latest ./docs                # sert un dossier existant
npx living-ai-documentation@latest ./docs --port 4000 --open
```

Le dossier doit être un **chemin relatif** : les chemins absolus et `~` sont refusés. Une fois lancée, l'application répond sur `http://localhost:4321`, l'administration sur `/admin` et le serveur MCP sur `/mcp`.

## Le modèle de fichiers

```text
docs/
├── .living-doc.json     configuration du projet
├── index.md             liste générée, réservée
├── log.md               journal généré, réservé
├── liv-doc-main.md      manifeste du dossier : ordre et éléments masqués
├── images/              images, servies sur /images
├── files/               fichiers joints, servis sur /files
├── mon-document.md      un document
└── PROCESSUS/
    ├── liv-doc-main.md
    └── un-autre-document.md
```

| Fichier | Rôle | À la main ? |
| --- | --- | --- |
| `*.md` | Un document | Oui |
| `liv-doc-main.md` | `order` place des éléments en premier ; `hidden` les masque dans l'explorateur, sans bloquer leur accès par lien ou MCP | Oui, ou par glisser-déposer |
| `.living-doc.json` | Thème, langue, port, `sourceRoot`, Git… | Préférer l'écran Admin |
| `index.md` | Liste les documents et sous-dossiers du dossier | Non : généré |
| `log.md` | Journal des changements | Non : généré |

`index.md`, `log.md` et `liv-doc-main.md` sont réservés : ils n'apparaissent jamais comme des documents.

Le nom de fichier n'est qu'un identifiant. **Le titre et la date viennent du frontmatter.** Un nouveau document prend le slug de son titre : `Mon guide` devient `mon-guide.md`, puis `mon-guide-2.md` en cas de collision. Les anciens noms datés restent valables.

## Écrire un document

### Le frontmatter

Chaque document commence par un bloc YAML :

```markdown
---
type: Document
title: Un titre lisible
description: Une phrase qui résume le document.
tags:
  - un-sujet
  - un-autre-sujet
timestamp: 2026-11-04T12:00:00Z
status: Draft
---
```

| Champ | Statut pour `validate` |
| --- | --- |
| `type` | Obligatoire. Valeurs connues : `Document`, `ADR`, `Worklog`, `Rule`, `Technical Doc`, `Concept`. Une autre valeur donne un avertissement. |
| `title` | Obligatoire |
| `timestamp` | Recommandé, au format ISO 8601. Absent : avertissement. Mal formé : erreur. |
| `sources` | Optionnel. S'il est présent, chaque entrée doit avoir `path` et `hash`. |
| `description`, `tags`, `status`, `language` | Optionnels, mais `description` et `tags` servent à retrouver le document |
| `html_template` | Optionnel. Identifiant du template de présentation HTML, écrit par l'application quand vous en choisissez un. |

Une sauvegarde par l'application ou le MCP normalise ce bloc. `type`, `title` et `timestamp` sont complétés s'ils manquent : le fichier peut donc légèrement changer, sans que ce soit une erreur.

### Les liens

| Cible | Syntaxe |
| --- | --- |
| Autre document | `[Libellé](?doc=<id doublement encodé>)` ; un agent copie le champ `linkHref` renvoyé par le MCP |
| Titre du même document | `[Libellé](#slug-du-titre)` |
| Diagramme | `[Libellé](/diagram?id=<id du diagramme>)` |
| Fichier joint | `[nom](./files/<fichier>)` |

### Les images et la mise en forme

Le Markdown standard fonctionne tel quel. Des commentaires placés juste avant un élément règlent son affichage :

```markdown
<!-- image-width: 1/2 -->
<!-- image-align: center -->
![Schéma d'architecture](./images/schema.png)
```

Largeurs : `full`, `3/4`, `2/3`, `1/2`, `1/3`, `1/4`. Alignements : `left`, `center`, `right`. Les blocs de code et Mermaid ont leurs équivalents : `code-width`, `code-align`, `mermaid-width`, `mermaid-align`.

## Pour les utilisateurs

| Je veux… | Où aller |
| --- | --- |
| Lire, créer, éditer, chercher | <kbd>Home</kbd> : édition en ligne, snippets, tableaux, images collées, annotations |
| Classer mes documents | Explorateur de <kbd>Home</kbd>, par glisser-déposer ; les liens des éléments déplacés sont réécrits |
| Dessiner un schéma | <kbd>Diagram</kbd> |
| Retrouver un fichier joint | <kbd>Files</kbd> |
| Configurer un LLM et des agents | <kbd>Workspace</kbd>, puis <kbd>Agents</kbd> pour les lancer depuis n'importe quelle page |
| Vérifier ce que voient mes agents | <kbd>AI Context</kbd> : règles, mémoire, explorateur MCP |
| Régler Git, le thème, la langue | <kbd>Admin</kbd> |
| Revenir en arrière | <kbd>Versions</kbd> sur un document : diff et restauration par blocs |
| Présenter un document dans une page soignée | <kbd>Générer en HTML</kbd> sur un document pour choisir un template, puis <kbd>Voir en HTML</kbd>. La page est rendue à la demande depuis le Markdown ; aucun fichier HTML n'est écrit. |

Pour brancher un agent externe, ajoutez le serveur MCP. Par exemple, avec Claude Code :

```bash
claude mcp add --transport http living-ai-documentation http://localhost:4321/mcp
```

## Pour les agents IA

### Choisir son mode de travail

```text
Le MCP living-ai-documentation est-il disponible ?
├── Oui → passer par le MCP, jamais par une écriture directe des fichiers
└── Non → écrire les fichiers à la main, et le signaler à l'utilisateur
```

### Avec le MCP

1. Appeler `get_server_guide` si le serveur ne transmet pas ses instructions.
2. Appeler `list_documents`, puis `read_document`, avant de créer quoi que ce soit.
3. Créer avec `create_document`. Il n'écrase jamais : une collision de nom donne un suffixe `-2`.
4. Modifier avec `update_document`, qui **remplace tout le contenu** : envoyer le document complet. Ni le nom ni le dossier ne changent.
5. Pour un document qui décrit du code : `add_metadata` sur les fichiers source qui le prouvent, puis `refresh_metadata` après chaque correction.

| Besoin | Outils |
| --- | --- |
| Lire le code du projet | `list_source_files`, `read_source_file`, `search_source`, à utiliser après la documentation |
| Obtenir l'état de travail en un appel | `build_context` |
| Détecter une dérive | `get_accuracy`, `review_adr_relevance`, `list_adrs_below_accuracy` |
| Faire un diagramme | `list_diagrams` et lecture des documents, puis `create_diagram` |
| Générer une image | `generate_image` |

Trois règles sont à respecter :

- **Dossier différent.** Si l'utilisateur désigne un dossier qui ne correspond pas à ce workspace MCP, lui demander si l'écart est voulu. Ne pas changer de stratégie en silence.
- **Statut d'un ADR.** Créer à `To be validated`. Seul l'humain le passe à `Accepted`. Un ADR remplacé passe à `SuperSeeded` et n'est jamais supprimé.
- **Diagrammes.** Ne jamais inventer d'acteur ou de relation absents des documents. Un diagramme autre que de contexte exige une demande explicite de l'utilisateur.

Les instructions du projet (`AGENTS.md`, `CLAUDE.md`, `AI/PROJECT-INSTRUCTIONS.md`, `AI/rules/`) priment sur ce guide lorsqu'elles existent.

### Sans le MCP

1. Écrire le frontmatter complet décrit plus haut, en YAML, jamais sous la forme `**clé:** valeur`.
2. Nommer le fichier avec le slug du titre.
3. Ne pas modifier `index.md` ni `log.md`.
4. Contrôler avec `validate`, qui n'écrit rien.
5. **Dire à l'utilisateur** que les métadonnées et les hashes n'ont pas été mis à jour, et lister les fichiers source à attacher.

## Pièges à connaître

| Piège | Ce qui se passe | Comment faire |
| --- | --- | --- |
| Commits automatiques | Si l'intégration Git est activée, une écriture depuis l'application ou par un outil d'écriture MCP peut créer un commit, sur la branche courante. Le push dépend de `pushMode`. | Vérifier `gitIntegration` avant d'écrire. Attention aux contenus confidentiels si le dépôt est poussé. |
| `migrate` trop large | Il parcourt tous les `.md` du dossier. Si le dossier documentaire contient aussi du code ou d'autres sources, leur frontmatter est réécrit et des `index.md` y sont ajoutés. | Toujours lancer `migrate <dossier> --dry-run` d'abord. |
| `validate` en erreur | `validate` compare chaque `index.md` à ce que produirait le générateur. Un index modifié à la main, ou un nouveau sous-dossier, le fait échouer. | Corriger par `migrate`, après le `--dry-run`, pas à la main. |
| Chemin absolu | La CLI refuse les chemins absolus, y compris pour `validate` et `migrate`. | Se placer dans le dossier parent et donner un chemin relatif. |
| Dossier jamais migré | Le serveur ne l'ouvre pas tel quel : une migration est exigée. | Prévisualiser avec `--dry-run`, puis migrer. |
| `hidden` n'est pas une protection | Un élément masqué reste accessible par lien et par le MCP. | Ne pas s'en servir pour protéger un contenu sensible. |

## Commandes de référence

| Commande | Effet |
| --- | --- |
| `living-ai-documentation <dossier>` | Sert le dossier ; `--port`, `--open` |
| `living-ai-documentation validate <dossier>` | Contrôle le dossier sans rien écrire ; sort en erreur s'il y a une violation |
| `living-ai-documentation migrate <dossier> --dry-run` | Annonce ce que la migration changerait, sans rien écrire |
| `living-ai-documentation migrate <dossier>` | Convertit le frontmatter et les préfixes de dossier, régénère les `index.md` |
| `living-ai-documentation import <source> <dossier>` | Importe un bundle OKF externe dans le projet, sous `IMPORTED/<bundle>` |
