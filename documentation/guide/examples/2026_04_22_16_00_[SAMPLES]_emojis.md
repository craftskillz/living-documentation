---
type: Document
title: Emojis
---

# Emojis

Les emojis s'insèrent directement dans le texte Markdown , pas de syntaxe spéciale, pas de plugin. Copier-coller depuis une palette système (macOS : `⌘ + Ctrl + Espace`, Windows : `Win + .`) ou taper le caractère Unicode directement.

Ils sont indexés par la recherche plein-texte de Living Documentation comme n'importe quel autre texte.

---

## Dans un titre de section

**Syntaxe :**

```markdown
## 🚀 Déploiement

## 🐛 Bugs connus

## 💡 Astuce
```

**Rendu :**

## 🚀 Déploiement

Le serveur démarre avec `npx living-ai-documentation`. Aucun build requis.

## 🐛 Bugs connus

Aucun bug critique ouvert. Les issues mineures sont suivies sur GitHub.

## 💡 Astuce

Les emojis dans les titres apparaissent dans la table des matières et les résultats de recherche.

---

## Dans une liste

**Syntaxe :**

```markdown
- 📁 Dossier `documentation/` , source de vérité pour les docs
- ⚙️ Fichier `.living-doc.json` , configuration du serveur
- 🔍 Barre de recherche , plein-texte sur tous les documents
- 🏷️ Catégories , organisation par préfixe `[TAG]` dans le nom de fichier
- 📎 Pièces jointes , fichiers servis directement par le serveur
```

**Rendu :**

- 📁 Dossier `documentation/` , source de vérité pour les docs
- ⚙️ Fichier `.living-doc.json` , configuration du serveur
- 🔍 Barre de recherche , plein-texte sur tous les documents
- 🏷️ Catégories , organisation par préfixe `[TAG]` dans le nom de fichier
- 📎 Pièces jointes , fichiers servis directement par le serveur

---

## Dans un tableau

**Syntaxe :**

```markdown
| Feature                 | Statut        |
| ----------------------- | ------------- |
| Recherche plein-texte   | ✅ Disponible |
| Mode hors-ligne         | 🔜 Prévu      |
| Historique des versions | 🚧 En cours   |
| Export Word             | ❌ Non prévu  |
```

**Rendu :**

| Feature                 | Statut        |
| ----------------------- | ------------- |
| Recherche plein-texte   | ✅ Disponible |
| Mode hors-ligne         | 🔜 Prévu      |
| Historique des versions | 🚧 En cours   |
| Export Word             | ❌ Non prévu  |

---

## Dans du texte inline

**Syntaxe :**

```markdown
La commande `npm run dev` 🔁 relance le serveur automatiquement
à chaque modification de fichier source.
```

**Rendu :**

La commande `npm run dev` 🔁 relance le serveur automatiquement à chaque modification de fichier source.

---

## Palette de référence

| Catégorie           | Emojis courants         |
| ------------------- | ----------------------- |
| Statuts             | ✅ ❌ ⚠️ 🔜 🚧 💤 🔒 🔓 |
| Technique           | 🛠️ 📦 🧪 🐛 🚀 🔁 🧩 📡 |
| Documentation       | 📝 💡 📖 🎯 📌 💬 🔗 📎 |
| Dossiers & fichiers | 📁 📄 📂 🗂️ ⚙️ 📋       |
| Personnes & orga    | 👤 👥 🏢 📣 🤝          |
