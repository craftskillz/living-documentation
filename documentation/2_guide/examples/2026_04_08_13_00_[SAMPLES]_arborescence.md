# Arborescence

Les arborescences de fichiers ou de répertoires se représentent avec un bloc de code sans langage spécifié (ou `text`). Les caractères `├──`, `└──`, `│` sont tapés directement , pas de syntaxe spéciale.

---

## Arborescence simple

**Syntaxe :**

````markdown
```
mon-projet/
├── src/
│   ├── index.ts
│   └── utils.ts
├── documentation/
└── package.json
```
````

**Rendu :**

```
mon-projet/
├── src/
│   ├── index.ts
│   └── utils.ts
├── documentation/
└── package.json
```

---

## Structure de projet complète

Pour documenter l'organisation d'un projet, avec les sous-dossiers principaux.

**Syntaxe :**

````markdown
```
mon-projet/
├── src/
│   ├── server/
│   │   ├── index.ts          ← point d'entrée Express
│   │   ├── routes/
│   │   │   ├── docs.ts
│   │   │   └── search.ts
│   │   └── services/
│   │       └── markdown.ts
│   └── frontend/
│       ├── App.svelte
│       ├── lib/
│       │   ├── Viewer.svelte
│       │   └── Sidebar.svelte
│       └── main.ts
├── documentation/
│   ├── 1_concepts/
│   ├── 2_guide/
│   └── ADRS/
├── .living-doc.json
└── package.json
```
````

**Rendu :**

```
mon-projet/
├── src/
│   ├── server/
│   │   ├── index.ts          ← point d'entrée Express
│   │   ├── routes/
│   │   │   ├── docs.ts
│   │   │   └── search.ts
│   │   └── services/
│   │       └── markdown.ts
│   └── frontend/
│       ├── App.svelte
│       ├── lib/
│       │   ├── Viewer.svelte
│       │   └── Sidebar.svelte
│       └── main.ts
├── documentation/
│   ├── 1_concepts/
│   ├── 2_guide/
│   └── ADRS/
├── .living-doc.json
└── package.json
```

---

## Dossier documentation seul

Utile dans un ADR ou un guide pour montrer uniquement la structure des docs.

**Syntaxe :**

````markdown
```
documentation/
├── 1_concepts/
│   ├── 2026_04_01_[ARCHITECTURE]_vue-densemble.md
│   └── 2026_04_01_[GLOSSAIRE]_termes-cles.md
├── 2_guide/
│   └── examples/
│       ├── 2026_04_08_[SAMPLES]_arborescence.md
│       └── 2026_06_07_[SAMPLES]_citations.md
└── ADRS/
    ├── 2026_04_01_[BACKEND]_choix-stack.md
    └── 2026_06_07_[FRONTEND]_callout-boxes.md
```
````

**Rendu :**

```
documentation/
├── 1_concepts/
│   ├── 2026_04_01_[ARCHITECTURE]_vue-densemble.md
│   └── 2026_04_01_[GLOSSAIRE]_termes-cles.md
├── 2_guide/
│   └── examples/
│       ├── 2026_04_08_[SAMPLES]_arborescence.md
│       └── 2026_06_07_[SAMPLES]_citations.md
└── ADRS/
    ├── 2026_04_01_[BACKEND]_choix-stack.md
    └── 2026_06_07_[FRONTEND]_callout-boxes.md
```

---

## Avec icônes et annotations

Pour une arborescence plus visuelle dans un document de présentation.

**Syntaxe :**

````markdown
```
living-documentation/
├── 📁 src/
│   ├── 📁 server/           ← API Node.js
│   │   └── 📄 index.ts
│   └── 📁 frontend-svelte/  ← UI Svelte 5
│       └── 📄 App.svelte
├── 📁 documentation/        ← docs vivantes
│   └── 📁 ADRS/             ← décisions techniques
├── ⚙️  .living-doc.json     ← config serveur
└── 📦 package.json
```
````

**Rendu :**

```
living-documentation/
├── 📁 src/
│   ├── 📁 server/           ← API Node.js
│   │   └── 📄 index.ts
│   └── 📁 frontend-svelte/  ← UI Svelte 5
│       └── 📄 App.svelte
├── 📁 documentation/        ← docs vivantes
│   └── 📁 ADRS/             ← décisions techniques
├── ⚙️  .living-doc.json     ← config serveur
└── 📦 package.json
```

---

## Générer une arborescence avec `tree`

Pour produire rapidement la syntaxe depuis un terminal :

```bash
# Arborescence sur 2 niveaux, sans node_modules
tree -L 2 --gitignore

# Avec les fichiers cachés
tree -L 2 -a --gitignore

# Export dans le presse-papiers (macOS)
tree -L 2 --gitignore | pbcopy
```

Coller ensuite le résultat dans un bloc de code dans le document.
