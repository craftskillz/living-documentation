---
**date:** 2026-01-01
**status:** Exemple
**description:** Template d'ADR montrant comment enregistrer une décision projet avec assez de contexte, conséquences et tags pour qu'un assistant IA puisse la retrouver et la réutiliser plus tard.
**tags:** adr, template, decision-architecture, contexte-ia, documentation
---

# Exemple de décision d'architecture

## Contexte

Remplacez cette section par la situation qui a mené à la décision.

Expliquez le problème en termes concrets :

- ce qui était difficile à comprendre, maintenir, faire évoluer, tester ou opérer ;
- les contraintes existantes importantes ;
- les alternatives considérées ;
- le workflow utilisateur ou développeur impacté.

Un ADR doit capturer la raison du changement, pas seulement la forme finale du code. C'est ce qui le rend utile plus tard pour les humains et pour les assistants IA qui doivent comprendre pourquoi le projet fonctionne ainsi.

## Décision

Remplacez cette section par la décision prise.

Soyez assez spécifique pour qu'un autre développeur ou assistant IA puisse appliquer la même règle plus tard. Mentionnez les fichiers, modules, contrats de données, commandes ou conventions qui portent la décision lorsqu'ils sont pertinents.

Exemple :

- stocker les instructions IA projet dans `AI/PROJECT-INSTRUCTIONS.md` ;
- documenter la stack et les commandes dans `AI/PROJECT-STACK.md` et `AI/PROJECT-USEFUL-COMMANDS.md` ;
- exposer les points d'entrée propres aux outils via `AGENTS.md` et `CLAUDE.md` ;
- garder les règles IA réutilisables dans `AI/rules/*.md` ;
- utiliser des liens symboliques quand un document doit apparaître dans Living Documentation sans dupliquer la source de vérité.

## Conséquences

### PROS

- La décision est découvrable depuis la documentation, pas seulement depuis le code.
- Les assistants IA peuvent lire le frontmatter des ADR d'abord, puis charger l'ADR complet seulement s'il correspond à la tâche.
- Les futurs changements peuvent préserver l'intention originale au lieu de la redécouvrir depuis les détails d'implémentation.

### CONS

- L'ADR doit être maintenu quand la décision change.
- Un ADR vague est pire que pas d'ADR, car il donne une fausse confiance aux futurs lecteurs.
- Si la même règle est répétée à trop d'endroits, le projet peut dériver. Préférer une seule source de vérité et créer des liens vers elle.

## Suite

Quand cet exemple devient un vrai ADR :

- renommer le fichier avec la vraie date, catégorie et titre de décision ;
- définir `status` selon la convention du projet : `To be validated`, `Accepted`, `SuperSeeded`, `Partially SuperSeeded`, etc. ;
- remplacer `description` par une phrase utile pour la découverte ;
- remplacer `tags` par des thèmes recherchables ;
- supprimer cette section si elle n'est plus utile.
