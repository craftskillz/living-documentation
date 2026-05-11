# MCP tool: `search_source`

## Description

Grep-like text search across files under the project `sourceRoot`.

Preferred over `read_source_file` when you only need to locate a symbol, identifier, or string. Returns `{ file, line, text }` matches.

## Schéma d'entrée

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Substring to match (plain text, not regex)."
    },
    "pattern": {
      "type": "string",
      "description": "Optional glob to restrict the search (e.g. `src/**/*.ts`)."
    },
    "caseSensitive": {
      "type": "boolean",
      "description": "Default false."
    },
    "maxResults": {
      "type": "number",
      "description": "Max number of matches to return (default 200, hard cap 1000)."
    }
  },
  "required": [
    "query"
  ]
}
```

## Requête effectuée

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_source",
    "arguments": {
      "query": "diagramme"
    }
  }
}
```

## Résultat

```json
{
  "sourceRoot": "/Users/ymedaghri/Documents/Repositories/Medaghri-Alaoui-Repositories/09_My_Published_Projects/living-documentation",
  "query": "diagramme",
  "count": 200,
  "matches": [
    {
      "file": "usermanual-documentation/2026_04_11_12_55_[GENERAL]_premiers_pas.md",
      "line": 76,
      "text": "### Diagrammes"
    },
    {
      "file": "usermanual-documentation/2026_04_11_12_55_[GENERAL]_premiers_pas.md",
      "line": 78,
      "text": "Créez des diagrammes interactifs via **⬡ Diagram** dans le header. Les diagrammes peuvent être liés à des articles via le bouton *⬡ Diagram* de l'éditeur. Un clic sur l'image du diagramme dans un article ouvre l'éditeur de diagramme."
    },
    {
      "file": "usermanual-documentation/2026_04_11_12_55_[GENERAL]_premiers_pas.md",
      "line": 92,
      "text": "- Le mode debug des diagrammes"
    },
    {
      "file": "usermanual-documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
      "line": 16,
      "text": "3. **Le levier technique** : un serveur MCP qui sérialise le contrat entre le LLM et la base documentaire, avec des garde-fous *enforced côté serveur* qui empêchent l'agent d'inventer des ADR fictifs ou des diagrammes hallucinés."
    },
    {
      "file": "usermanual-documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
      "line": 74,
      "text": "[![Diagramme context — Living Documentation](./images/living_documentation_context_demo_conf.png)](/diagram?id=d1777363627693)"
    },
    {
      "file": "usermanual-documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
      "line": 76,
      "text": "Le diagramme contient quatre nœuds : *Coding agent* (acteur), *Developer / Reader* (acteur), *Living Documentation* (système central) et *Local filesystem* (datastore). Les edges décrivent les trois interactions clés : invocation MCP par l'agent, navigation/édition par le développeur, et lecture/écriture sur le filesystem."
    },
    {
      "file": "usermanual-documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
      "line": 92,
      "text": "| Diagrammes | À jour quand quelqu'un s'en souvient | Garde-fous serveur — impossible d'inventer un acteur absent des docs |"
    },
    {
      "file": "usermanual-documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
      "line": 130,
      "text": "   Markdown, garde-fous diagrammes). Ce guide est ta source de vérité"
    },
    {
      "file": "usermanual-documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
      "line": 221,
      "text": "### Phase 4 — Diagrammes garde-fous (2 min)"
    },
    {
      "file": "usermanual-documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
      "line": 239,
      "text": "3. Les diagrammes ont des **garde-fous serveur** (`userRequestedExplicitly: true` requis pour container/UML, type `image` rejeté sans `imageSrc`, contract docs-source-of-truth enforcé)."
    },
    {
      "file": "usermanual-documentation/5_talks/2026_04_28_09_48_[CONFERENCE]_demo_living_documentation_mcp_en_conference.md",
      "line": 304,
      "text": "- Diagrammes liés : [Creer Et Lier Un Diagramme](?doc=2_guide%252F2026_04_09_14_00_%255BDIAGRAM%255D_creer_et_lier_un_diagramme)"
    },
    {
      "file": "usermanual-documentation/4_reference/2026_04_08_23_14_[FUNDAMENTALS]_the_living_documentation_tool.md",
      "line": 25,
      "text": "- **Résoudre le problème des diagrammes** avec un éditeur intégré dont la source est stockée dans le même dossier que les documents"
    },
    {
      "file": "usermanual-documentation/4_reference/2026_04_09_01_00_[REFERENCE]_raccourcis_clavier.md",
      "line": 13,
      "text": "### Éditeur de diagramme (`/diagram`)"
    },
    {
      "file": "usermanual-documentation/4_reference/2026_04_09_01_00_[REFERENCE]_raccourcis_clavier.md",
      "line": 19,
      "text": "| `Cmd/Ctrl + S`       | Sauvegarder le diagramme                 |"
    },
    {
      "file": "usermanual-documentation/4_reference/2026_04_09_01_00_[REFERENCE]_raccourcis_clavier.md",
      "line": 61,
      "text": "| `Clic` sur une image liée | Naviguer vers la destination (document, diagramme, URL externe) |"
    },
    {
      "file": "usermanual-documentation/4_reference/2026_04_09_03_00_[REFERENCE]_types_de_snippets.md",
      "line": 16,
      "text": "| **Lien vers un diagramme** | Image cliquable ouvrant l'éditeur de diagramme           | `[![Alt](./images/img.png)](/diagram?id=<id>)`                |"
    },
    {
      "file": "usermanual-documentation/3_concept/2026_04_08_20_58_[DOCUMENTING]_ADRS.md",
      "line": 9,
      "text": "- Les **diagrammes** : l'ADR affiche un beau PNG généré depuis un outil visuel (parce que mermaid ca va un moment !!)"
    },
    {
      "file": "usermanual-documentation/3_concept/2026_04_08_20_58_[DOCUMENTING]_ADRS.md",
      "line": 10,
      "text": "Mais le fichier source du diagramme a disparu depuis longtemps ➔ Le PNG ne sera jamais mis à jour ➔ Documentation obsolete ➔ C'est dommage car moi perso je suis un visuel"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_08_00_04_[DOCUMENT]_utilisation_des_images_plein_ecran_lien_clickable.md",
      "line": 31,
      "text": "- liée à un **diagramme** de `living documentation`"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_11_00_[CONFIGURATION]_configurer_le_panneau_admin.md",
      "line": 48,
      "text": "### Activer le mode debug des diagrammes"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_11_00_[CONFIGURATION]_configurer_le_panneau_admin.md",
      "line": 53,
      "text": "En mode debug, un bouton `dbg` apparaît dans la barre d'outils de l'éditeur de diagramme. Il affiche les coordonnées et dimensions de chaque nœud sous forme d'overlays DOM."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_11_00_[CONFIGURATION]_configurer_le_panneau_admin.md",
      "line": 55,
      "text": "Utile pour diagnostiquer des problèmes de positionnement dans les diagrammes."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 1,
      "text": "## Créer un diagramme et le lier à un document"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 3,
      "text": "L'éditeur de diagrammes est intégré dans Living Documentation. Les diagrammes sont stockés dans le même dossier que vos documents, versionnable avec votre code."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 7,
      "text": "### Créer un nouveau diagramme"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 11,
      "text": "   L'éditeur de diagramme s'ouvre dans un nouvel onglet (ou dans la même page selon votre navigateur)."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 13,
      "text": "2. Dans la liste de diagrammes (panneau gauche), cliquez sur **`+ New diagram`**."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 15,
      "text": "3. Donnez un nom à votre diagramme."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 17,
      "text": "4. Construisez votre diagramme :"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 25,
      "text": "   Le diagramme est sauvegardé sous forme JSON dans `DOCS_FOLDER/.diagrams/`."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 29,
      "text": "### Exporter le diagramme en PNG"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 39,
      "text": "### Lier le diagramme à un document"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 41,
      "text": "Une fois le PNG exporté, insérez-le dans votre document Markdown en tant qu'image cliquable pointant vers l'éditeur de diagramme."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 43,
      "text": "**En mode édition**, utilisez le snippet **`Lien vers un diagramme`** :"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 46,
      "text": "2. Cliquez **`🧩 Snippets`** → **`Lien vers un diagramme`**"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 49,
      "text": "   - L'ID du diagramme (visible dans l'URL de l'éditeur : `/diagram?id=d1234567890`)"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 55,
      "text": "[![Mon diagramme](./images/diagram-d1234567890.png)](/diagram?id=d1234567890)"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 58,
      "text": "✅ Dans l'article, un clic sur l'image ouvre l'éditeur de diagramme."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 63,
      "text": "### Deep-link vers un diagramme spécifique"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 65,
      "text": "Vous pouvez créer un lien direct vers un diagramme depuis n'importe quel document :"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 68,
      "text": "[Voir le diagramme d'architecture](/diagram?id=d1234567890)"
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 71,
      "text": "Au chargement de l'éditeur, le diagramme correspondant est ouvert automatiquement."
    },
    {
      "file": "usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md",
      "line": 77,
      "text": "Le bouton **`← Back`** dans l'éditeur de diagramme appelle `history.back()` et retourne à la page qui a ouvert le diagramme (généralement l'article qui contient l'image)."
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 31,
      "text": "  \"nav.diagram\": \"◇ Diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 217,
      "text": "  \"modal.diag_link.title\": \"◇ Lier un diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 218,
      "text": "  \"modal.diag_link.existing_radio\": \"Diagramme existant\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 219,
      "text": "  \"modal.diag_link.new_radio\": \"Nouveau diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 220,
      "text": "  \"modal.diag_link.select_label\": \"Sélectionner un diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 221,
      "text": "  \"modal.diag_link.name_label\": \"Nom du diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 222,
      "text": "  \"modal.diag_link.name_placeholder\": \"Mon diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 226,
      "text": "  \"modal.diag_link.insert_btn\": \"Insérer & Ouvrir le diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 228,
      "text": "  \"modal.diag_link.no_diagrams\": \"Aucun diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 232,
      "text": "  \"snippet.diagram\": \"◇ Diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 290,
      "text": "  \"snippet.diagram_existing\": \"Diagramme existant\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 291,
      "text": "  \"snippet.diagram_new\": \"Nouveau diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 292,
      "text": "  \"snippet.diagram_select_label\": \"Sélectionner un diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 293,
      "text": "  \"snippet.diagram_no_diagrams\": \"Aucun diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 294,
      "text": "  \"snippet.diagram_name_label\": \"Nom du diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 295,
      "text": "  \"snippet.diagram_name_placeholder\": \"Nom du diagramme…\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 299,
      "text": "  \"snippet.insert_open_btn\": \"Insérer & Ouvrir le diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 368,
      "text": "  \"error.create_diagram\": \"Erreur lors de la création du diagramme : \","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 372,
      "text": "  \"error.no_diagrams\": \"Aucun diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 401,
      "text": "  \"admin.section.diagram.title\": \"Palettes de diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 402,
      "text": "  \"admin.section.diagram.desc\": \"Personnalisez les couleurs disponibles dans l'éditeur de diagrammes.\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 419,
      "text": "  \"admin.appearance.debug_label\": \"Afficher le bouton debug dans l'éditeur de diagrammes\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 453,
      "text": "  \"admin.palette.title\": \"Palettes de couleurs des diagrammes\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 454,
      "text": "  \"admin.palette.description\": \"Personnalisez les couleurs disponibles dans l'éditeur de diagrammes. Les modifications prennent effet après enregistrement.\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 477,
      "text": "  \"diagram.diagrams_list_title\": \"Mes diagrammes\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 478,
      "text": "  \"diagram.toolbar.copy_mcp_id\": \"Copier l'id MCP du diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 479,
      "text": "  \"diagram.toolbar.copy_mcp_id_copied\": \"Id MCP du diagramme copié\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 497,
      "text": "  \"diagram.toolbar.title_placeholder\": \"Titre du diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 504,
      "text": "  \"diagram.sidebar.title\": \"Diagrammes\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 506,
      "text": "  \"diagram.sidebar.empty\": \"Aucun diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 542,
      "text": "  \"diagram.link_panel.existing_diagram\": \"Diagramme existant\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 543,
      "text": "  \"diagram.link_panel.new_diagram\": \"Nouveau diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 544,
      "text": "  \"diagram.link_panel.diagram_name_placeholder\": \"Nom du diagramme…\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 581,
      "text": "  \"diagram.empty_state\": \"Sélectionne ou crée un diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 595,
      "text": "  \"diagram.toast.diagram_saved_png\": \"Diagramme enregistré en tant qu'image\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 599,
      "text": "  \"diagram.toast.diagram_id_copied\": \"Id du diagramme copié dans le presse-papier\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 600,
      "text": "  \"diagram.toast.confirm_delete\": \"Supprimer ce diagramme ?\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 601,
      "text": "  \"diagram.toast.new_diagram_title\": \"Nouveau diagramme\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 603,
      "text": "  \"diagram.toast.diagram_linked\": \"Diagramme \\\"{title}\\\" créé et lié\","
    },
    {
      "file": "src/frontend/i18n/fr.json",
      "line": 605,
      "text": "  \"shape_editor.show_in_diagram_label\": \"Afficher dans la palette du diagramme\","
    },
    {
      "file": "documentation/2026_04_11_12_55_[General]_premiers_pas.md",
      "line": 76,
      "text": "### Diagrammes"
    },
    {
      "file": "documentation/2026_04_11_12_55_[General]_premiers_pas.md",
      "line": 78,
      "text": "Créez des diagrammes interactifs via **⬡ Diagram** dans le header. Les diagrammes peuvent être liés à des articles via le bouton *⬡ Diagram* de l'éditeur. Un clic sur l'image du diagramme dans un article ouvre l'éditeur de diagramme."
    },
    {
      "file": "documentation/2026_04_11_12_55_[General]_premiers_pas.md",
      "line": 92,
      "text": "- Le mode debug des diagrammes"
    },
    {
      "file": "documentation/AI/PROJECT-STACK.md",
      "line": 23,
      "text": "L'utilisateur lance le CLI avec un dossier de documentation relatif, par exemple `npx living-documentation ./documentation`. L'application sert ensuite une UI locale permettant de lire, rechercher, éditer, annoter, exporter et diagrammer les documents Markdown. Les documents, images, fichiers joints, diagrammes, métadonnées et configuration restent sur disque, dans ou près du dossier de documentat"
    },
    {
      "file": "documentation/AI/PROJECT-STACK.md",
      "line": 58,
      "text": "src/frontend/diagram.html          <- shell éditeur de diagrammes"
    },
    {
      "file": "documentation/AI/PROJECT-STACK.md",
      "line": 86,
      "text": "- **MCP Living Documentation** : canal privilégié pour agents IA ; expose lecture/écriture documents, diagrammes, source et métadonnées."
    },
    {
      "file": "documentation/AI/PROJECT-STACK.md",
      "line": 88,
      "text": "- **Diagrammes** : vues dérivées de la documentation, stockées en JSON et éditées via vis-network ; les diagrammes MCP doivent citer leur provenance documentaire (`evidence`)."
    },
    {
      "file": "documentation/AI/PROJECT-STACK.md",
      "line": 94,
      "text": "- **Documentation comme source de vérité** : pour les diagrammes MCP, lire ou créer les documents source-of-truth avant de dessiner ; ne pas inventer d'acteurs ou relations absents des documents."
    },
    {
      "file": "documentation/AI/PROJECT-STACK.md",
      "line": 99,
      "text": "- **vis-network fragile** : avant de toucher au rendu diagramme, vérifier les ADR et règles sur `ctxRenderer`, `getBoundingBox`, `refreshNeeded`, `_drawNodes` et `_canonicalOrder`."
    },
    {
      "file": "documentation/AI/rules/diagram-vis-network-gotchas.md",
      "line": 5,
      "text": "description: Le rendu diagramme dépend de plusieurs contournements vis-network documentés ; les modifier sans les vérifier peut casser le z-order, les formes custom ou le resize."
    },
    {
      "file": "documentation/AI/rules/diagram-vis-network-gotchas.md",
      "line": 10,
      "text": "Avant de modifier le rendu ou les interactions de l'éditeur de diagrammes, vérifier les ADR pertinents et ces contraintes :"
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 125,
      "text": "    \"id\": \"2_guide%2F2026_04_09_14_00_%5BDIAGRAM%5D_creer_et_lier_un_diagramme\","
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 126,
      "text": "    \"title\": \"Creer Et Lier Un Diagramme\","
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 129,
      "text": "    \"linkHref\": \"?doc=2_guide%252F2026_04_09_14_00_%255BDIAGRAM%255D_creer_et_lier_un_diagramme\""
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 307,
      "text": "    \"id\": \"ADRS%2F2026_04_12_%5BDIAGRAM%5D_insertion_diagramme_via_snippet_et_sauvegarde_auto_png\","
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 308,
      "text": "    \"title\": \"Insertion Diagramme Via Snippet Et Sauvegarde Auto Png\","
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 311,
      "text": "    \"linkHref\": \"?doc=ADRS%252F2026_04_12_%255BDIAGRAM%255D_insertion_diagramme_via_snippet_et_sauvegarde_auto_png\""
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 566,
      "text": "    \"id\": \"ADRS%2F2026_05_07_23_23_%5BDIAGRAM%5D_layout_deterministe_des_diagrammes_mcp\","
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 567,
      "text": "    \"title\": \"Layout Deterministe Des Diagrammes Mcp\","
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 570,
      "text": "    \"linkHref\": \"?doc=ADRS%252F2026_05_07_23_23_%255BDIAGRAM%255D_layout_deterministe_des_diagrammes_mcp\""
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 657,
      "text": "    \"id\": \"ADRS%2F2026_05_11_20_03_%5BDIAGRAM%5D_copie_id_diagramme_mcp_depuis_topbar_editeur\","
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 658,
      "text": "    \"title\": \"Copie Id Diagramme Mcp Depuis Topbar Editeur\","
    },
    {
      "file": "documentation/AI/MCP/002-tool-list-documents.md",
      "line": 661,
      "text": "    \"linkHref\": \"?doc=ADRS%252F2026_05_11_20_03_%255BDIAGRAM%255D_copie_id_diagramme_mcp_depuis_topbar_editeur\""
    },
    {
      "file": "documentation/AI/MCP/005-tool-list-source-files.md",
      "line": 70,
      "text": "    \"documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/005-tool-list-source-files.md",
      "line": 96,
      "text": "    \"documentation/ADRS/2026_04_12_[DIAGRAM]_insertion_diagramme_via_snippet_et_sauvegarde_auto_png.md\","
    },
    {
      "file": "documentation/AI/MCP/005-tool-list-source-files.md",
      "line": 133,
      "text": "    \"documentation/ADRS/2026_05_07_23_23_[DIAGRAM]_layout_deterministe_des_diagrammes_mcp.md\","
    },
    {
      "file": "documentation/AI/MCP/005-tool-list-source-files.md",
      "line": 146,
      "text": "    \"documentation/ADRS/2026_05_11_20_03_[DIAGRAM]_copie_id_diagramme_mcp_depuis_topbar_editeur.md\","
    },
    {
      "file": "documentation/AI/MCP/005-tool-list-source-files.md",
      "line": 350,
      "text": "    \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 4,
      "text": "  \"query\": \"diagramme\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 10,
      "text": "      \"text\": \"### Diagrammes\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 15,
      "text": "      \"text\": \"Créez des diagrammes interactifs via **⬡ Diagram** dans le header. Les diagrammes peuvent être liés à des articles via le bouton *⬡ Diagram* de l'éditeur. Un clic sur l'image du diagramme dans un article ouvre l'éditeur de diagramme.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 20,
      "text": "      \"text\": \"- Le mode debug des diagrammes\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 25,
      "text": "      \"text\": \"3. **Le levier technique** : un serveur MCP qui sérialise le contrat entre le LLM et la base documentaire, avec des garde-fous *enforced côté serveur* qui empêchent l'agent d'inventer des ADR fictifs ou des diagrammes hallucinés.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 30,
      "text": "      \"text\": \"[![Diagramme context — Living Documentation](./images/living_documentation_context_demo_conf.png)](/diagram?id=d1777363627693)\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 35,
      "text": "      \"text\": \"Le diagramme contient quatre nœuds : *Coding agent* (acteur), *Developer / Reader* (acteur), *Living Documentation* (système central) et *Local filesystem* (datastore). Les edges décrivent les trois interactions clés : invocation MCP par l'agent, navigation/édition par le développeur, et lecture/écriture sur le filesystem.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 40,
      "text": "      \"text\": \"| Diagrammes | À jour quand quelqu'un s'en souvient | Garde-fous serveur — impossible d'inventer un acteur absent des docs |\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 45,
      "text": "      \"text\": \"   Markdown, garde-fous diagrammes). Ce guide est ta source de vérité\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 50,
      "text": "      \"text\": \"### Phase 4 — Diagrammes garde-fous (2 min)\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 55,
      "text": "      \"text\": \"3. Les diagrammes ont des **garde-fous serveur** (`userRequestedExplicitly: true` requis pour container/UML, type `image` rejeté sans `imageSrc`, contract docs-source-of-truth enforcé).\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 60,
      "text": "      \"text\": \"- Diagrammes liés : [Creer Et Lier Un Diagramme](?doc=2_guide%252F2026_04_09_14_00_%255BDIAGRAM%255D_creer_et_lier_un_diagramme)\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 65,
      "text": "      \"text\": \"- **Résoudre le problème des diagrammes** avec un éditeur intégré dont la source est stockée dans le même dossier que les documents\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 70,
      "text": "      \"text\": \"### Éditeur de diagramme (`/diagram`)\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 75,
      "text": "      \"text\": \"| `Cmd/Ctrl + S`       | Sauvegarder le diagramme                 |\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 80,
      "text": "      \"text\": \"| `Clic` sur une image liée | Naviguer vers la destination (document, diagramme, URL externe) |\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 85,
      "text": "      \"text\": \"| **Lien vers un diagramme** | Image cliquable ouvrant l'éditeur de diagramme           | `[![Alt](./images/img.png)](/diagram?id=<id>)`                |\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 90,
      "text": "      \"text\": \"- Les **diagrammes** : l'ADR affiche un beau PNG généré depuis un outil visuel (parce que mermaid ca va un moment !!)\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 95,
      "text": "      \"text\": \"Mais le fichier source du diagramme a disparu depuis longtemps ➔ Le PNG ne sera jamais mis à jour ➔ Documentation obsolete ➔ C'est dommage car moi perso je suis un visuel\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 100,
      "text": "      \"text\": \"- liée à un **diagramme** de `living documentation`\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 105,
      "text": "      \"text\": \"### Activer le mode debug des diagrammes\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 110,
      "text": "      \"text\": \"En mode debug, un bouton `dbg` apparaît dans la barre d'outils de l'éditeur de diagramme. Il affiche les coordonnées et dimensions de chaque nœud sous forme d'overlays DOM.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 115,
      "text": "      \"text\": \"Utile pour diagnostiquer des problèmes de positionnement dans les diagrammes.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 118,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 120,
      "text": "      \"text\": \"## Créer un diagramme et le lier à un document\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 123,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 125,
      "text": "      \"text\": \"L'éditeur de diagrammes est intégré dans Living Documentation. Les diagrammes sont stockés dans le même dossier que vos documents, versionnable avec votre code.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 128,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 130,
      "text": "      \"text\": \"### Créer un nouveau diagramme\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 133,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 135,
      "text": "      \"text\": \"   L'éditeur de diagramme s'ouvre dans un nouvel onglet (ou dans la même page selon votre navigateur).\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 138,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 140,
      "text": "      \"text\": \"2. Dans la liste de diagrammes (panneau gauche), cliquez sur **`+ New diagram`**.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 143,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 145,
      "text": "      \"text\": \"3. Donnez un nom à votre diagramme.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 148,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 150,
      "text": "      \"text\": \"4. Construisez votre diagramme :\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 153,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 155,
      "text": "      \"text\": \"   Le diagramme est sauvegardé sous forme JSON dans `DOCS_FOLDER/.diagrams/`.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 158,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 160,
      "text": "      \"text\": \"### Exporter le diagramme en PNG\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 163,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 165,
      "text": "      \"text\": \"### Lier le diagramme à un document\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 168,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 170,
      "text": "      \"text\": \"Une fois le PNG exporté, insérez-le dans votre document Markdown en tant qu'image cliquable pointant vers l'éditeur de diagramme.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 173,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 175,
      "text": "      \"text\": \"**En mode édition**, utilisez le snippet **`Lien vers un diagramme`** :\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 178,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 180,
      "text": "      \"text\": \"2. Cliquez **`🧩 Snippets`** → **`Lien vers un diagramme`**\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 183,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 185,
      "text": "      \"text\": \"   - L'ID du diagramme (visible dans l'URL de l'éditeur : `/diagram?id=d1234567890`)\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 188,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 190,
      "text": "      \"text\": \"[![Mon diagramme](./images/diagram-d1234567890.png)](/diagram?id=d1234567890)\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 193,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 195,
      "text": "      \"text\": \"✅ Dans l'article, un clic sur l'image ouvre l'éditeur de diagramme.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 198,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 200,
      "text": "      \"text\": \"### Deep-link vers un diagramme spécifique\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 203,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 205,
      "text": "      \"text\": \"Vous pouvez créer un lien direct vers un diagramme depuis n'importe quel document :\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 208,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 210,
      "text": "      \"text\": \"[Voir le diagramme d'architecture](/diagram?id=d1234567890)\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 213,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 215,
      "text": "      \"text\": \"Au chargement de l'éditeur, le diagramme correspondant est ouvert automatiquement.\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 218,
      "text": "      \"file\": \"usermanual-documentation/2_guide/2026_04_09_14_00_[DIAGRAM]_creer_et_lier_un_diagramme.md\","
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 220,
      "text": "      \"text\": \"Le bouton **`← Back`** dans l'éditeur de diagramme appelle `history.back()` et retourne à la page qui a ouvert le diagramme (généralement l'article qui contient l'image).\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 225,
      "text": "      \"text\": \"  \\\"nav.diagram\\\": \\\"◇ Diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 230,
      "text": "      \"text\": \"  \\\"modal.diag_link.title\\\": \\\"◇ Lier un diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 235,
      "text": "      \"text\": \"  \\\"modal.diag_link.existing_radio\\\": \\\"Diagramme existant\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 240,
      "text": "      \"text\": \"  \\\"modal.diag_link.new_radio\\\": \\\"Nouveau diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 245,
      "text": "      \"text\": \"  \\\"modal.diag_link.select_label\\\": \\\"Sélectionner un diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 250,
      "text": "      \"text\": \"  \\\"modal.diag_link.name_label\\\": \\\"Nom du diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 255,
      "text": "      \"text\": \"  \\\"modal.diag_link.name_placeholder\\\": \\\"Mon diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 260,
      "text": "      \"text\": \"  \\\"modal.diag_link.insert_btn\\\": \\\"Insérer & Ouvrir le diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 265,
      "text": "      \"text\": \"  \\\"modal.diag_link.no_diagrams\\\": \\\"Aucun diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 270,
      "text": "      \"text\": \"  \\\"snippet.diagram\\\": \\\"◇ Diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 275,
      "text": "      \"text\": \"  \\\"snippet.diagram_existing\\\": \\\"Diagramme existant\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 280,
      "text": "      \"text\": \"  \\\"snippet.diagram_new\\\": \\\"Nouveau diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 285,
      "text": "      \"text\": \"  \\\"snippet.diagram_select_label\\\": \\\"Sélectionner un diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 290,
      "text": "      \"text\": \"  \\\"snippet.diagram_no_diagrams\\\": \\\"Aucun diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 295,
      "text": "      \"text\": \"  \\\"snippet.diagram_name_label\\\": \\\"Nom du diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 300,
      "text": "      \"text\": \"  \\\"snippet.diagram_name_placeholder\\\": \\\"Nom du diagramme…\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 305,
      "text": "      \"text\": \"  \\\"snippet.insert_open_btn\\\": \\\"Insérer & Ouvrir le diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 310,
      "text": "      \"text\": \"  \\\"error.create_diagram\\\": \\\"Erreur lors de la création du diagramme : \\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 315,
      "text": "      \"text\": \"  \\\"error.no_diagrams\\\": \\\"Aucun diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 320,
      "text": "      \"text\": \"  \\\"admin.section.diagram.title\\\": \\\"Palettes de diagramme\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 325,
      "text": "      \"text\": \"  \\\"admin.section.diagram.desc\\\": \\\"Personnalisez les couleurs disponibles dans l'éditeur de diagrammes.\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 330,
      "text": "      \"text\": \"  \\\"admin.appearance.debug_label\\\": \\\"Afficher le bouton debug dans l'éditeur de diagrammes\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 335,
      "text": "      \"text\": \"  \\\"admin.palette.title\\\": \\\"Palettes de couleurs des diagrammes\\\",\""
    },
    {
      "file": "documentation/AI/MCP/018-tool-search-source.md",
      "line": 340,
      "text": "      \"text\": \"  \\\"admin.palette.description\\\": \\\"Personnalisez les couleurs disponibles dans l'éditeur de diagrammes. Les modifications prennent effet après enregistrement.\\\",\""
    }
  ]
}
```
