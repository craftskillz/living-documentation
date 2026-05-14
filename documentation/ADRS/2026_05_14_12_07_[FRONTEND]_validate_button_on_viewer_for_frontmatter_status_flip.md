---
**date:** 2026-05-14
**status:** Accepted
**description:** Le viewer expose un bouton « Valider » vert dans la toolbar juste avant le bouton Marqueur, visible uniquement si le frontmatter contient `**status:** To be validated`, qui flippe le statut à `Accepted` via PUT /api/documents/:id puis appelle POST /api/metadata/:id/refresh quand la jauge d'accuracy est inférieure à 100 % après confirmation d'une modale dont le `detail` est conditionnel.
**tags:** viewer, frontmatter, status, validate, accuracy, refresh-metadata, confirm-modal, i18n, adr-lifecycle, toolbar
---

# Bouton « Valider » dans le viewer pour basculer le frontmatter

## Contexte

Le frontmatter des ADR portait un champ `**status:** To be validated` qui devait être promu manuellement à `Accepted` en passant par le mode édition du viewer, puis en sauvegardant. Coûts :

- friction inutile pour une décision binaire récurrente (une fois l'humain a validé l'ADR créé par l'IA) ;
- pas de garde-fou contre la promotion d'un ADR dont la jauge de fiabilité est dégradée — l'humain pouvait « accepter » un ADR dont les hashes source étaient déjà drifted, gelant ainsi un mensonge dans l'historique ;
- pas de point d'entrée visuel rappelant que la promotion est attendue.

## Décision

### 1. Bouton « Valider » conditionnellement visible

Insertion dans la toolbar `#view-actions` de [src/frontend/index.html](src/frontend/index.html), **juste avant** `#stabilo-btn`. Visibilité gérée par `updateValidateButtonForCurrentDoc()` (toggle de la classe `hidden`) appelée à chaque `openDocument()`. Critère : le frontmatter parsé du `currentDocContent` doit contenir `**status:** To be validated`.

Le style est explicitement marquant — `bg-green-600 hover:bg-green-700 text-white font-semibold` + icône `fa-check` — pour signaler qu'une action durable est attendue. Le bouton reste invisible quand `view-actions` lui-même est masqué (mode édition).

### 2. Modale de confirmation avec `detail` conditionnel

Le clic ouvre `window.showConfirm({ title, message, detail, confirmLabel })`. `detail` n'est rendu **que** si la jauge d'accuracy fraîchement récupérée (`GET /api/metadata/:id`) est strictement inférieure à 1. Le texte explique que la validation va re-baseliner les hashes des fichiers source, ramenant la fiabilité à 100 %.

La séquence est :

1. fetch accuracy ;
2. construit `detail` si `accuracy < 1` ;
3. `showConfirm()` → si annulé, abort sans aucune écriture ;
4. flip de `**status:** To be validated` → `**status:** Accepted` dans `currentDocContent` ;
5. `PUT /api/documents/:id` ;
6. `POST /api/metadata/:id/refresh` **seulement si** `accuracy` était < 1 (l'évite quand la jauge est déjà à 100 %) ;
7. `openDocument(id, true)` pour recharger le doc et la jauge.

### 3. Parsing minimal du frontmatter côté client

Le frontmatter de ce projet n'est pas du YAML standard — c'est un bloc fencé par `---` contenant des lignes `**clef:** valeur`. Plutôt qu'introduire un parser YAML côté navigateur, `validate.js` expose `getDocStatus(content)` qui regex le bloc fencé puis la ligne `**status:**`. Idempotent et borné aux quelques lignes du frontmatter.

### 4. i18n strict

Sept nouvelles clés `doc.validate_*` ajoutées dans `src/frontend/i18n/en.json` et `fr.json`. Le `detail` de la modale utilise un placeholder `{accuracy}` substitué côté JS pour interpoler le pourcentage courant — pas de concaténation de fragments traduits.

### 5. Pas de nouvelle route serveur

Le PUT documents et le POST metadata/refresh existaient déjà. La feature est purement frontend ; deux appels client successifs au lieu d'une route composite côté serveur. Justification : pas d'atomicité requise (si le refresh échoue après le PUT, le statut est déjà flippé mais la jauge reste rouge — état parfaitement réparable manuellement via le bouton refresh existant dans la modale métadonnées).

## Conséquences

### PROS

- Promotion d'un ADR en un seul clic + confirmation, sans passer par le mode édition.
- Garde-fou explicite contre la promotion d'un ADR avec metadata drifted : la modale rend visible la conséquence du clic.
- Aucun changement backend ; la feature peut être désactivée en retirant `<script defer src="/validate.js">` et le bouton, sans risque de régression sur les routes existantes.
- Couvert par un spec Playwright dédié (`tests/e2e/validate.spec.ts`) avec une fixture isolée portant trois ADR (Accepted / pristine TBV / drifted TBV) — 5 tests verts.

### CONS

- Le parser regex de frontmatter est minimaliste : un ADR avec une ligne `**status:**` commentée ou en double pourrait être mal interprété. Acceptable tant que la convention de frontmatter est respectée.
- Les deux appels client (PUT puis POST refresh) ne sont pas atomiques. Mitigation : voir point 5.
- La feature suppose que `showConfirm` n'accepte que du texte (pas de HTML) ; le `detail` est donc un paragraphe brut, sans mise en forme. Suffisant pour l'usage actuel ; à reconsidérer si on veut ajouter un lien vers la modale métadonnées.
- Aucun équivalent côté MCP : l'agent IA qui valide un ADR doit toujours passer par `update_document` + `refresh_metadata` manuellement. Cohérent avec le fait que la décision de validation est un acte humain.
