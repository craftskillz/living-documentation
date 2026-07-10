---
type: ADR
title: Workspace Image Providers And Generate Image Tool
description: Les noeuds LLM du Workspace peuvent etre types chat ou image, et generate_image stocke les images IA sous images-ai tout en les exposant dans les runs agents.
tags:
  - workspace
  - mcp
  - generate_image
  - image-provider
  - providerType
  - OpenRouter
  - images-api
  - nodeProviderId
  - agentRunArtifacts
  - images-ai
  - toolGenerateImage
timestamp: 2026-06-29T22:36:00Z
status: To be validated
sources:
  - path: src/routes/workspace.ts
    hash: 5d49c832b11962d5aa755405411a6641f55bd183f8a500a914df34a59da3064b
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: src/frontend-svelte/src/routes/Workspace.svelte
    hash: 26121a41d8b8a04b13f5de96e7c84b182d338216f834d263f616c05931031f94
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: src/frontend-svelte/src/lib/workspace/app.ts
    hash: d1fda6a885e6e1db292ee1bbfec4b504dd1f493d0760c570095e60294c141c74
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: src/frontend-svelte/src/lib/workspace/persistence.ts
    hash: 8064972a06548b8d2bb5e69094e6c90e5cf89f6b365b8befc4454d8bba808647
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: src/mcp/server.ts
    hash: 3b47ab14e3820987ba65387741d7afabd76625bdd011fee073c7f08d5fe32969
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: src/mcp/tools/images.ts
    hash: 4c6617f528dc0629d9885979dca9012cb104e77398d249d896c113bbd5ee7eda
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: src/frontend-svelte/src/styles/app.css
    hash: f0e30afa22df375c134b241f4e63725efa267f2ae0cf48423b2748766fc2c257
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: tests/api/mcp.spec.ts
    hash: 4a1dd3da3976d27533e52ffefaab275a4abd7df835832d7c23ce2f0b5ae001d6
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: tests/api/workspace.spec.ts
    hash: 291404811abd4923a1c6998a4d707aca82112140b81cfa19c654799e596169b0
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: src/server.ts
    hash: d2e9da7a978c63f86016c00a55ba313c58cc03b5ad8ca8da36cc5e1472a52c52
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: src/routes/export.ts
    hash: a80047c2b89c2b21e3f31f3b153a2357eb26fd0100adae1ad12c884cc5506a71
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
  - path: tests/api/export.spec.ts
    hash: 49aa914fadd326876e9735790223489de46ad88588947fa9114b2dbdc1d7407e
    commit: 68e0d1aeea19ec61dcc11a7c64837338d98e0401
    dirty: false
---

# Workspace image providers and generate image tool

