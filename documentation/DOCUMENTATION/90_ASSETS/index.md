---
**date:** 2026-06-30
**status:** Draft
**description:** Index des assets visuels utilises ou prevus pour la documentation utilisateur.
**tags:** assets, images, screenshots, nano-banana-pro, documentation, index
---

# Index des assets visuels

Ce fichier inventorie les visuels disponibles pour la documentation utilisateur. Les images conceptuelles sont generees avec Nano Banana Pro ; les captures d'ecran doivent rester de vraies captures de l'application.

## Images conceptuelles disponibles

| Image                           | Usage principal                                     | Fichier                                            |
| ------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Hero produit                    | Accueil general, couverture de documentation        | `images/concept-01-hero-produit.jpg`               |
| Documentation obsolete          | Explication de la documentation vivante et du drift | `images/concept-02-documentation-drift.png`        |
| Architecture local-first        | Demarrage, modele local Markdown + Git              | `images/concept-03-local-first.jpg`                |
| Workflow MCP et agents          | Automatisation IA, MCP, agents                      | `images/concept-04-mcp-agent-workflow.png`         |
| Cycle de vie ADR                | ADR, validation, supersession                       | `images/concept-05-adr-lifecycle.png`              |
| Fiabilite metadata              | Metadonnees, hashes, drift documentaire             | `images/concept-06-metadata-reliability.png`       |
| Workspace providers et agents   | Workspace LLM, providers, agents, provider image    | `images/concept-07-workspace-providers-agents.jpg` |
| Versions Git et restauration    | Comparaison de versions, restauration de bloc       | `images/concept-08-git-versions-restore.png`       |
| Organisation documentaire       | Structuration flexible, avec ou sans Diataxis       | `images/concept-09-organisation-documentaire.png`  |
| Flux vers documentation vivante | Passage du travail brut a un artefact documentaire  | `images/concept-10-living-documentation-flow.png`  |
| Notes de reunion et processus   | Usage quotidien, comptes rendus, process            | `images/concept-11-reunions-processus.png`         |
| Laboratoire agentique           | Positionnement Workspace, MCP, agents et images     | `images/concept-12-laboratoire-agentique.png`      |

## Images deja integrees

| Document                                          | Image                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `00_ACCUEIL/00_index.md`                          | `concept-01-hero-produit.jpg`                                                      |
| `00_ACCUEIL/01_living_documentation_en_bref.md`   | `concept-03-local-first.jpg`                                                       |
| `00_ACCUEIL/02_parcours_recommandes.md`           | `concept-09-organisation-documentaire.png`, `concept-12-laboratoire-agentique.png` |
| `01_DEMARRAGE/01_creer_un_espace_documentaire.md` | `concept-03-local-first.jpg`                                                       |

## Images a privilegier ensuite

| Prochain document     | Image recommandee                           |
| --------------------- | ------------------------------------------- |
| Documentation vivante | `concept-02-documentation-drift.png`        |
| Git et Versions       | `concept-08-git-versions-restore.png`       |
| Workspace et agents   | `concept-07-workspace-providers-agents.jpg` |
| MCP et agents IA      | `concept-04-mcp-agent-workflow.png`         |
| Notes de reunion      | `concept-11-reunions-processus.png`         |
| Metadata reliability  | `concept-06-metadata-reliability.png`       |

## Regle de maintenance

Quand une image est ajoutee dans un document final, mettre a jour la section "Images deja integrees". Quand une image est remplacee, conserver le prompt source dans [prompts_images.md](./prompts_images.md).
