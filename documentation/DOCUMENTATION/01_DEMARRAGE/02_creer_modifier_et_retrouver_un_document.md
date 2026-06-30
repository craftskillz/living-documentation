---
**date:** 2026-06-30
**status:** Draft
**description:** Guide de demarrage pour creer, modifier, sauvegarder et retrouver un document dans Living Documentation.
**tags:** demarrage, document, edition, sauvegarde, recherche, markdown, snippets
---

# Creer, modifier et retrouver un document

Ce guide montre le flux de base : creer un document, ecrire du Markdown, sauvegarder, puis le retrouver par la navigation ou la recherche.

## Prerequis

- Living Documentation est lance.
- L'interface est ouverte dans le navigateur.
- Vous savez quel dossier documentaire est utilise par l'instance courante.

## Creer un document

1. Ouvrez la page principale de Living Documentation.
2. Cliquez sur le bouton de creation de document.
3. Saisissez un titre court et explicite.
4. Choisissez une categorie si le formulaire la propose.
5. Choisissez un dossier si le document doit etre range dans une section precise.
6. Validez la creation.

Le document apparait dans la barre laterale. Son fichier Markdown est cree sur disque selon le pattern de nommage configure.

## Comprendre le nom du fichier

Par defaut, Living Documentation utilise un pattern proche de :

```text
YYYY_MM_DD_HH_mm_[Category]_title.md
```

Exemple :

```text
2026_06_30_14_20_[PROCESS]_preparer_une_reunion.md
```

La categorie vient du bloc `[Category]`. Le titre devient une partie du nom de fichier. Les espaces et caracteres non adaptes aux fichiers doivent etre normalises par l'application.

## Modifier le contenu

1. Ouvrez le document.
2. Passez en mode edition.
3. Ajoutez ou modifiez le Markdown.
4. Utilisez les snippets si vous avez besoin d'un bloc recurrent : table, liste, arbre, bloc replie, lien ou image.
5. Enregistrez.

Le document est sauvegarde sur disque. Si l'integration Git est active, l'enregistrement peut aussi declencher un commit automatique selon la configuration.

## Retrouver un document

Vous pouvez retrouver un document de trois manieres :

- par dossier dans la barre laterale ;
- par categorie ;
- par recherche plein texte.

La recherche est utile quand vous ne connaissez plus le dossier exact ou quand vous cherchez une occurrence dans le contenu du document.

## Verifier le resultat

Apres sauvegarde :

- le rendu Markdown doit se mettre a jour ;
- le document doit rester accessible dans la barre laterale ;
- la recherche doit retrouver le titre ou un mot du contenu ;
- le fichier `.md` doit exister dans le dossier documentaire.

## Conseils de redaction

| Conseil | Pourquoi |
| --- | --- |
| Donner un titre orienté usage | Le document sera plus facile a retrouver. |
| Commencer par l'objectif | Le lecteur comprend vite l'utilite du document. |
| Utiliser des sections courtes | La lecture et la maintenance sont plus simples. |
| Preferer les listes pour les procedures | Les actions deviennent verifiables. |
| Garder les chemins et identifiants en monospace | Les elements techniques restent precis. |

## Erreurs courantes

| Symptome | Cause probable | Correction |
| --- | --- | --- |
| Le document est dans General | Aucune categorie n'a ete detectee | Verifier le champ categorie ou le pattern de nommage. |
| Le document est difficile a retrouver | Titre trop vague | Renommer avec un titre plus specifique. |
| Les changements ne sont pas visibles | Sauvegarde non effectuee ou erreur backend | Reessayer, puis consulter le toast ou la console serveur. |
| Un lien interne ne fonctionne pas | Ancre ou chemin incorrect | Verifier le titre cible et l'URL generee. |

## Suite recommandee

Continuez avec [Structurer dossiers, categories et documents](./03_structurer_dossiers_categories_et_documents.md).

