# PROJECT-INSTRUCTIONS - Living Documentation

Ce fichier est le contrat de travail partagé par les assistants IA qui interviennent sur ce projet. Il explique comment intégrer Living Documentation au flux de développement assisté par IA.

`AGENTS.md` et `CLAUDE.md` sont des points d'entrée propres aux outils. Ils doivent rester courts et pointer vers ce fichier, qui porte les règles communes.

## Routine de démarrage

Avant de modifier le projet :

1. Lire `AGENTS.md` ou `CLAUDE.md`, selon l'outil utilisé.
2. Lire ce fichier : `documentation/AI/PROJECT-INSTRUCTIONS.md`.
3. Lire `documentation/AI/PROJECT-STACK.md` pour comprendre la stack, l'arborescence utile, les concepts centraux et les conventions structurantes.
4. Lire `documentation/AI/PROJECT-USEFUL-COMMANDS.md` pour connaître les commandes de développement, build, test, lint et setup.
5. Lire `memory/MEMORY.md` et charger seulement les fichiers mémoire utiles à la tâche.
6. Lire toutes les règles dans `documentation/AI/rules/*.md`.
7. Lire `documentation/WORKLOG/current-task.md` si présent pour reprendre l'état de la tâche courante.
8. Inspecter les ADR existants : lister `documentation/ADRS/`, lire d'abord `description` et `tags`, puis ouvrir l'ADR complet seulement s'il est pertinent.
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

Le dossier `documentation/WORKLOG/` contient l'état opérationnel des tâches en cours et les points de reprise entre assistants IA. Il ne remplace pas les ADR.

`documentation/WORKLOG/current-task.md` est le point de reprise partagé. Tout assistant doit le lire avant de reprendre une tâche et le mettre à jour avant de rendre la main lorsqu'il a commencé, terminé, interrompu ou laissé une suite connue.

Le worklog doit rester factuel et utile pour l'agent suivant :

- statut courant ;
- tâche en cours ;
- scope inclus et exclu si nécessaire ;
- fichiers ou zones concernés ;
- vérifications réalisées ;
- vérifications restantes ;
- prochaine action recommandée.

Créer un document dédié dans `documentation/WORKLOG/` pour un ticket MVP lorsqu'un suivi plus détaillé devient nécessaire. Les décisions durables restent dans les ADR.

## ADR

Les ADR sont le journal des décisions d'architecture et de conception. Ils doivent rester courts, traçables et utiles pour décider quoi modifier plus tard.

Quand une feature change une décision durable :

1. Chercher les ADR existants qui parlent du même sujet.
2. Si un ADR reste valide, le compléter ou le corriger.
3. Si un ADR est remplacé, le marquer avec le statut exact `SuperSeeded` ou `Partially SuperSeeded` et créer un nouvel ADR qui explique la nouvelle décision.
4. Ne jamais supprimer un ADR remplacé : l'historique est utile.
5. Dans le nouvel ADR, mentionner explicitement l'ADR remplacé et pourquoi il ne suffit plus.

Le statut initial recommandé pour un ADR créé par l'IA est `To be validated`. L'humain pourra ensuite le valider et le passer à `Accepted`.

Chaque ADR doit contenir un frontmatter utile pour la découverte :

```markdown
---
**date:** YYYY-MM-DD
**status:** To be validated
**description:** Une phrase qui résume la décision et pourquoi elle compte.
**tags:** architecture, mcp, metadata
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

`documentation/AI/PROJECT-STACK.md` contient le résumé opérationnel du projet : stack technique, zones source importantes, concepts centraux et conventions structurantes.

`documentation/AI/PROJECT-USEFUL-COMMANDS.md` contient les commandes réellement utiles : installation, développement local, build, tests, lint, formatage, setup et commandes dangereuses.

Ces deux fichiers sont de la documentation vivante. L'IA doit proposer leur mise à jour lorsqu'une tâche rend leur contenu faux, incomplet ou insuffisamment précis.

Règles :

- garder ces fichiers courts, concrets et orientés action ;
- ne pas y dupliquer les ADR ;
- pointer vers les ADR lorsqu'une explication durable existe ;
- vérifier l'existence d'une commande avant de la documenter ;
- ne pas modifier silencieusement une convention structurante ou une commande dangereuse : expliquer le changement et attendre validation si le risque est significatif.

## Règles IA

Les règles vivent dans `documentation/AI/rules/*.md`.

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
