# Index mémoire

La mémoire du projet vit dans `memory/`, jamais dans un dossier global propre à un outil IA (par exemple `~/.claude`).

Elle sert au contexte stable et fréquemment réutilisé. Les décisions durables vont dans des ADR sous `documentation/ADRS/`.

Mettre à jour ce fichier lorsque des fichiers mémoire sont ajoutés, renommés ou supprimés.

## Fichiers mémoire présents

- `memory/agent-cost-lessons.md` : incident de coût du 13/10/2026 et ses causes (origine de la règle `cost-efficient-agent-workflow`).
- `memory/blueprint-documentation-style.md` : style de rédaction des documents Blueprint (niveau fonctionnel, formulations positives, sections courtes).
