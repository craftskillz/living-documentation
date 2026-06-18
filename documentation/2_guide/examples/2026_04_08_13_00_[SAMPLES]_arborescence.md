# Arborescence

Les arborescences de fichiers ou de répertoires se représentent avec un bloc de code sans langage spécifié (ou `text`).
Les caractères `├──`, `└──`, `│` sont tapés directement , pas de syntaxe spéciale.

Les agents IA proposent souvent ce type de représentations pour les structures de dossier, living documentation vous permet d'en rendre la visibilité plus agréable (Human Friendly).

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

## Arborescence simple

:::compare
```text
.
├── ADRS
│   └── 2026_01_01_[ADR]_example_architecture_decision.md
├── AI
│   ├── 2026_01_01_how_to.md
│   ├── AGENTS.md -> ../../AGENTS.md
│   ├── CLAUDE.md -> ../../CLAUDE.md
│   ├── MEMORY.md -> ../../memory/MEMORY.md
│   ├── PROJECT-INSTRUCTIONS.md
│   ├── PROJECT-STACK.md
│   ├── PROJECT-USEFUL-COMMANDS.md
│   └── rules
├── AROLLA
│   ├── awsCertificationRex.md
│   ├── conceptsContextEngineering.md
│   ├── formationContextEngineering.md
│   ├── meetupAIForDevs.md
│   └── rapportEtonnement.md
├── CLIENTS
│   ├── agregio.md
│   └── mindlapse
├── images
│   └── resources
├── KNOWLEDGE
│   └── aws.md
├── MY-CONFIGURATIONS
│   └── colima.md
└── WORKLOG
    ├── current-task.md
    └── ROADMAP.md
```
:::

---

## Avec icônes et annotations

Pour une arborescence plus visuelle dans un document de présentation.

:::compare
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
:::

---

