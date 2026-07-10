---
type: Technical Doc
title: PROJECT INSTRUCTIONS
---

# PROJECT-INSTRUCTIONS - Living Documentation

Ce fichier est le contrat de travail partagé par les assistants IA qui interviennent sur ce projet. Il explique comment intégrer Living Documentation au flux de développement assisté par IA.

`AGENTS.md` et `CLAUDE.md` sont des points d'entrée propres aux outils. Ils doivent rester courts et pointer vers ce fichier, qui porte les règles communes.

## Routine de démarrage

Avant de modifier le projet :

1. Lire `AGENTS.md` ou `CLAUDE.md`, selon l'outil utilisé.
2. Lire ce fichier : `DOCS_FOLDER/AI/PROJECT-INSTRUCTIONS.md`.
3. Lire `DOCS_FOLDER/AI/PROJECT-STACK.md` pour comprendre la stack, l'arborescence utile, les concepts centraux et les conventions structurantes.
4. Lire `DOCS_FOLDER/AI/PROJECT-USEFUL-COMMANDS.md` pour connaître les commandes de développement, build, test, lint et setup.
5. Lire `memory/MEMORY.md` et charger seulement les fichiers mémoire utiles à la tâche.
6. Lire toutes les règles dans `DOCS_FOLDER/AI/rules/*.md`.
7. Lire `DOCS_FOLDER/WORKLOG/current-task.md` si présent pour reprendre l'état de la tâche courante.
8. Inspecter les ADR existants : lister `DOCS_FOLDER/ADRS/`, lire d'abord `description` et `tags`, puis ouvrir l'ADR complet seulement s'il est pertinent.
9. Vérifier si le MCP `living-ai-documentation` est disponible avant de créer ou modifier de la documentation.

## Rôle du MCP Living Documentation

Le MCP `living-ai-documentation` est le canal privilégié pour lire, créer et maintenir la documentation du projet. Quand il est disponible, l'IA doit l'utiliser plutôt que modifier les fichiers Markdown à la main.

Utiliser notamment :

- `list_documents` pour découvrir les documents existants ;
- `read_document` pour lire le contenu source d'un document ;
- `create_document` ou `update_document` pour créer ou corriger un document ;
- `list_source_files`, `read_source_file` et `search_source` pour relier la documentation au code ;
- `add_metadata` pour attacher un document aux fichiers source qui le prouvent ;
- `refresh_metadata` pour recalculer les hashes après mise à jour ;
- `get_accuracy` ou les outils équivalents pour détecter une dérive entre documentation et code.

Si le MCP n'est pas disponible, l'IA peut proposer les changements à faire dans la documentation, mais elle doit signaler explicitement que les métadonnées et les hashes n'ont pas pu être mis à jour.

## Documentation continue

La documentation n'est pas une étape séparée à faire plus tard. Elle fait partie du flux normal de développement assisté par IA.

À la fin de chaque feature cohérente, refactor significatif, changement de comportement ou décision durable, l'IA doit se demander si la documentation doit être mise à jour.

Créer ou mettre à jour un document lorsque le changement :

- modifie une frontière d'architecture ;
- introduit ou change un contrat public ;
- change un format de stockage, un protocole ou un workflow ;
- ajoute une convention que les futurs changements devront respecter ;
- rend un document existant incomplet, ambigu ou faux ;
- résout un compromis difficile à déduire du code seul.

Ne pas créer de documentation durable pour les corrections triviales, renommages mécaniques ou changements de formatage.

## Suivi de progression

Le dossier `DOCS_FOLDER/WORKLOG/` contient l'état opérationnel des tâches en cours et les points de reprise entre assistants IA. Il ne remplace pas les ADR.
Le dossier `DOCS_FOLDER/WORKLOG/` contient trois types de fichiers complémentaires, aucun d'entre eux ne remplace les ADR durables qui vivent dans `DOCS_FOLDER/ADRS/`.

### 1. `DOCS_FOLDER/WORKLOG/current-task.md` , point de reprise partagé

Tout assistant doit le lire avant de reprendre une tâche et le mettre à jour avant de rendre la main lorsqu'il a commencé, terminé, interrompu ou laissé une suite connue.

Le worklog doit rester factuel et utile pour l'agent suivant :

- statut courant ;
- tâche en cours ;
- scope inclus et exclu si nécessaire ;
- fichiers ou zones concernés ;
- vérifications réalisées ;
- vérifications restantes ;
- prochaine action recommandée.

### 2. `DOCS_FOLDER/WORKLOG/ROADMAP.md` , backlog de tickets

