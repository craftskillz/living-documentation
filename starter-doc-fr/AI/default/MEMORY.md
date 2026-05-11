# Index mémoire

Toujours stocker la mémoire du projet dans le dossier `memory/` du projet courant.

Ne pas écrire la mémoire projet dans un dossier global propre à un outil IA, par exemple `~/.claude`.

## Fichiers mémoire recommandés

Ajouter ici les fichiers mémoire réellement utiles au projet, par exemple :

```text
memory/project-overview.md
memory/architecture.md
memory/testing.md
memory/domain-language.md
```

## Règle d'usage

La mémoire sert au contexte stable et fréquemment réutilisé.

Les décisions durables doivent être écrites dans des ADR sous `DOCS_FOLDER/ADRS/`.

Mettre à jour ce fichier lorsque des fichiers mémoire sont ajoutés, renommés ou supprimés.
