---
**date:** 2026-05-11
**status:** To be validated
**description:** Les boutons "Run tool" et "Get prompt" de la page /context n'affichent plus la sortie inline mais l'enregistrent en .md sous DOCS_FOLDER/AI/MCP via POST /api/context/mcp-result. Le nom du fichier suit le schéma `<index>-<kind>-<slug>.md` (kind = tool ou prompt, index monotone paddé à 3 chiffres) pour garantir un ordre stable et lisible dans la sidebar. Le panneau de résultat est remplacé par un lien cliquable qui ouvre le document dans le viewer principal.
**tags:** ai-context, mcp-explorer, /api/context/mcp-result, runMcpItem, formatMcpDisplayValue, documentHref, AI/MCP, save-as-markdown, indexed-naming, kind-prefix, path-traversal-guard
---

# Sauvegarde des résultats MCP en documents Markdown

## Contexte

La page `/context` (cf. ADR [AI Context page](?doc=adrs%252F2026_05_11_15_41_%255BAI_CONTEXT%255D_ai_context_page_orientation_instructions_rules_and_mcp_explorer)) embarquait un explorateur MCP avec un bouton **Run tool** / **Get prompt** par item. Le résultat de l'appel JSON-RPC s'affichait inline dans un `<pre><code>` sous le bouton. Limitations :

- Les sorties d'outils comme `get_server_guide` sont du Markdown riche (~280 lignes pour le guide complet). Lues dans un `<pre>` sans rendu, elles deviennent illisibles : pas de syntax highlighting, pas de hiérarchie de titres, pas de tables, pas de liens cliquables.
- Le résultat n'est pas réutilisable : impossible de le partager, l'annoter, le re-consulter sans re-jouer l'appel.
- L'expérience est dissonante : l'outil Living Documentation sait afficher du Markdown avec confort dans son viewer principal, mais le réservait à des documents persistés.

Une première itération sauvegardait chaque résultat sous `AI/MCP/<name>.md` (nom MCP brut). Problème : la sidebar listait les fichiers par ordre alphabétique, ce qui mélangeait tools et prompts et masquait l'ordre métier de la liste affichée dans l'explorateur. Pour un dossier qui sert de **journal de session**, il fallait un ordre déterministe, séparer tools et prompts visuellement, et garder le rapprochement avec le nom MCP.

## Décision

### 1. Endpoint `POST /api/context/mcp-result`

[src/routes/context.ts](src/routes/context.ts) expose :

- Constantes `AI_MCP_DIR = "AI/MCP"` et `MCP_NAME_PATTERN = /^[A-Za-z0-9._-]+$/`.
- Endpoint `POST /api/context/mcp-result` qui accepte `{ name, kind, content }` :
  - `kind` doit valoir `"tool"` ou `"prompt"` — toute autre valeur (ou absence) → `400`.
  - Strip un éventuel suffixe `.md` du nom avant validation, puis le re-applique.
  - Valide le nom contre `MCP_NAME_PATTERN` (alphanumérique + `.`, `-`, `_` uniquement) — bloque la traversée de chemin (`../`, `/`, etc.).
  - **Slugification** : les underscores du nom MCP sont convertis en tirets (`get_server_guide` → `get-server-guide`) pour produire une partie `<slug>` cohérente en kebab-case.
  - `mkdirSync(mcpDir, { recursive: true })` crée `AI/MCP/` si nécessaire.
  - **Stratégie de nommage** (cf. section 3) — recherche d'un fichier existant pour le couple `(kind, slug)`, sinon prochain index libre.
  - `writeFileSync` **écrase** sans état intermédiaire : un même outil rejoué pousse simplement la dernière version au même emplacement.
  - Retourne `{ path: "AI/MCP/<NNN>-<kind>-<slug>.md" }` (POSIX, relatif au docsFolder).
- Garde de sécurité supplémentaire : `target.startsWith(path.resolve(docsPath) + path.sep)` rejette toute résolution qui sortirait du docsFolder, en doublure du regex.

### 2. Flux `runMcpItem` côté page

[src/frontend/context.html](src/frontend/context.html) :

- Le `<pre data-mcp-result>` est remplacé par un `<div data-mcp-result>` plus polyvalent (peut héberger un message « Running… », un lien, rien).
- Trois helpers remplacent l'ancien `setMcpResult` :
  - `setMcpRunning(kind, name)` — état transitoire pendant l'appel.
  - `setMcpResultLink(kind, name, docPath)` — sur succès, injecte un `<a>` stylé (pill verte, monospace, target `_blank`) construit via le helper existant `documentHref(docPath)`.
  - `setMcpResultError(kind, name, message)` — masque le conteneur et écrit dans `data-mcp-error` (zone rouge existante).