Liste ordonnée des tickets à réaliser pour livrer le produit (ou une grande étape). Format proche d'un ADR : frontmatter (`date`, `status`, `description`, `tags`) + corps Markdown.

Le starter livre une roadmap d'exemple , l'utilisateur doit la remplacer par les tickets réels du projet.

Quand un ticket est terminé, l'agent :

1. coche et barre la ligne du ticket dans `ROADMAP.md` ;
2. crée un document dédié dans `DOCS_FOLDER/WORKLOG/` qui consigne la réalisation (voir point 3).

Convention de cochage dans la section « Ordre recommandé » :

- `[ ]` ou `[]` , ticket non démarré ;
- `[x] ~~Ticket XX - ...~~` , ticket terminé, barré pour visualisation rapide.

### 3. `DOCS_FOLDER/WORKLOG/YYYY_MM_DD_HH_mm_[WORKLOG]_ticket_XX_<slug>.md` , trace de réalisation par ticket

À chaque fois qu'un ticket de roadmap est terminé, créer un document dédié dans `DOCS_FOLDER/WORKLOG/`. Le format ressemble à un ADR (même frontmatter) mais la **sémantique est différente** :

- les ADR (`DOCS_FOLDER/ADRS/`) documentent les **décisions durables** du projet : architecture, contrats publics, conventions structurantes. Ils décrivent le **QUOI** et le **POURQUOI**.
- les documents WORKLOG par ticket documentent la **réalisation** d'un ticket de roadmap : ce qui a été fait, les choix retenus pendant l'exécution, les vérifications passées. Ils décrivent **CE QUE L'AGENT A FAIT** pour ce ticket précis.

Si un choix durable est pris pendant la réalisation d'un ticket (par exemple, le choix d'une convention de structure de dossiers), créer un ADR architectural dans `DOCS_FOLDER/ADRS/` et faire pointer le document WORKLOG vers cet ADR , ne pas dupliquer le raisonnement.

Frontmatter YAML recommandé (Open Knowledge Format) du document WORKLOG par ticket :

```markdown
---
type: Worklog
title: Ticket <n> — <titre court>
description: Une phrase qui résume ce qui a été fait pour ce ticket.
tags:
  - worklog
  - ticket
  - <slug-metier>
status: To Be Validated
---
```

`type`, `title` et un `timestamp` ISO 8601 sont dérivés automatiquement à l'écriture s'ils sont omis.

Sections recommandées dans le corps :

- **Contexte** , rappel du ticket et de son objectif (un paragraphe court, lien vers `ROADMAP.md`) ;
- **Réalisation** , liste factuelle de ce qui a été fait ;
- **Choix retenus** , décisions techniques prises pendant le ticket. Pointer vers un ADR si la décision est durable ;
- **Vérifications** , tests passés, validations manuelles ;
- **Suites éventuelles** , points de vigilance pour les tickets suivants ;
- **Documents liés** , lien vers `ROADMAP.md` et ADR(s) éventuel(s).

## ADR

Les ADR sont le journal des décisions d'architecture et de conception. Ils doivent rester courts, traçables et utiles pour décider quoi modifier plus tard.

> **Pré-requis — working tree propre avant d'écrire l'ADR.** Quand une feature est terminée et que l'IA s'apprête à créer l'ADR et attacher ses fichiers source, elle doit d'abord vérifier l'état git du dépôt source. Si le `HEAD` est *dirty* (modifications non commitées), l'IA doit **s'arrêter et inviter l'utilisateur à commiter d'abord**, en expliquant pourquoi : `add_metadata` et `refresh_metadata` enregistrent, avec chaque hash, le commit `HEAD` au moment du calcul. Sur un arbre sale, le hash reflète le working tree mais le commit associé est faux/approximatif (marqué `dirty`), ce qui faussera plus tard la recherche du commit lié aux métadonnées (le `git diff <commit>..HEAD` ciblé). Ne poursuivre l'écriture de l'ADR sur un arbre sale que si l'utilisateur le demande explicitement après avoir été averti.

Quand une feature change une décision durable :

1. Chercher les ADR existants qui parlent du même sujet.
2. Si un ADR reste valide, le compléter ou le corriger.
3. Si un ADR est remplacé, le marquer avec le statut exact `SuperSeeded` ou `Partially SuperSeeded` et créer un nouvel ADR qui explique la nouvelle décision.
4. Ne jamais supprimer un ADR remplacé : l'historique est utile.
5. Dans le nouvel ADR, mentionner explicitement l'ADR remplacé et pourquoi il ne suffit plus.

Le statut initial recommandé pour un ADR créé par l'IA est `To be validated`. L'humain pourra ensuite le valider et le passer à `Accepted`.

