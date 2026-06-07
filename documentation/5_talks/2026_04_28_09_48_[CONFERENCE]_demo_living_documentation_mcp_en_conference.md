---
**date:** 2026-04-28
**status:** Draft
**description:** Support de présentation conférence , démo live de Living Documentation en mode IA-Assisted, scénarios A (création d'ADR) et B (audit de dérive) avec un agent codant connecté au MCP
**tags:** conference, talk, demo, mcp, scenario-a, scenario-b, create-adr, audit-doc-drift, live-coding, claude-code, nextjs, shadcn, drift-detection, presentation
---

# Living Documentation , co-maintenir la doc avec un agent codant

> Support de présentation pour une conférence (~15 min de démo + 5 min de Q&A). Le but : montrer **en live** comment la documentation cesse d'être une dette quand on la confie à un agent codant connecté au bon MCP.

## Le pitch en 3 lignes

1. **Le constat** : sur tout projet qui vit, la doc dérive plus vite qu'on ne la met à jour. Au bout d'un cycle, on ne lui fait plus confiance.
2. **La proposition** : un agent codant qui **co-maintient** la doc , un ADR par feature à la création, un audit de dérive à la demande.
3. **Le levier technique** : un serveur MCP qui sérialise le contrat entre le LLM et la base documentaire, avec des garde-fous _enforced côté serveur_ qui empêchent l'agent d'inventer des ADR fictifs ou des diagrammes hallucinés.

---

## Le problème , la doc, dette ou actif ?

Trois forces tirent les docs vers le bas sur tout projet qui dure :

1. **Le code change plus vite que l'attention humaine.** Personne ne relit un ADR de 2024 en 2026 pour vérifier qu'il décrit encore le module.
2. **La provenance s'efface.** Six mois après une décision, plus personne ne sait quel commit l'a implémentée, ni quels fichiers source sont en jeu.
3. **L'audit manuel ne passe pas à l'échelle.** Au-delà de 50 ADR, _« tout relire »_ n'est plus un workflow, c'est un mardi soir mort.

L'effet final : la doc devient **passive**. On la consulte par habitude, on lui fait de moins en moins confiance, et au bout d'un cycle elle finit en cimetière de bonnes intentions.

---

## La proposition , deux scénarios

### Scénario A , un ADR par feature

À la fin de chaque feature, l'agent invoque le prompt MCP `create-adr` qui orchestre :

1. **Recherche d'un ADR à supersede** , `list_documents` puis lecture des frontmatter (`description`, `tags`) pour repérer une décision rendue obsolète. Si trouvée → `update_document` pour basculer son `**status:**` à `SuperSeeded` (jamais delete , on garde la traçabilité).
2. **Écriture du nouvel ADR** avec un frontmatter normalisé qui rend les recherches futures triviales :

```
---
**date:** YYYY-MM-DD
**status:** To be validated
**description:** Une phrase technique factuelle.
**tags:** 5-10 tags incluant librairies, concepts, symboles clés
---
```

3. **Liaison metadata** , `add_metadata` sur **chaque fichier source** matériellement modifié, avec exclusion explicite des god files (`package.json`, `tsconfig.json`, barrels, codegen). Le SHA-256 stocké est ce qui permettra l'audit drift plus tard.

> Le `**status: To be validated**` à la création est volontaire : l'agent ne **promeut jamais** un ADR à `Accepted`. C'est l'humain qui valide.

### Scénario B , auditer la dérive

Sur invocation de l'utilisateur (_« audite la doc »_ / _« vérifie la fiabilité de la doc »_), l'agent invoque le prompt MCP `audit-doc-drift` :

1. `list_documents_below_accuracy` , liste les ADR dont la fiabilité < 80 % (fichier source modifié vs hash stocké).
2. Pour chaque doc dérivé : `get_accuracy` + `read_document` + `read_source_file` sur les fichiers `modified`.
3. **Décision** :

| Outcome                         | Diagnostic                                                 | Action                                                        |
| ------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| **A** , ADR toujours correct    | Refactor cosmétique (rename, formatting, helpers internes) | `refresh_metadata` , re-baseline                              |
| **B** , ADR out of sync         | Changement sémantique du comportement décrit               | Réécrit le doc via `update_document`, puis `refresh_metadata` |
| **C** , Fichier source manquant | Suppression ou rename                                      | Escaladé à l'humain (l'agent ne décide pas seul du nettoyage) |

Les changements **structurels** (la décision elle-même est remise en cause) sont escaladés explicitement , ils déclenchent un nouveau Scénario A, pas une modification silencieuse.

---

