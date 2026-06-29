---
`🗄️ ADR : 2026_04_14_[I18N]_internationalization_en_fr_with_json_translation_files.md`
**date:** 2026-04-14
**status:** Accepted
**description:** Ajout du support complet d'internationalisation sur les trois pages (index.html, admin.html, diagram.html) via un chargeur partagé i18n.js, deux fichiers de traduction JSON (en.json, fr.json) et quatre attributs de données (data-i18n, data-i18n-title, data-i18n-placeholder, data-i18n-html). La langue est persistée dans la configuration en tant que "en" | "fr" et sélectionnée depuis le panneau Admin. Mis à jour le 22/04/2026 : le contenu rendu dynamiquement doit attendre initI18n avant son premier rendu pour éviter l'affichage de clés brutes (correction du bootstrap de la barre latérale du diagramme).
**tags:** i18n, internationalization, language, translation, en, fr, json, data-i18n, i18n.js, config, admin, frontend, index, diagram, window.t, applyI18n, initI18n, bootstrap, loadDiagramList, dynamic-rendering
---

## Contexte

Toutes les chaînes visibles par l'utilisateur dans les trois pages frontend (index.html, admin.html, diagram.html) étaient codées en dur en anglais directement dans le HTML et le JavaScript. À mesure que l'application grandissait, l'ajout d'une seconde langue est devenu nécessaire sans nécessiter d'étape de build ni de framework JS.

Les contraintes étaient les suivantes :

- Aucune étape de build : les trois pages utilisent Tailwind et highlight.js via CDN ; l'ajout d'un bundler n'était pas acceptable.
- La solution doit fonctionner uniformément sur les trois pages avec un mécanisme partagé unique.
- La préférence de langue doit être persistée côté serveur (dans `.living-doc.json`) afin que toutes les pages se chargent dans la bonne langue au premier rendu, sans flash de contenu non traduit.

## Décision

### i18n.js, chargeur partagé

Un script IIFE simple `src/frontend/i18n.js` expose trois globales :

- **`window.t(key)`** : retourne la traduction pour `key`, ou la clé elle-même comme fallback (les clés non traduites se dégradent donc de manière gracieuse).
- **`window.initI18n(lang)`** : récupère `/i18n/<lang>.json` et peuple le dictionnaire interne. Appelé une fois au chargement de la page, après que `/api/config` a résolu la langue configurée.
- **`window.applyI18n()`** : parcourt le DOM et applique les traductions en utilisant quatre attributs de données (voir ci-dessous). Appelé après la résolution de `initI18n`.

Le script est une balise `<script>` classique (pas un module ES), il se charge donc de manière identique dans les trois pages sans coordination d'imports.

### Fichiers de traduction

Deux fichiers JSON sous `src/frontend/i18n/` :

- `en.json` : anglais (par défaut)
- `fr.json` : français

Chaque fichier est une map clé → chaîne plate. Les clés sont organisées par domaine, par exemple `nav.diagram`, `admin.config.title`, `diagram.toolbar.save`. Servis de manière statique par Express à `/i18n/*.json`.

### Attributs de données

| Attribut                | Définit           | Cas d'usage                         |
| ----------------------- | ----------------- | ----------------------------------- |
| `data-i18n`             | `el.textContent`  | Libellés, texte de bouton, titres   |
| `data-i18n-title`       | `el.title`        | Titres d'infobulle                  |
| `data-i18n-placeholder` | `el.placeholder`  | Placeholders input/textarea         |
| `data-i18n-html`        | `el.innerHTML`    | Chaînes contenant du balisage HTML  |

Les éléments HTML conservent leur texte anglais d'origine comme fallback pré-`applyI18n`, de sorte que la page reste lisible même si la récupération du JSON échoue.

### Champ de configuration

`language: "en" | "fr"` ajouté à `LivingDocConfig` avec la valeur par défaut `"en"`. Accepté côté serveur dans `PUT /api/config`, seules les valeurs `"en"` et `"fr"` sont acceptées, toute autre valeur est silencieusement ignorée.

### Sélecteur du panneau Admin

Un `<select id="field-language">` dans le panneau Admin permet aux utilisateurs de changer de langue. Le changement est enregistré via `PUT /api/config` et prend effet au prochain chargement de page.

### Schéma d'intégration par page

Chaque page suit la même séquence de démarrage :

```js
const cfg = await fetch("/api/config").then((r) => r.json());
await window.initI18n(cfg.language || "en");
window.applyI18n();
```

Avec un fallback vers `'en'` si la récupération de la configuration échoue.

### Mise à jour du 22/04/2026 : les moteurs de rendu dynamiques doivent attendre initI18n

`applyI18n()` gère les nœuds DOM statiques, mais le contenu rendu par JS appelle `window.t()` en ligne. Si ce rendu s'exécute **avant** que `initI18n()` ne soit résolu, le dictionnaire est encore vide et `t(key)` retourne la clé brute (par exemple `diagram.sidebar.empty` affiché littéralement dans la barre latérale du diagramme).

Règle : tout moteur de rendu dynamique qui dépend de `window.t()` pour son premier affichage doit être invoqué depuis la même IIFE qui attend `initI18n()`, **après** `applyI18n()`. Dans `diagram.html`, `loadDiagramList()` a été déplacé hors de `diagram/main.js` (où il s'exécutait au moment du chargement du module, en concurrence avec `initI18n`) vers l'IIFE de bootstrap en ligne, après `window.applyI18n()`.

Schéma pour les futures pages :

```js
(async () => {
  const cfg = await fetch("/api/config").then((r) => r.json());
  await window.initI18n(cfg.language || "en");
  window.applyI18n();
  // Les moteurs de rendu dynamiques qui appellent window.t() vont ici :
  loadDiagramList();
})();
```

## Conséquences

### AVANTAGES

- Aucune étape de build : les fichiers de traduction sont du JSON simple récupéré à l'exécution.
- Mécanisme partagé unique sur toutes les pages : un seul `i18n.js`, les quatre mêmes attributs partout.
- Dégradation gracieuse : les clés manquantes affichent la clé elle-même ; un échec de récupération du JSON laisse le texte de fallback anglais intact.
- La langue est persistée côté serveur : pas de flash de mauvaise langue lors des navigations entre pages.
- L'ajout d'une nouvelle langue ne nécessite qu'un nouveau fichier JSON et une `<option>` supplémentaire dans le sélecteur admin.

### INCONVÉNIENTS

- `applyI18n()` s'exécute après le rendu du DOM : il y a un bref instant où le texte de fallback anglais est visible avant l'application des traductions (pas de véritable SSR).
- Le HTML rendu dynamiquement (par exemple les éléments de la barre latérale construits par JS) doit appeler `window.t()` en ligne au moment du rendu ; `applyI18n()` ne s'applique qu'aux éléments présents dans le DOM au moment de l'appel.
- Les moteurs de rendu dynamiques doivent être invoqués après la résolution de `initI18n()`, sinon `t(key)` retourne la clé brute : condition de concurrence corrigée le 22/04/2026 pour la barre latérale du diagramme.
- Toutes les chaînes ajoutées à la base de code doivent être ajoutées manuellement aux deux fichiers JSON : il n'y a pas de vérification à la compilation pour les clés manquantes.
