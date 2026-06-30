---
**date:** 2026-06-30
**status:** Draft
**description:** Parcours de lecture recommandes selon les profils, objectifs et niveaux d'usage.
**tags:** parcours, onboarding, documentation-utilisateur, roles, agents, git, mcp, workspace
---

# Parcours recommandes

![Organisation documentaire flexible autour de parcours, processus, references et connaissances techniques](../90_ASSETS/images/concept-09-organisation-documentaire.png)

Cette page aide a choisir les documents a lire en premier. Living Documentation peut etre utilise simplement comme atelier Markdown local, ou plus largement comme environnement documentaire avec Git, diagrammes, agents et MCP.

## Si vous avez dix minutes

1. Lire [Living Documentation en bref](./01_living_documentation_en_bref.md).
2. Creer un espace documentaire avec [Creer un espace documentaire](../01_DEMARRAGE/01_creer_un_espace_documentaire.md).
3. Creer et modifier un document avec [Creer, modifier et retrouver un document](../01_DEMARRAGE/02_creer_modifier_et_retrouver_un_document.md).
4. Revenir ensuite a cette page pour choisir un parcours plus complet.

## Parcours par profil

| Profil | Priorite | Parcours conseille |
| --- | --- | --- |
| Nouvel utilisateur | Comprendre et ecrire vite | Accueil, Demarrage, Usage quotidien |
| Redacteur de documentation | Produire des pages propres et reutilisables | Demarrage, Snippets, Images, Export |
| Developpeur solo | Garder decisions, notes et documentation de code au meme endroit | Demarrage, Git, Diagrammes, ADR, Metadata |
| Tech lead | Structurer une base documentaire d'equipe | Organisation, Reunions, Processus, Versions |
| Administrateur | Stabiliser les chemins, Git, fichiers et comportement global | Admin, Git, Reference, Depannage |
| Utilisateur IA | Automatiser la documentation avec LLM et agents | Workspace, MCP, Agents, Providers image |

## Parcours par objectif

| Objectif | Lire en premier |
| --- | --- |
| Creer une documentation projet | [Creer un espace documentaire](../01_DEMARRAGE/01_creer_un_espace_documentaire.md) puis `../02_USAGE_QUOTIDIEN/organiser_une_documentation_projet.md` |
| Prendre des notes de reunion | `../02_USAGE_QUOTIDIEN/prendre_des_notes_de_reunion.md` |
| Documenter un processus | `../02_USAGE_QUOTIDIEN/documenter_un_processus.md` |
| Ajouter images et fichiers | `../02_USAGE_QUOTIDIEN/utiliser_les_snippets_les_images_et_les_fichiers.md` |
| Creer un diagramme | `../02_USAGE_QUOTIDIEN/creer_et_lier_un_diagramme.md` |
| Activer Git et restaurer une version | `../04_ADMINISTRATION/utiliser_git_et_les_versions.md` puis `../04_ADMINISTRATION/restaurer_un_bloc_depuis_une_version_git.md` |
| Configurer des agents | `../03_AUTOMATISATION_IA/configurer_un_workspace_llm.md` puis `../03_AUTOMATISATION_IA/executer_un_agent_workspace.md` |
| Generer une image documentaire | `../03_AUTOMATISATION_IA/generer_une_image_depuis_un_agent.md` |
| Comprendre le modele produit | `../05_COMPRENDRE/living_documentation_comme_atelier_documentaire.md` |

## Parcours pour une equipe

Pour une equipe, le parcours recommande est progressif :

1. Definir l'espace documentaire et les dossiers principaux.
2. Activer Git si l'equipe veut un historique fiable.
3. Stabiliser les conventions de nommage.
4. Creer les premiers guides de reunion, processus et decisions.
5. Ajouter les diagrammes utiles.
6. Introduire les agents seulement quand les workflows humains sont deja clairs.

Cette progression evite de construire une automatisation sur une base documentaire instable.

## Parcours pour l'automatisation agentique

![Laboratoire d'automatisation agentique reliant documentation locale, agents IA, MCP, Git et generation d'images](../90_ASSETS/images/concept-12-laboratoire-agentique.png)

Pour utiliser Living Documentation comme laboratoire d'automatisation documentaire :

1. Configurer un ou plusieurs providers LLM dans Workspace.
2. Distinguer les providers chat, les providers capables d'utiliser des tools et les providers image.
3. Creer un agent simple avec une instruction courte et verifiable.
4. Executer l'agent sur un document non critique.
5. Lire le document de run produit par l'agent.
6. Ajuster le prompt, les tools et la memoire de run.
7. Ajouter ensuite des workflows plus riches : lecture de document, mise a jour, generation d'image, synthese ou verification.

## A retenir

Living Documentation ne vous impose pas une methode documentaire unique. Vous pouvez organiser vos contenus par produit, equipe, processus, decision, parcours utilisateur ou modele inspire de Diataxis. L'important est que la structure reste lisible, maintenable et utile aux personnes qui vont la consulter.