## Architecture en un coup d'œil

[![Diagramme context , Living Documentation](/images/living_documentation_context_demo_conf.png)](/diagram?id=d1777363627693)

Le diagramme contient quatre nœuds : _Coding agent_ (acteur), _Developer / Reader_ (acteur), _Living Documentation_ (système central) et _Local filesystem_ (datastore). Les edges décrivent les trois interactions clés : invocation MCP par l'agent, navigation/édition par le développeur, et lecture/écriture sur le filesystem.

Le serveur MCP expose **16 tools** et **8 prompts**. Les deux qu'on déclenche en démo :

- **`create-adr`** , auto-invoqué sur _« feature terminée »_
- **`audit-doc-drift`** , auto-invoqué sur _« audite la doc »_

---

## Pourquoi c'est différent (vs wiki classique)

| Critère                | Wiki classique                       | Living Documentation                                                 |
| ---------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| Source de vérité       | Le wiki                              | Le code, vérifié par hash                                            |
| Création               | Humain post-feature                  | Agent pendant la feature                                             |
| Détection de dérive    | Aucune (on espère)                   | Mécanique (SHA-256, jauge visuelle)                                  |
| Diagrammes             | À jour quand quelqu'un s'en souvient | Garde-fous serveur , impossible d'inventer un acteur absent des docs |
| Vendor lock-in         | Total                                | Zéro , `.md` sur disque, git-friendly                                |
| Onboarding nouveau dev | _« Lis le wiki »_                    | _« Lance `npx living-ai-documentation .`, puis branche ton agent »_  |

---

## Plan de démo , 15 min

### Phase 1 , Setup (2 min)

- Montrer le projet `mon-test` vide.
- Lancer `npx living-ai-documentation ./documentation --port 4321` dans un terminal.
- Brancher Claude Code sur le MCP : `claude mcp add --transport http living-ai-documentation http://localhost:4321/mcp`.
- Ouvrir `http://localhost:4321` côté grand écran : sidebar vide, message _« no docs yet »_.

### Phase 2 , Scénario A (5 min)

Le prompt à coller dans Claude Code (à préparer sur slide pour copy-paste live) :

```
# Pre-flight , MCP check

Le serveur MCP `living-ai-documentation` doit être branché et accessible.
Avant de coder quoi que ce soit :

1. Appelle son tool `list_documents` (nom complet côté client :
   `mcp__living-documentation__list_documents`).
   Si le tool n'est pas exposé OU s'il renvoie une erreur réseau :
   **ARRÊTE-TOI ET DEMANDE-MOI** de lancer le serveur. Ne contourne pas
   en utilisant Write ou en éditant des `.md` directement.

2. Vérifie que les tools suivants sont bien dans ton inventaire MCP :
   `create_document`, `update_document`, `add_metadata`,
   `list_documents_below_accuracy`, `refresh_metadata`,
   `read_source_file`. Si l'un manque, le serveur n'est pas à jour ,
   stoppe et préviens-moi.

3. Appelle `mcp__living-documentation__get_server_guide` pour charger
   en contexte le workflow officiel (création d'ADR, conventions
   Markdown, garde-fous diagrammes). Ce guide est ta source de vérité
   pour tout ce qui suit, *y compris si ton client n'expose pas les
   prompts MCP au modèle* (cas fréquent , dans ce cas tu orchestres
   le workflow toi-même en appelant les tools un par un, comme décrit
   dans le guide).

4. Confirme-moi en une ligne (a) combien de tools sont exposés,
   (b) que tu as bien chargé le server guide.

Note : si ton client expose en plus les **prompts** MCP `create-adr`
et `audit-doc-drift`, tu peux les invoquer directement quand le moment
viendra ; c'est équivalent au workflow tools-by-hand mais plus court.
S'il ne les expose pas, suis simplement le server guide.

# Projet à implémenter

Create a visually impressive 2D browser game using a single HTML file with embedded JavaScript and HTML5 Canvas. No external dependencies.

Game concept:
- A small glowing player (circle or sprite) that can move with arrow keys or WASD
- The player must avoid falling obstacles from the top of the screen

Visual style (VERY IMPORTANT):
- Dark background (almost black)
- Neon / cyberpunk aesthetic
- Smooth animations (use requestAnimationFrame)
- Add particle effects:
  - trail behind the player
  - explosion particles when the player dies
- Add screen shake on collision
- Add glow effects (shadowBlur, gradients, etc.)
- Obstacles should have slight variations and glow

Gameplay:
- Smooth movement (use delta time)
- Increasing difficulty over time (more obstacles, faster speed)
- Score that increases over time
- Game over screen with restart (press space)

Code quality:
- Keep everything in one HTML file
- Structure code clearly (separate update, render, input)
- Comment important parts briefly

Polish:
- Add a start screen ("Press space to start")
- Add subtle animations even when idle
- Make the game feel responsive and dynamic

Make sure the result is immediately playable by opening the HTML file in a browser.


**IMPORTANT** : A chaque fois qu'une partie est terminée (feature), dis "feature terminée" , je m'attends à ce que tu déclenches le prompt MCP `create-adr` du serveur `living-ai-documentation`,
qui doit appeler `create_document` puis `add_metadata` :

- `create_document` avec :
  - `folder: "adrs"`
  - `category: "FRONTEND"` (ou "ARCHITECTURE" si tu juges que la décision
    porte sur la structure du projet plus que sur la feature UI)
  - `content` : frontmatter complet , date du jour, `status: To be validated`,
    description factuelle d'une phrase, ≥5 tags (incluant nextjs, shadcn,
    recharts, dashboard, app-router, et les noms de symboles pertinents) +
    corps Contexte / Décision / Conséquences.
- `add_metadata` sur CHAQUE fichier source qui porte la feature (page,
  composant Card consommateur, mock-data).
- PAS sur `package.json`, `tailwind.config.ts`, `tsconfig.json`,
  `components.json`, ni les barrels shadcn , ce sont des god files.

# Règle dure

Tu n'écris JAMAIS un `.md` avec ton outil Write, Edit, ou via shell. Toute
création / modification de doc passe **exclusivement** par les tools MCP
`create_document` / `update_document` du serveur `living-ai-documentation`.
Si à un moment ces tools deviennent inaccessibles, arrête-toi et signale-le
, ne fallback pas sur Write.
```

