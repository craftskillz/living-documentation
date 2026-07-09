---
**date:** 2026-07-08
**status:** To be validated
**description:** Backlog de tickets pour aligner nativement living-documentation sur Google Open Knowledge Format (OKF) — migration algorithmique non-cassante du frontmatter vers YAML, garde de migration au démarrage, fichiers réservés, validateur, consommateurs.
**tags:** roadmap, okf, yaml-frontmatter, migration, cli-gate, interoperability, backlog
---

# ROADMAP — Alignement natif OKF

Décision cadre : [ADR — Align living-documentation natively with OKF](?doc=ADRS%252F2026_07_08_18_19_%255BOKF%255D_align_livingdocumentation_natively_with_google_open_knowledge_format_okf).

Objectif produit : le dossier `documentation/` **est** un bundle OKF conforme
(sur-ensemble), directement consommable par les outils OKF sans conversion, tout
en conservant la détection de dérive, le cycle de statut et le MCP.

Principe directeur : **rien ne casse pendant la migration**. On introduit d'abord
un lecteur qui comprend l'ancien et le nouveau format, puis on bascule l'écriture,
puis on migre les documents existants par un **algorithme déterministe**.

Convention de statut de ticket (section « Ordre recommandé ») : `[ ]` non démarré,
`[x] ~~Ticket XX - ...~~` terminé. À chaque ticket terminé : cocher ici + créer un
document `documentation/WORKLOG/AAAA_MM_JJ_HH_mm_[WORKLOG]_ticket_XX_<slug>.md`.

---

## Phase 1 — Fondations (non-cassant)

### Ticket 01 — Audit de conformité & table de mapping figée
- **Objectif** : figer, champ par champ, la correspondance living-doc ↔ OKF, et lister chaque exigence de conformance OKF v0.1 avec son état actuel.
- **Livrable** : un document technique `documentation/AI/` (ou ADR de convention) contenant la table de mapping définitive (`type`, `title`, `description`, `tags`, `timestamp`, `resource`, `status` custom, bloc `sources` custom) et la stratégie des liens.
- **Scope exclu** : tout code.
- **Acceptation** : chaque exigence OKF (frontmatter YAML, `type` requis, fichiers réservés, liens, versioning) est tracée à une décision.

### Ticket 02 — Lecteur frontmatter dual (YAML + legacy `**gras**`)
- **Objectif** : lire indifféremment le YAML OKF **et** l'ancien format `**clé:** valeur`, sans changer l'écriture. Base non-cassante de toute la migration.
- **Zones** : `src/lib/parser.ts`, `src/lib/documentLanguage.ts`, nouveau module `src/lib/frontmatter.ts` (parse/serialize centralisés).
- **Scope inclus** : détection auto du format, extraction unifiée `{ type?, title?, description?, tags?, timestamp?, status?, … }`.
- **Scope exclu** : écriture YAML (Ticket 04), migration disque (Ticket 05).
- **Acceptation** : tests unitaires sur les deux formats ; l'app et le MCP lisent les 106 ADR existants sans régression.
- **Dépend de** : T01.

### Ticket 03 — Modèle de concept OKF & dérivation du `type`
- **Objectif** : définir le frontmatter YAML canonique d'un document living-doc et la règle de dérivation du `type` (obligatoire OKF) à partir de la catégorie / du genre de document (ADR, Diagram, Concept, Technical Doc, Rule, Worklog…).
- **Livrable** : ADR de convention « Modèle de concept OKF » (durable).
- **Acceptation** : tout document futur sait produire un `type` non vide et déterministe.
- **Dépend de** : T01.

## Phase 2 — Conformité native

### Ticket 04 — Écriture YAML via MCP + flip de statut
- **Objectif** : `create_document` / `update_document` et le bouton Valider écrivent un frontmatter **YAML** conforme ; `status` en clé YAML.
- **Zones** : outils documents du serveur MCP, `src/lib/documentLanguage.ts`, `src/routes/documents.ts`.
- **Scope inclus** : sérialisation via `src/lib/frontmatter.ts` (T02) ; lecture legacy conservée.
- **Acceptation** : un nouvel ADR créé via MCP a un frontmatter YAML valide (`type` présent) et reste lisible par le viewer et par un parseur YAML tiers.
- **Dépend de** : T02, T03.

### Ticket 05 — Moulinette de migration déterministe (sans IA)
- **Objectif** : convertir tous les `documentation/**/*.md` du format `**gras**` vers YAML par un **algorithme purement déterministe (parse + regex, AUCUNE IA)**, idempotent et réversible en lecture (T02).
- **Contrainte forte** : pas d'appel LLM. La transformation est mécanique et reproductible :
  1. isoler le bloc `---…---` de tête ;
  2. pour chaque ligne `**clé:** valeur` → `clé: valeur` en YAML (échappement des valeurs contenant `:`/quotes, `tags` en liste YAML, `date → timestamp`) ;
  3. injecter le `type` dérivé (T03) ;
  4. laisser le corps Markdown intact.
