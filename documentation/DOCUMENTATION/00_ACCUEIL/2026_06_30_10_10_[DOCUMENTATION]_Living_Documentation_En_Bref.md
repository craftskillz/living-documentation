---
**date:** 2026-06-30
**status:** Draft
**description:** Presentation courte de Living Documentation, de son positionnement et de ses usages principaux.
**tags:** presentation, produit, markdown, local-first, git, documentation, agents, mcp, workspace
---

# Living Documentation en bref




## Ce que Living Documentation n'est pas

Living Documentation n'est pas un CMS cloud, un wiki ferme, un outil de generation de code ou un simple editeur Markdown.

L'objectif n'est pas de cacher les fichiers derriere une base proprietaire. L'objectif est de produire une documentation locale, exploitable, claire, versionnee et automatisable.

## Le modele local-first

La documentation repose sur des fichiers presents dans votre espace local :

- les documents sont des fichiers Markdown ;
- les images et fichiers joints restent accessibles comme fichiers ;
- Git peut enregistrer les modifications et permettre la restauration ;
- l'outil peut etre utilise seul, puis enrichi avec MCP et des agents.

Ce modele rend la documentation plus durable : elle reste lisible meme hors de l'interface, et elle peut etre suivie par Git comme n'importe quel artefact important du projet.

## Les fonctions principales

| Fonction | Utilite |
| --- | --- |
| Home | Naviguer dans les dossiers et documents. |
| Editeur Markdown | Rediger, modifier, sauvegarder et enrichir les contenus. |
| Snippets | Inserer rapidement des blocs utiles et coherents. |
| Files et images-ai | Gérer les fichiers joints et les images generees par agents. |
| Diagrammes | Creer des vues visuelles liees a des documents. |
| Admin | Configurer l'application, les chemins, Git et les options globales. |
| Versions Git | Comparer un document avec un commit et restaurer des blocs. |
| Workspace | Configurer providers LLM, agents et workflows. |
| MCP | Connecter des assistants IA aux documents, sources et outils internes. |

## Usages typiques

Living Documentation peut servir dans plusieurs contextes :

- un developpeur solo qui veut garder ADR, notes et schemas dans le meme espace ;
- un tech lead qui veut structurer des decisions, processus et comptes rendus ;
- une equipe qui veut documenter son produit sans perdre la trace Git ;
- un utilisateur avance qui veut automatiser la production documentaire avec des agents ;
- une organisation qui veut transformer les reunions, travaux et decisions en documentation exploitable.

## Lire ensuite

Pour choisir le meilleur chemin selon votre besoin, continuez avec [Parcours recommandes](./02_parcours_recommandes.md). Pour passer directement a la pratique, lisez [Creer un espace documentaire](../01_DEMARRAGE/01_creer_un_espace_documentaire.md).