Pendant que l'agent travaille, ce qu'il faut pointer à l'audience :

- L'agent code la page, lance `npm run dev`, vérifie que ça tourne.
- À la fin il prononce _« feature terminée »_ → déclenchement automatique de `create-adr`.
- **Montrer en live** : appel à `create_document` → frontmatter conforme → `add_metadata` sur les bons fichiers, **pas** sur les god files (insister visuellement).
- Refresh du viewer (`Cmd+R`) : nouvelle entrée dans la sidebar, jauge de fiabilité à **100 %** (vert plein).

### Phase 3 , Drift volontaire + Scénario B (5 min)

- Modifier _à la main_ un composant dans le code (ajouter un tooltip Recharts + axe Y formaté en `$`).
- Refresh du viewer : la jauge tombe à ~50 % (orange).
- Dire _« audite la doc »_.
- **Montrer en live** : `audit-doc-drift` → l'agent lit le code modifié, conclut _« modification sémantique »_, réécrit l'ADR via `update_document`, re-baseline.
- Jauge revient à **100 %**.

### Phase 4 , Diagrammes garde-fous (2 min)

- Demander _« fais-moi un container diagram »_ → l'agent refuse / propose un Context d'abord (règle de progression C4).
- Demander _« fais-moi un context diagram »_ → l'agent le génère **uniquement** à partir des ADR existants, pas en inventant.
- Tenter manuellement de créer un container diagram via le MCP sans `userRequestedExplicitly: true` → erreur explicite côté serveur.

### Phase 5 , Q&A (1 min de buffer)

---

## Q&A anticipées

<details>
<summary>« Mais l'agent va halluciner des choses dans les ADR, non ? »</summary>

Le risque est réel mais minimisé par trois mécanismes convergents :

1. Le frontmatter `description:` est **une phrase factuelle**, pas un essai. L'humain valide (`status: To be validated` → `Accepted`).
2. Les fichiers source attachés via `add_metadata` créent une **boucle de vérification** : si l'ADR décrit autre chose que ce que fait le code, l'audit drift le révélera au prochain changement.
3. Les diagrammes ont des **garde-fous serveur** (`userRequestedExplicitly: true` requis pour container/UML, type `image` rejeté sans `imageSrc`, contract docs-source-of-truth enforcé).

Et fondamentalement : le coût d'une hallucination dans un ADR auto-corrigé au prochain audit < le coût d'une doc périmée qu'on traîne pendant deux ans.

</details>

<details>
<summary>« Pourquoi pas juste utiliser le LLM directement sans MCP ? »</summary>

Sans MCP, chaque session démarre vierge : le LLM ne sait pas où sont les ADR, ni leur format, ni quelles décisions ont déjà été prises. Il va :

