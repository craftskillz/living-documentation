---
type: Document
title: Sections Colorees
---

# Sections colorées & texte coloré

Les sections colorées utilisent des `<div>` HTML avec styles inline. Contrairement aux callouts Markdown, elles n'ont pas de syntaxe dédiée : on écrit le HTML directement dans le fichier `.md`. Le rendu est identique dans tous les contextes , aucune dépendance au moteur Markdown.

---

## Section bleue , Info

Contexte, explication, bon à savoir. Le bleu est la teinte la plus neutre et la plus lue.

**Syntaxe :**

```html
<div
  style="background:#eff6ff;border-left:4px solid #3b82f6;color:#1e3a5f;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;"
>
  ### 💡 Titre de la section Contenu de l'encadré.
</div>
```

**Rendu :**

<div style="background:#eff6ff;border-left:4px solid #3b82f6;color:#1e3a5f;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">

### 💡 Bon à savoir

Les sections colorées sont entièrement portables. Elles s'affichent correctement dans GitHub, VS Code Preview, et Living Documentation , pas besoin de plugin.

</div>

---

## Section verte , Succès

Validation, confirmation, résultat positif.

**Syntaxe :**

```html
<div
  style="background:#f0fdf4;border-left:4px solid #22c55e;color:#14532d;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;"
>
  ### ✅ Titre Contenu.
</div>
```

**Rendu :**

<div style="background:#f0fdf4;border-left:4px solid #22c55e;color:#14532d;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">

### ✅ Configuration validée

La configuration a été chargée depuis `.living-doc.json`.

- Port : **4321**
- Thème : **system**
- Dossier docs : **./documentation**

</div>

---

## Section ambre , Avertissement

Point d'attention, limite, comportement à connaître avant de continuer.

**Syntaxe :**

```html
<div
  style="background:#fffbeb;border-left:4px solid #f59e0b;color:#451a03;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;"
>
  ### ⚠️ Titre Contenu.
</div>
```

**Rendu :**

<div style="background:#fffbeb;border-left:4px solid #f59e0b;color:#451a03;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">

### ⚠️ Migration en cours

Ce module est en cours de refactorisation. L'API publique reste stable mais les composants internes peuvent changer jusqu'à la v4.0.

</div>

---

## Section rouge , Danger

Action irréversible, erreur critique, interdit.

**Syntaxe :**

```html
<div
  style="background:#fef2f2;border-left:4px solid #ef4444;color:#450a0a;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;"
>
  ### ❌ Titre Contenu.
</div>
```

**Rendu :**

<div style="background:#fef2f2;border-left:4px solid #ef4444;color:#450a0a;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">

### ❌ Action irréversible

La suppression d'un document retire définitivement le fichier `.md` du disque. Il n'y a **pas de corbeille** dans Living Documentation. Faites un commit Git avant toute suppression en masse.

</div>

---

## Section violette , Note

Concept, décision technique, note de contexte.

**Syntaxe :**

```html
<div
  style="background:#f5f3ff;border-left:4px solid #8b5cf6;color:#2e1065;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;"
>
  ### 📝 Titre Contenu.
</div>
```

**Rendu :**

<div style="background:#f5f3ff;border-left:4px solid #8b5cf6;color:#2e1065;padding:1rem 1.25rem;border-radius:0.375rem;margin:1rem 0;">

### 📝 Architecture sans base de données

Living Documentation ne maintient aucune base. Chaque document est un fichier Markdown versionnable avec Git, éditable avec n'importe quel éditeur de texte.

</div>

---

## Texte coloré inline

Pour mettre en évidence un mot ou une expression dans un paragraphe, sans créer un bloc entier.

**Syntaxe :**

```html
Résultat : <span style="color:#22c55e;">succès</span>, avertissement :
<span style="color:#f59e0b;">à vérifier</span>, erreur :
<span style="color:#ef4444;">KO</span>.
```

**Rendu :**

Résultat : <span style="color:#22c55e;">succès</span>, avertissement : <span style="color:#f59e0b;">à vérifier</span>, erreur : <span style="color:#ef4444;">KO</span>.

---

## Palette de référence

| Couleur         | `background` | `border`  | `color` texte |
| --------------- | ------------ | --------- | ------------- |
| Bleu (info)     | `#eff6ff`    | `#3b82f6` | `#1e3a5f`     |
| Vert (succès)   | `#f0fdf4`    | `#22c55e` | `#14532d`     |
| Ambre (warning) | `#fffbeb`    | `#f59e0b` | `#451a03`     |
| Rouge (danger)  | `#fef2f2`    | `#ef4444` | `#450a0a`     |
| Violet (note)   | `#f5f3ff`    | `#8b5cf6` | `#2e1065`     |