- **Zones** : `scripts/migrate-frontmatter-to-okf.ts`, `src/lib/frontmatter.ts`.
- **Scope inclus** : mode `--dry-run`, rapport de migration (fichiers convertis / ignorés / en erreur), **écriture du flag de migration OKF dans `.living-doc.json` en fin de passe réussie** (voir T06).
- **Acceptation** : rejouable sans effet (idempotent) ; après migration `get_accuracy` des ADR inchangé (aucun binding source cassé) ; 100 % des docs ont un YAML valide avec `type` ; zéro appel réseau/IA.
- **Dépend de** : T03, T04.

### Ticket 06 — Garde de migration au démarrage (cli.ts) + flag OKF dans `.living-doc.json`
- **Objectif** : au démarrage, `cli.ts` vérifie si le projet est **migré OKF** via un flag dans `.living-doc.json` (ex. `okfMigration: { version: "0.1" }` ou `okfMigrated: true`). Si le projet n'est pas migré, **il refuse de l'ouvrir** et indique clairement à l'utilisateur que le projet doit d'abord être migré, en raison de l'alignement vers Google OKF.
- **Comportement** :
  - flag présent/valide → démarrage normal du serveur ;
  - flag absent/faux (ancien projet au format `**gras**`) → **arrêt avec message actionnable** : expliquer l'alignement OKF, et proposer/rappeler la commande de migration (ex. `npx living-ai-documentation migrate <dossier>`) ou un prompt interactif « migrer maintenant ? [o/N] » qui déclenche la moulinette (T05) ;
  - après migration réussie, le flag est écrit (T05) → les démarrages suivants passent sans blocage.
- **Zones** : `bin/cli.ts` (détection + gate + invocation de la moulinette), `src/lib/config.ts` (champ flag + `STORAGE_DEFAULTS`), `src/routes/config.ts` (validation).
- **Scope inclus** : détection, message, gate, branchement sur T05. Nouveau projet initialisé (starters YAML, T15) → flag déjà positionné, aucun blocage.
- **Scope exclu** : l'algorithme de conversion lui-même (T05).
- **Acceptation** : un projet legacy refuse de démarrer avec un message clair ; un projet migré démarre normalement ; le flag est la seule source de vérité du statut de migration.
- **Dépend de** : T05.

### Ticket 07 — Rendu viewer depuis YAML
- **Objectif** : le viewer strippe le frontmatter YAML du corps rendu et affiche un panneau métadonnées (pills de statut, jauge de fiabilité, tags) depuis les champs YAML.
- **Zones** : `src/frontend-svelte/src/lib/home/DocViewer.svelte`, `EditableMarkdown.svelte`, `md-renderer.ts`.
- **Note ADR** : révise [strip-frontmatter-from-rendering](?doc=ADRS%252F2026_04_08_10_30_%255BFRONTEND%255D_strip_frontmatter_from_article_rendering) (candidat `Partially SuperSeeded`).
- **Acceptation** : un doc migré s'affiche sans fuite de frontmatter et avec ses pills ; parité EN/FR.
- **Dépend de** : T05.

### Ticket 08 — Liens bundle-relatifs ↔ `?doc=`
- **Objectif** : mapping bidirectionnel entre les liens internes `[x](?doc=<id>)` et les liens OKF bundle-relatifs `/chemin.md`.
- **Zones** : `src/routes/export.ts` (déjà réécrit `?doc=` → `.md`), résolveur de liens du viewer.
- **Acceptation** : un lien OKF `/ADRS/....md` s'ouvre dans l'app ; l'export émet du bundle-relatif ; aucun lien mort introduit.
- **Dépend de** : T05.

## Phase 3 — Fichiers réservés & validation

### Ticket 09 — Génération des `index.md` (progressive disclosure)
- **Objectif** : générer un `index.md` par dossier (format OKF `* [Titre](url) - description`) + un `index.md` racine portant `okf_version: "0.1"`. Traiter `index.md`/`log.md` comme **noms réservés** (jamais des concepts) dans le listing.
- **Zones** : listing documents serveur, nouveau générateur `src/lib/okf/index-generator.ts`.
- **Acceptation** : chaque dossier a un `index.md` cohérent avec le frontmatter des concepts ; les fichiers réservés n'apparaissent pas comme documents dans l'app.
- **Dépend de** : T05.