- proposer un emplacement aléatoire,
- inventer un format de frontmatter,
- oublier de chercher un ADR à supersede,
- ne jamais faire `add_metadata` (puisqu'il ne sait pas que ça existe).

Le MCP **sérialise le contrat** entre le LLM et la base documentaire : un seul format, un seul workflow, des garde-fous _enforced côté serveur_. C'est ce qui permet à un projet de tenir 200 ADR sans dériver.

</details>

<details>
<summary>« Combien de tokens ça coûte ? »</summary>

L'audit drift d'un projet de 50 ADR avec 2-3 fichiers source attachés en moyenne consomme typiquement **< 50k tokens d'input** par cycle complet. Soit quelques cents par audit.

C'est conçu pour : `list_documents_below_accuracy` retourne max 10 docs par batch, chaque `read_source_file` est borné à 512 KB, et l'agent décide quels fichiers lire , pas un balayage exhaustif. Les `tags` du frontmatter permettent un filtrage cheap avant lecture du corps.

</details>

<details>
<summary>« Et si je n'utilise pas Claude / un agent ? »</summary>

Le **mode standalone** reste pleinement utilisable : éditeur Markdown avec live-save, snippets, image paste, file attachments, diagram editor, word cloud, recherche full-text, export PDF / Notion / Confluence. Tu y gagnes la jauge de fiabilité (en mode manuel : tu cliques _Refresh_ après avoir validé que le doc colle au code) et le format ADR portable.

Mais tu rates le **co-maintain**, qui est le cœur de la proposition. Le mode standalone est un bon point d'entrée ; le mode AI-Assisted est ce qui fait que la doc reste vivante.

</details>

<details>
<summary>« Pourquoi les ADR sont en `To be validated` et pas en `Accepted` à la création ? »</summary>

Parce que **l'agent ne décide pas seul** des décisions architecturales. Il rédige une proposition factuelle, l'humain valide.

Concrètement, le statut n'a _aucun effet_ côté LLM (il traite `To be validated` et `Accepted` exactement pareil). C'est purement un signal pour l'humain : _« voici une décision à relire. »_

Seul `SuperSeeded` est filtré côté MCP , les ADR superseded ne remontent jamais dans les recherches contextuelles, ce qui évite que l'agent ne se réfère à des décisions abandonnées.

</details>

<details>
<summary>« Est-ce que ça marche avec un projet existant qui a déjà 100 ADR ? »</summary>

Oui, et c'est un cas d'usage prévu. Le démarrage typique sur un projet existant :

1. Pointer `living-ai-documentation` sur le dossier qui contient déjà les ADR.
2. Lancer un audit `audit-doc-drift` à blanc , il flaggera tout ADR qui n'a aucune `metadata` attachée (donc qui échappe à l'audit drift) et proposera de les binder un par un.
3. Pour chaque ADR existant : l'agent lit le code mentionné dans le corps de l'ADR, propose les `add_metadata` pertinents, l'humain valide.

Une fois cette migration faite, le projet entre dans le cycle normal : nouveaux ADR via Scénario A, audit régulier via Scénario B.

</details>

---

## Pour aller plus loin (docs internes)

- Concept général : [Living Documentation](?doc=3_concept%252F2026_04_08_22_15_%255BDOCUMENTING%255D_living_documentation)
- Concept ADR : [ADRs](?doc=3_concept%252F2026_04_08_20_58_%255BDOCUMENTING%255D_ADRS)
- Méthodologie d'organisation : [Diataxis Architecture du Contenu](?doc=3_concept%252F2026_04_08_22_46_%255BMETHODOLOGY%255D_diataxis_architecture_du_contenu)
- Outil sous-jacent : [The Living Documentation Tool](?doc=4_reference%252F2026_04_08_23_14_%255BFUNDAMENTALS%255D_the_living_documentation_tool)
- Snippets disponibles : [Types De Snippets](?doc=4_reference%252F2026_04_09_03_00_%255BREFERENCE%255D_types_de_snippets)
- Diagrammes liés : [Creer Et Lier Un Diagramme](?doc=2_guide%252F2026_04_09_14_00_%255BDIAGRAM%255D_creer_et_lier_un_diagramme)

---

## Notes de présentation

> ⚠️ Avant la démo : **redémarrer le serveur living-ai-documentation** pour partir d'un état propre, et **vider le cache Claude Code** (relancer la session) pour montrer une découverte du MCP en live.

> 💡 Si Internet est instable : préparer un fallback offline avec un projet `mon-test` déjà bootstrappé (Next.js installé, dépendances cachées) , la phase 1 risque le `npm install` qui peut prendre 90 s en wifi conférence.