Complete [Workspace Configuration Graph Avec Agents Llm Et Tool Use Mcp](?doc=ADRS%252F2026_05_30_22_14_%255BFRONTEND%255D_workspace_configuration_graph_avec_agents_llm_et_tool_use_mcp), [Workspace : runs agents en streaming, LLM tout fournisseur et secrets par variable d'environnement](?doc=ADRS%252F2026_06_25_22_58_%255BWORKSPACE%255D_workspace_runs_agents_en_streaming_llm_tout_fournisseur_et_secrets_par_variable_d_environnement), [Workspace Llm Tool Mode Chat Only](?doc=ADRS%252F2026_06_29_20_25_%255BWORKSPACE%255D_workspace_llm_tool_mode_chat_only) et [File Attachments Paperclip Drag Drop Paste And Blocked Extensions](?doc=ADRS%252F2026_04_21_%255BFILES%255D_file_attachments_paperclip_drag_drop_paste_and_blocked_extensions), qui restent valides.

## Contexte

Les agents Workspace peuvent lire et modifier des documents via les tools MCP. Certains workflows documentaires doivent aussi produire des images a partir du contenu lu, par exemple une illustration d'architecture ou un visuel explicatif. Les providers image comme OpenRouter exposent une surface differente de `/chat/completions` : la generation passe par une API image qui retourne des donnees binaires/base64, et non une reponse Markdown textuelle.

Attacher directement un agent a un provider image melangerait deux responsabilites : le raisonnement et le tool-use restent des fonctions d'un provider chat, tandis que la generation image est une action secondaire appelee depuis l'agent.

Avec plusieurs providers visibles sur le graphe, les nodes chat et image doivent etre distinguables sans ouvrir le panneau de configuration.

Un run agent persistant produit deja un document Markdown sous `AI/WORKSPACE/<agent>/Run - <agent>`. Quand l'agent appelle `generate_image`, le resultat de run doit lui aussi afficher les images generees sous `## Response`, meme si le modele ne recopie pas explicitement le Markdown retourne par le tool dans sa reponse finale.

Le dossier `files/` est reserve aux pieces jointes utilisateur. Les images produites par IA doivent donc etre rangees dans un espace dedie afin de ne pas polluer les filtres et conventions de la page Files.

## Decision

Ajouter un axe `providerType` aux noeuds LLM du Workspace :

- `chat` : valeur par defaut pour les providers qui executent les agents via `/chat/completions` ;
- `image` : provider dedie a la generation d'images, reference explicitement par son id depuis un tool MCP.

Le panneau LLM affiche un `Provider ID` copiable. Cet id est passe a `generate_image.imageProviderId` par les agents chat qui veulent produire une image apres avoir lu un document.

Les providers image ne sont pas des parents valides pour les runs agents. L'UI n'ajoute pas d'agent sous un provider image, et le backend refuse un run agent si son parent est de type `image`.

Le canvas applique une palette par role/type : le noeud central est noir avec texte blanc, MCP est gris plein, les providers chat sont orange avec texte fonce, les agents sont orange clair avec texte fonce, et les providers image sont jaune fort avec texte fonce. Les connexions prennent la couleur de l'enfant afin de renforcer la lecture topologique.

Les routes persistantes de run agent (`/api/workspace/run-agent-document` et `/api/workspace/run-agent-document-stream`) collectent les resultats du tool MCP `generate_image` et ajoutent automatiquement leur champ `markdown` dans le document de run, juste apres la reponse finale sous `## Response`. Cette insertion deduplique les images deja citees par le modele pour eviter les repetitions.

Les images generees sont stockees sous `images-ai/<dossier du document>/...`, servies par `/images-ai/...`, et referencees en Markdown par `./images-ai/<dossier du document>/...`. Le dossier `files/` reste reserve aux uploads et pieces jointes utilisateur.

## Implementation

### Workspace

`WorkspaceEntityConfig` persiste `providerType: "chat" | "image"`, avec `chat` par defaut pour les workspaces existants. Le panneau `/workspace` ajoute :

- un champ readonly `Provider ID` avec bouton de copie ;
- un choix `Provider type` entre `Chat completion` et `Image generation` ;
- un masquage du champ `Tool calling` pour les providers image, car `toolMode` ne concerne que les providers chat.

`/api/workspace/list-models` route vers `/v1/models` pour les providers chat et vers `/v1/images/models` pour les providers image. Le bouton Test d'un provider image se limite a lister les modeles image pour eviter une generation couteuse de test.

`app.ts` centralise les couleurs dans `entityCanvasStyle(entity)`, reutilise par `drawPolygonEntity`, `drawLeafEntity` et `drawConnections`.

### MCP generate_image

`src/mcp/tools/images.ts` ajoute `toolGenerateImage()`. Le tool :

1. lit `.workspace` ;
2. retrouve le noeud LLM par `imageProviderId` ;
3. verifie qu'il est de type `image` ;
4. resout son token via la meme convention `env:NAME` / `${NAME}` ;
5. appelle l'endpoint image OpenRouter-compatible (`/v1/images`) avec `model`, `prompt` et `response_format: "b64_json"` ;
6. decode `data[0].b64_json` ;
7. sauvegarde l'image sous `images-ai/<dossier du document>/...` ;
8. retourne `{ success, providerId, provider, model, filename, url, markdown, size }`.

Le tool exige `documentId` pour choisir le dossier cible et verifier que le document existe. Le lien Markdown retourne suit la convention `![name](./images-ai/<filename>)`, de sorte que l'image generee reste affichable dans les documents sans utiliser le dossier `files/`.

`src/server.ts` expose `docsPath/images-ai` en statique via `/images-ai`, en plus des montages existants `/images` et `/files`.

### Documents de run agent

`runAgent()` accepte un accumulateur `AgentRunArtifacts`. Apres chaque `tools/call`, si le tool appele est `generate_image`, `collectGeneratedImageArtifact()` parse le texte JSON retourne par le MCP et conserve les champs `filename`, `url` et `markdown` lorsque `success: true`.

`agentRunMarkdown()` appelle ensuite `contentWithGeneratedImages()` avant d'ecrire le document sous `AI/WORKSPACE/<agent>/`. Les images sont ajoutees sous `## Response`, apres le texte final du modele. Si le texte final contient deja le Markdown exact, le `filename` ou l'URL de l'image, l'image n'est pas ajoutee une seconde fois.

### Export

`src/routes/export.ts` reconnait les images Markdown et HTML referencees par `./images-ai/...` ou `/images-ai/...`. Les exports Markdown et HTML copient ces assets dans un sous-dossier `images-ai/` du ZIP afin de conserver leur separation avec les images classiques et les pieces jointes.

## Consequences

### PROS

- Un agent chat peut lire un document, raisonner, appeler `generate_image`, puis inserer le lien Markdown via `update_document` si le document cible doit etre modifie.
- Le document de run conserve aussi une trace visible et rendue des images generees, meme quand le modele final se contente de dire que l'image est prete.
- Les providers chat et image restent separes, donc les endpoints `/chat/completions` et `/images` ne sont pas confondus.
- L'id du provider image est explicite, copiable, stable dans `.workspace`, et utilisable dans les prompts agents.
- Les images generees sont separees des pieces jointes utilisateur : `images-ai/` porte les assets IA, `files/` reste dedie aux uploads et fichiers joints.
- Les exports Markdown/HTML embarquent les images IA dans un sous-dossier `images-ai/`.
- Le graphe Workspace rend les types de nodes identifiables par couleur sans interaction supplementaire.

### CONS

- `generate_image` depend d'un provider externe et d'une cle runtime ; les tests automatises ne generent pas d'image reelle.
- Les parametres `aspectRatio`, `size`, `quality` et `outputFormat` sont passes seulement quand l'agent les fournit ; leur support exact depend du provider/modele.
- Les diagrammes Mermaid/C4/UML restent mieux traites comme texte ou diagrammes editables, pas comme images generees.

## Verification

- `npm run build` : OK.
- `npx playwright test tests/api/mcp.spec.ts` : OK, 38 passed.
- `npx playwright test tests/api/workspace.spec.ts` : OK, 2 passed.
- `npx playwright test tests/api/export.spec.ts` : OK, 6 passed.
