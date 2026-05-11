---
**date:** 2026-05-07
**status:** To be validated
**description:** Ajout d'une provenance documentaire evidence sur les noeuds et relations de diagramme crees via MCP, avec consultation des sources dans l'editeur.
**tags:** mcp, diagram, evidence, provenance, documents, read_diagram, create_diagram, source-mode, auditability, evidenceLayer
---

# Provenance documentaire des noeuds et relations de diagramme

## Contexte

Les diagrammes crees par `create_diagram` pouvaient decrire des noeuds et des relations, mais ne portaient pas la preuve documentaire qui justifiait leur presence. Il etait donc impossible de savoir si un element venait d'un ADR, d'un README, d'un document cree pour l'occasion ou d'une inference non auditable de l'agent.

Pour Living Documentation, les diagrammes doivent rester des vues derivees de la documentation Markdown. La provenance doit donc citer des documents, pas le code source.

## Decision

`create_diagram` accepte maintenant un champ optionnel `evidence` sur les noeuds et les edges. Chaque entree contient :

- `documentId` : identifiant retourne par `list_documents` ou `create_document` ;
- `section` : section documentaire citee, optionnelle ;
- `summary` : resume court du fait documentaire qui justifie l'element, optionnel.

Le MCP persiste `evidence` tel quel dans `.diagrams.json` apres validation minimale du format. `read_diagram` restitue les preuves existantes pour permettre un round-trip MCP sans perte de provenance.

Les diagrammes architecturaux (`context`, `container`, `component`, `uml`) sans aucune evidence recoivent un warning non bloquant : le champ reste optionnel pour compatibilite, mais l'absence de provenance est visible.

Cote editeur, la sauvegarde et l'historique preservent `evidence`. Un mode "consultation des sources" affiche des marqueurs sur les noeuds et relations ayant des preuves ; cliquer un marqueur ouvre un panneau lateral listant les documents sources avec liens `/?doc=...`.

## Consequences

Les diagrammes deviennent auditables : chaque element peut pointer vers les documents qui le justifient. Les anciens diagrammes restent lisibles, car `evidence` est optionnel.

La feature ne valide pas que chaque `documentId` existe au moment de la creation du diagramme. Cette verification reste une responsabilite de workflow MCP : lire les documents avant de dessiner, et creer le document manquant avant de le citer.
