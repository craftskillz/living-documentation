---
type: Document
title: Metadonnees Sources
---

# Métadonnées sources

Living Documentation peut lier un document à des fichiers source du projet (`.ts`, `.svelte`, `.json`…). Ce lien stocke un **hash de contenu** au moment de la liaison. Chaque fois qu'un fichier source change, l'indice de précision du document diminue , un signal clair que la documentation est peut-être devenue obsolète.

---

## Pourquoi lier des sources ?

Sans lien, la documentation vieillit silencieusement. Avec les métadonnées :

- L'indice de précision descend **automatiquement** quand le code change.
- Plus besoin de se rappeler quels docs sont liés à quel code.
- Un `list_adrs_below_accuracy(0.8)` avant chaque release identifie ce qui est à mettre à jour.

---

## Lier un fichier source via le MCP

La méthode recommandée quand un agent IA crée ou met à jour un document.

**Syntaxe (appel MCP) :**

```
add_metadata(
  doc_id: "ADRS/2026_06_07_[FRONTEND]_callout-boxes",
  source_file: "src/frontend-svelte/src/lib/home/blockquoteAttributes.ts"
)
```

**Ce que ça enregistre dans le document :**

```yaml
# Métadonnées internes (non visibles dans le rendu)
source_files:
  - path: src/frontend-svelte/src/lib/home/blockquoteAttributes.ts
    hash: "a3f2c8..."
    linked_at: "2026-06-07T12:23:00Z"
```

---

## Lier un fichier source via l'interface

1. Ouvrir le document.
2. Cliquer sur **⚙️ Métadonnées** dans la barre d'outils.
3. Saisir le chemin relatif du fichier source (depuis la racine du projet).
4. Valider , le hash courant est calculé et enregistré.

---

## Lire l'indice de précision

L'indice est affiché en haut du document sous forme de jauge ou de pourcentage.

| Valeur      | Signification                                                          |
| ----------- | ---------------------------------------------------------------------- |
| **100 %**   | Tous les fichiers sources sont inchangés depuis la dernière màj du doc |
| **50–99 %** | Certains fichiers ont changé , vérifier si le doc est toujours exact   |
| **< 50 %**  | La majorité des sources ont évolué , document probablement obsolète    |
| **,**       | Aucune métadonnée source enregistrée                                   |

---

## Rafraîchir après une mise à jour

Après avoir relu le document et vérifié qu'il reflète bien l'état actuel du code :

**Syntaxe (appel MCP) :**

```
refresh_metadata(
  doc_id: "ADRS/2026_06_07_[FRONTEND]_callout-boxes"
)
```

Cela recalcule tous les hashes sur l'état actuel des fichiers et remet l'indice à **100 %**.

---

## Identifier les documents à risque

**Syntaxe (appel MCP) :**

```
list_adrs_below_accuracy(threshold: 0.8)
```

**Exemple de résultat :**

<!-- table-color: warning -->

| Document                                | Précision | Dernier hash mis à jour |
| --------------------------------------- | --------- | ----------------------- |
| `ADRS/2026_04_01_[BACKEND]_choix-stack` | 42 % ⚠️   | Il y a 3 semaines       |
| `2_guide/edition-inline-snippets`       | 75 %      | Il y a 5 jours          |
| `1_concepts/architecture`               | 100 %     | Il y a 2 heures         |

---

## Supprimer un lien

**Syntaxe (appel MCP) :**

```
remove_metadata(
  doc_id: "ADRS/2026_06_07_[FRONTEND]_callout-boxes",
  source_file: "src/frontend-svelte/src/lib/home/blockquoteAttributes.ts"
)
```

Utile quand un fichier source a été supprimé ou renommé.