Chaque ADR doit contenir un frontmatter YAML (Open Knowledge Format) utile pour la découverte :

```markdown
---
type: ADR
title: Un titre court et lisible
description: Une phrase qui résume la décision et pourquoi elle compte.
tags:
  - architecture
  - mcp
  - metadata
status: To be validated
---
```

## Métadonnées et jauge de fiabilité

Un document Living Documentation doit être relié aux fichiers source qui prouvent ce qu'il affirme. Ces liens sont stockés dans les métadonnées et permettent de calculer la fiabilité du document.

Quand l'IA crée ou met à jour un ADR ou un document technique :

1. Identifier les fichiers source réellement concernés.
2. Attacher ces fichiers au document avec `add_metadata`.
3. Éviter d'attacher des fichiers trop génériques si un fichier plus précis prouve mieux le contenu.
4. Après correction du document, appeler `refresh_metadata` pour recalculer les hashes.
5. Si un document reste correct malgré un changement cosmétique du code, utiliser `refresh_metadata` pour rebaseliner le hash sans réécrire inutilement le document.

Les métadonnées ne sont pas optionnelles pour les documents qui décrivent du code. Si elles ne peuvent pas être mises à jour, l'IA doit le signaler dans sa réponse finale et lister les fichiers à attacher.

## Stack et commandes projet

`DOCS_FOLDER/AI/PROJECT-STACK.md` contient le résumé opérationnel du projet : stack technique, zones source importantes, concepts centraux et conventions structurantes.

`DOCS_FOLDER/AI/PROJECT-USEFUL-COMMANDS.md` contient les commandes réellement utiles : installation, développement local, build, tests, lint, formatage, setup et commandes dangereuses.

Ces deux fichiers sont de la documentation vivante. L'IA doit proposer leur mise à jour lorsqu'une tâche rend leur contenu faux, incomplet ou insuffisamment précis.

Règles :

- garder ces fichiers courts, concrets et orientés action ;
- ne pas y dupliquer les ADR ;
- pointer vers les ADR lorsqu'une explication durable existe ;
- vérifier l'existence d'une commande avant de la documenter ;
- ne pas modifier silencieusement une convention structurante ou une commande dangereuse : expliquer le changement et attendre validation si le risque est significatif.

## Règles IA

Les règles vivent dans `DOCS_FOLDER/AI/rules/*.md`.

Chaque règle utilise un frontmatter :

- `id` - identifiant stable ;
- `title` - nom court lisible ;
- `severity` - `guideline`, `warning` ou `required` ;
- `description` - résumé concis ;
- `tags` - thèmes utilisés pour la découverte ;
- `appliesTo` - globs indiquant où la règle s'applique.

Appliquer chaque règle dont les motifs `appliesTo` correspondent aux fichiers modifiés. Si une règle contredit la demande utilisateur ou une autre instruction du projet, signaler explicitement le conflit avant de continuer.

## Mémoire

Les fichiers mémoire vivent dans le projet, sous `memory/`.

Ne pas stocker la mémoire projet dans un dossier global propre à un outil si l'utilisateur attend une mémoire locale au projet. Mettre à jour `memory/MEMORY.md` à chaque ajout ou suppression de fichier mémoire.

La mémoire sert aux informations stables et fréquemment réutilisées. Les décisions durables doivent plutôt être écrites dans des ADR.

## Modification des fichiers d'instructions IA

L'IA a le droit de proposer des modifications de `AGENTS.md`, `CLAUDE.md`, `PROJECT-INSTRUCTIONS.md`, `PROJECT-STACK.md`, `PROJECT-USEFUL-COMMANDS.md`, `memory/MEMORY.md` ou des règles dans `AI/rules/`.

Mais ces fichiers pilotent directement le comportement des assistants IA. Avant de les modifier, l'IA doit :

1. expliquer à l'utilisateur ce qu'elle veut changer ;
2. expliquer pourquoi ce changement améliore le flux de travail ;
3. signaler les risques éventuels ;
4. attendre une validation explicite si le changement peut réduire la visibilité, supprimer une règle, affaiblir une contrainte ou rendre l'agent plus autonome.

Aucune modification destructive de ces fichiers ne doit être faite silencieusement.

## Vérification

Avant de terminer une tâche, lancer la plus petite vérification utile :

- commande de build si du code typé ou des fichiers de build ont changé ;
- tests ciblés si le comportement a changé ;
- lint ou formatage si le projet en possède ;
- vérification MCP/documentation si des ADR ou métadonnées ont été créés ou modifiés.

Si une vérification ne peut pas être lancée, expliquer pourquoi.
