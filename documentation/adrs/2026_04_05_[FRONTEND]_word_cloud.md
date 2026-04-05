# 2026-04-05 [FRONTEND] Word Cloud

## Statut
Accepté

## Contexte

L'outil manquait d'une vue synthétique du vocabulaire dominant dans une base de code ou une base documentaire. Un nuage de mots permet d'identifier en un coup d'œil les concepts récurrents sans lire chaque fichier.

## Décision

### Route backend

Nouveau `GET /api/wordcloud?path=<absolu>&ext=md&ext=ts&...`

- Parcourt récursivement le dossier indiqué, collecte les fichiers dont l'extension est dans la liste `ext`.
- Retourne `{ files: N, text: "<contenu concaténé>" }`.
- Pas de garde path-traversal intentionnelle : le serveur tourne localement pour l'utilisateur propriétaire du disque.

### Frontend — `src/frontend/wordcloud.js`

Tout le code word cloud est extrait de `index.html` dans un fichier dédié, chargé par `<script src="/wordcloud.js">`. Les symboles restent globaux (pas d'ES modules) pour rester cohérent avec `index.html`.

Responsabilités :
- `WC_STOP_WORDS` — mots vides humains (anglais + français uniquement)
- `WC_LANG_STOP_WORDS` — mots-clés par extension : `_code` (partagé), `ts`, `tsx`, `js`, `jsx`, `java`, `kt`, `py`, `go`, `rs`, `cs`, `swift`, `rb`, `html`, `css`, `scss`, `yml`/`yaml`, `json`, `xml`, `toml`
- `wcBuildStopWords(exts)` — fusionne les sets pertinents selon les extensions cochées
- `extractWordsFromMarkdown(text, stopWords)` — strip imports/packages/annotations, blocs code, URLs, ponctuation ; tokenise ; filtre stop words
- `renderWordCloud(list)` — dessine via `WordCloud2.js` (vendorisé)
- Browser de dossiers inline (`wcLoadBrowse`, `wcToggleBrowser`, `wcSelectFolder`, `wcBrowseUp`)
- Persistance localStorage : `wc-root` (dossier sélectionné), `wc-exts` (extensions cochées)

### Overlay dans `index.html`

Structure en 3 zones :
1. Header (titre + Close)
2. Toolbar : champ root (readonly) + Browse + Launch / checkboxes extensions groupées par famille
3. Browser inline (caché par défaut, toggle par Browse)
4. Canvas word cloud

### Workflow utilisateur

1. Clic **Word Cloud** dans le header → overlay s'ouvre, root pré-rempli depuis `docsFolder` config (ou localStorage si déjà choisi)
2. Optionnel : **Browse** pour naviguer et sélectionner un autre dossier
3. Cocher/décocher les extensions souhaitées
4. Clic **Launch** → appel `/api/wordcloud` → analyse → rendu

Le nuage n'est **pas** calculé automatiquement à l'ouverture — délibérément, car la lecture récursive peut être lente sur de gros dépôts.

### Strip des imports

Avant tokenisation, une regex multiline supprime les lignes de déclarations d'imports/packages :

```
import … / export { } / export * / package / require / #include / #import / using / namespace / from '…' import / @Annotation
```

### Copy PNG — fix sélection

`copySelectionAsPng()` dans `clipboard.js` appelle `network.unselectAll()` + `network.redraw()` avant de capturer le canvas, puis restaure la sélection dans un bloc `finally`. Cela évite que les bordures orange de sélection vis-network apparaissent dans l'image exportée.

## Conséquences

**Positives**
- `index.html` allégé de ~340 lignes.
- Vocabulaire dominant visible en quelques secondes sur n'importe quel dossier du disque.
- Extensions et dossier mémorisés entre sessions.

**Contraintes**
- `/api/wordcloud` lit des chemins arbitraires sur le disque — acceptable car le serveur est local.
- `wordcloud.js` est un script classique (non-module) : ses symboles sont globaux, cohérent avec l'architecture `index.html`.
- `WordCloud2.js` reste vendorisé dans `src/frontend/vendor/` (pas de CDN).