### Ticket 10 — Génération du `log.md` depuis Git
- **Objectif** : produire le changelog OKF `log.md` (entrées `## AAAA-MM-JJ`) depuis l'historique Git du dossier docs.
- **Zones** : `src/lib/git-integration.ts`, générateur `src/lib/okf/log-generator.ts`.
- **Acceptation** : `log.md` conforme, régénérable, cohérent avec les versions existantes.
- **Dépend de** : T09.

### Ticket 11 — `resource` + bindings sources en bloc custom
- **Objectif** : adopter le champ OKF `resource` pour lier un concept à un actif vivant, et représenter les bindings source living-doc (hash + commit) comme un **bloc custom OKF-préservé** (`sources:`), pour que la dérive survive à un aller-retour OKF.
- **Zones** : stockage métadonnées, `add_metadata` / `refresh_metadata`, `frontmatter.ts`.
- **Acceptation** : un bundle exporté puis relu conserve les bindings ; un consommateur OKF tiers ignore proprement `sources:`.
- **Dépend de** : T04.

### Ticket 12 — Validateur de conformance OKF + hook CI
- **Objectif** : commande `okf:validate` vérifiant que `documentation/` est un bundle OKF conforme (tout `.md` non-réservé a un YAML parseable avec `type` non vide ; fichiers réservés bien formés).
- **Zones** : `scripts/okf-validate.ts`, intégration CI (aligné sur l'ADR CI publish gate).
- **Acceptation** : CI rouge si un document viole la conformance ; vert sur le dépôt migré.
- **Dépend de** : T05, T09, T10.

## Phase 4 — Consommateurs & écosystème

### Ticket 13 — Import d'un bundle OKF externe
- **Objectif** : importer un bundle OKF tiers dans un projet living-doc (mapping `type` → catégorie, liens, `timestamp`).
- **Zones** : nouvelle route d'import + UI Admin/Files.
- **Acceptation** : un bundle d'exemple Google (GA4 / Stack Overflow) s'importe et s'affiche.
- **Dépend de** : T02, T08.

### Ticket 14 — Visualiseur graphe de concepts (bonus)
- **Objectif** : vue graphe des concepts (à partir des liens) façon visualiseur OKF single-file, réutilisant l'infra diagramme.
- **Zones** : nouvelle route front.
- **Acceptation** : le graphe reflète les liens réels du bundle.
- **Dépend de** : T08.

### Ticket 15 — Mise à jour docs & instructions
- **Objectif** : basculer toute la documentation d'amorçage vers YAML : `PROJECT-INSTRUCTIONS.md`, guide serveur MCP, `README`, templates ADR/WORKLOG, starters (`starter-doc`, `starter-doc-fr`, avec flag OKF déjà positionné).
- **Note ADR** : révise le [guide serveur MCP](?doc=ADRS%252F2026_05_11_15_40_%255BMCP%255D_server_guide_and_feature_workflow_for_the_mcp) (frontmatter désormais YAML).
- **Acceptation** : plus aucune référence au format `**gras**` ; un nouveau projet initialisé est déjà un bundle OKF conforme, flag positionné, aucun blocage au démarrage.
- **Dépend de** : T04, T06, T09.

---

## Ordre recommandé

- [x] ~~Ticket 01 - Audit de conformité & table de mapping figée~~
- [x] ~~Ticket 02 - Lecteur frontmatter dual (YAML + legacy)~~
- [ ] Ticket 03 - Modèle de concept OKF & dérivation du `type`
- [ ] Ticket 04 - Écriture YAML via MCP + flip de statut
- [ ] Ticket 05 - Moulinette de migration déterministe (sans IA)
- [ ] Ticket 06 - Garde de migration au démarrage (cli.ts) + flag OKF
- [ ] Ticket 07 - Rendu viewer depuis YAML
- [ ] Ticket 08 - Liens bundle-relatifs ↔ `?doc=`
- [ ] Ticket 09 - Génération des `index.md`
- [ ] Ticket 10 - Génération du `log.md` depuis Git
- [ ] Ticket 11 - `resource` + bindings sources en bloc custom
- [ ] Ticket 12 - Validateur de conformance OKF + hook CI
- [ ] Ticket 13 - Import d'un bundle OKF externe
- [ ] Ticket 14 - Visualiseur graphe de concepts (bonus)
- [ ] Ticket 15 - Mise à jour docs & instructions

## Jalons

- **M1 — Lecture prête** : T01→T03 (rien ne casse, le YAML est compris).
- **M2 — Bundle natif conforme & garde de migration** : T04→T09 + T12 (le dépôt valide OKF, docs migrés par algorithme, démarrage bloqué tant que non migré).
- **M3 — Historique & assets** : T10, T11.
- **M4 — Écosystème** : T13→T15 (import, visualiseur, docs à jour).
