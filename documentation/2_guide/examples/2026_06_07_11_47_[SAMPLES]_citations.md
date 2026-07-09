---
type: Document
title: Citations
---

# Citations

Les citations (blockquotes) sont des blocs de texte mis en retrait. En Markdown standard, on les préfixe avec `>`. Living Documentation les enrichit avec des types colorés, des titres et des icônes via des commentaires HTML placés avant le bloc.

---

## Blockquote simple

Sans aucun attribut, une citation s'affiche dans le style par défaut du thème.

**Syntaxe :**

```markdown
> Un blockquote ordinaire, sans titre ni couleur.
```

**Rendu :**

> Un blockquote ordinaire, sans titre ni couleur.

---

## Blockquote multi-lignes

Le `>` doit préfixer chaque ligne. Une ligne vide entre deux paragraphes reste dans le même bloc si elle commence aussi par `>`.

**Syntaxe :**

```markdown
> Un blockquote sur plusieurs lignes.
>
> On peut y mettre du **gras**, de l'_italique_, ou même du <mark>texte surligné</mark>.
```

**Rendu :**

> Un blockquote sur plusieurs lignes.
>
> On peut y mettre du **gras**, de l'_italique_, ou même du <mark>texte surligné</mark>.

---

## Citation typée , Info

`<!-- quote-type: info -->` colore le bloc en bleu. Les types disponibles sont `info`, `success`, `warning` et `error`.

**Syntaxe :**

```markdown
<!-- quote-type: info -->
<!-- quote-title: Bon à savoir -->
<!-- quote-icon -->

> Un blockquote info avec titre et icône.
```

**Rendu :**

<!-- quote-type: info -->
<!-- quote-title: Bon à savoir -->
<!-- quote-icon -->

> Un blockquote info avec titre et icône.

---

## Citation typée , Succès

**Syntaxe :**

```markdown
<!-- quote-type: success -->
<!-- quote-title: Configuration validée -->
<!-- quote-icon -->

> Tous les paramètres ont été chargés depuis `.living-doc.json`.
```

**Rendu :**

<!-- quote-type: success -->
<!-- quote-title: Configuration validée -->
<!-- quote-icon -->

> Tous les paramètres ont été chargés depuis `.living-doc.json`.

---

## Citation typée , Avertissement

**Syntaxe :**

```markdown
<!-- quote-type: warning -->
<!-- quote-title: Integration tests on macOS (Apple Silicon M5) -->
<!-- quote-icon -->

> On **macOS with Apple Silicon (M5)**, integration tests do not work correctly due to
> communication issues between **Testcontainers** and **Docker**.
>
> **Observed issues:**
>
> - Testcontainers failing to start or connect to Docker
> - Unstable container networking
> - Timeouts during container initialization
>
> This is a **local development limitation**, **not an application issue**.
```

**Rendu :**

<!-- quote-type: warning -->
<!-- quote-title: Integration tests on macOS (Apple Silicon M5) -->
<!-- quote-icon -->

> On **macOS with Apple Silicon (M5)**, integration tests do not work correctly due to
> communication issues between **Testcontainers** and **Docker**.
>
> **Observed issues:**
>
> - Testcontainers failing to start or connect to Docker
> - Unstable container networking
> - Timeouts during container initialization
>
> This is a **local development limitation**, **not an application issue**.

---

## Citation typée , Erreur

**Syntaxe :**

```markdown
<!-- quote-type: error -->
<!-- quote-title: Erreur critique -->
<!-- quote-icon -->

> Quelque chose a vraiment mal tourné. Consulter les logs serveur pour le détail.
```

**Rendu :**

<!-- quote-type: error -->
<!-- quote-title: Erreur critique -->
<!-- quote-icon -->

> Quelque chose a vraiment mal tourné. Consulter les logs serveur pour le détail.

---

## Icône sans titre

Quand `<!-- quote-icon -->` est présent mais pas de `<!-- quote-title -->`, l'icône s'affiche en ligne avant le premier mot du contenu. Pratique pour une alerte discrète.

**Syntaxe :**

```markdown
<!-- quote-type: success -->
<!-- quote-icon -->

> Sans quote-title, l'icône se glisse juste avant le texte.
```

**Rendu :**

<!-- quote-type: success -->
<!-- quote-icon -->

> Sans quote-title, l'icône se glisse juste avant le texte.

---

## Sans icône ni titre

Un type de couleur sans icône ni titre donne un blockquote coloré minimaliste.

**Syntaxe :**

```markdown
<!-- quote-type: warning -->

> Attention : cette API est dépréciée depuis la v3.0.
```

**Rendu :**

<!-- quote-type: warning -->

> Attention : cette API est dépréciée depuis la v3.0.

---

## Récapitulatif des attributs

| Commentaire               | Valeurs possibles                  | Effet                        |
| ------------------------- | ---------------------------------- | ---------------------------- |
| `<!-- quote-type: X -->`  | `info` `success` `warning` `error` | Couleur du bloc              |
| `<!-- quote-title: X -->` | Texte libre                        | Titre affiché dans l'en-tête |
| `<!-- quote-icon -->`     | _(sans valeur)_                    | Affiche l'icône du type      |