- `runMcpItem` :
  1. Garde la validation JSON locale et l'init MCP.
  2. Détecte une erreur applicative (`envelope.error` ou `result.isError`) → `setMcpResultError`.
  3. Sinon, formate l'enveloppe en texte Markdown via `formatMcpDisplayValue` (déjà existant — extrait `result.content[*].text` pour les tools, `result.messages[*].content` pour les prompts).
  4. POSTe le markdown à `/api/context/mcp-result` via `saveMcpResult(name, content, kind)` — `kind` est désormais propagé pour que le serveur puisse l'inclure dans le nom de fichier.
  5. Sur succès, `setMcpResultLink` rend le lien vers le document final.

### 3. Nommage des fichiers

Format unique : `<NNN>-<kind>-<slug>.md`

- `NNN` — index monotone paddé à 3 chiffres (`001`, `002`, … `999`). Permet à la sidebar de **respecter l'ordre d'enregistrement** : les premiers outils exécutés apparaissent en haut, les plus récents en bas.
- `<kind>` — littéral `tool` ou `prompt`. Sépare visuellement les deux familles dans la liste alphabétique.
- `<slug>` — nom MCP avec les `_` remplacés par `-` (préservation du reste).

Exemples produits :

```
AI/MCP/
├── 001-tool-get-server-guide.md
├── 002-tool-list-documents.md
├── 003-tool-create-diagram.md
├── 004-prompt-create-adr.md
└── 018-prompt-audit-doc-drift.md
```

**Calcul de l'index** :

1. Lister le contenu de `AI/MCP/`, matcher chaque entrée contre `^(\d{3})-(tool|prompt)-(.+)\.md$`.
2. Si un fichier existant correspond au couple `(kind, slug)` demandé → **réutiliser son chemin** (overwrite préserve l'index). Garantit qu'un même outil rejoué n'inonde pas le dossier de doublons indexés.
3. Sinon → `next = max(indices observés) + 1`, paddé à 3 chiffres. Un dossier vide démarre à `001`.

**Suppressions** : si l'utilisateur efface manuellement `005-tool-foo.md`, l'index `005` reste libre mais la séquence **n'est pas renumérotée**. Le prochain enregistrement neuf prendra `max+1` (donc créera un trou). Compromis volontaire : éviter de renommer en cascade les fichiers existants (ce qui casserait les liens externes et l'historique git lisible).

**Migration** : les fichiers antérieurs au schéma indexé (ex. `AI/MCP/get_server_guide.md`) restent en place mais ne sont **plus retrouvés** comme correspondance — la prochaine exécution du même tool créera un fichier indexé à côté. Le dossier peut être nettoyé manuellement si on veut repartir d'une séquence propre.

### 4. i18n

[src/frontend/i18n/en.json](src/frontend/i18n/en.json) + [fr.json](src/frontend/i18n/fr.json) ajoutent `context.mcp_saved_to` (« Saved to: » / « Enregistré dans : ») affiché juste au-dessus du lien.

## Conséquences

### PROS

- Le résultat de chaque appel MCP est désormais consultable avec le **confort complet du viewer** : titres, code highlighting, liens internes cross-doc, ancres, table des matières, export PDF.
- Les sorties deviennent des **artefacts navigables** : un agent ou un humain peut re-référencer la dernière exécution de `get_server_guide` via une URL stable.
- **Ordre déterministe** : la sidebar liste les fichiers dans l'ordre d'enregistrement grâce à l'index numérique paddé. Les batchs "Run all tools" / "Get all prompts" produisent une séquence contiguë et lisible.
- **Séparation tool / prompt** : le préfixe `tool-` ou `prompt-` regroupe visuellement les deux familles, ce que ne permettait pas le nom MCP brut.
- L'overwrite par couple `(kind, slug)` garantit qu'on ne crée pas d'historique parasite : à tout instant le fichier indexé reflète la dernière exécution de ce tool/prompt précis.

### CONS

- L'écrasement masque l'historique : pas de retour en arrière si on rejoue avec des arguments cassés. Atténué par git côté repo, et acceptable puisque ce dossier représente du contenu reproductible (relancer l'outil regénère le fichier).
- L'index est plafonné à 999 par le padding à 3 chiffres. Suffisant pour un usage de journal de session local ; si on dépasse, le serveur écrira `1000-tool-...` qui sortira du tri attendu — déclencheur à élargir si besoin.
- Les suppressions manuelles **laissent des trous** dans la séquence. Pas de renumérotation automatique pour préserver les URLs et la stabilité git.
- Deux serveurs MCP exposant un tool homonyme produiraient le même `<slug>` et écraseraient mutuellement leur fichier indexé. Pas pertinent dans l'usage actuel (un seul serveur, local).
- La validation `^[A-Za-z0-9._-]+$` refuse les caractères Unicode et l'espace. Conforme aux conventions de nommage MCP (snake_case / kebab-case ASCII).
- Le panneau de résultat ne montre plus le markdown brut — l'utilisateur doit faire un clic supplémentaire pour le consulter. Compromis volontaire : la valeur d'usage est dans la lecture confortable, pas dans le diff brut.
