---
**date:** 2026-06-30
**status:** Draft
**description:** Charte visuelle pour les captures, illustrations et visuels de la documentation utilisateur.
**tags:** assets, charte-visuelle, screenshots, images, nano-banana-pro, documentation, ui
---

# Charte visuelle

Cette charte sert a produire des visuels coherents pour la documentation utilisateur Living Documentation. Elle couvre les captures d'ecran reelles, les illustrations generees et les images conceptuelles.

## Intention

Les visuels doivent montrer Living Documentation comme un outil professionnel, calme, precis et utile. Le produit doit etre percu comme un atelier documentaire local, pas comme un gadget IA ou une plateforme marketing.

Les images doivent aider a comprendre :

- l'organisation documentaire ;
- l'ecriture et la maintenance de documents ;
- la relation entre Markdown, fichiers et Git ;
- les diagrammes comme vues derivees ;
- le role de Workspace, MCP, providers LLM et agents ;
- la generation d'images et l'automatisation documentaire.

## Ton visuel

| Dimension | Direction |
| --- | --- |
| Ambiance | Serieuse, claire, professionnelle, precise. |
| Style | Documentation produit moderne, technique, sobre. |
| Densite | Suffisamment riche pour etre utile, jamais surchargee. |
| Couleurs | Base claire, noir/blanc, slate, teal, amber. Accents limites. |
| Iconographie | Simple, lisible, orientee usage. |
| Typographie dans les images | Eviter le texte genere. Utiliser la vraie UI pour les textes importants. |

## Captures d'ecran

Utiliser de vraies captures pour tout ce qui explique l'interface.

Regles :

- capturer un etat propre, sans donnees personnelles ;
- utiliser des documents d'exemple realistes ;
- eviter les fenetres trop petites ;
- privilegier les captures 16:9 ou des crops horizontaux ;
- ne pas masquer des elements utiles par des annotations trop grandes ;
- garder la meme resolution de reference quand c'est possible ;
- nommer les fichiers de maniere descriptive.

Exemple de nommage :

```text
home-document-ouvert.png
workspace-graph-providers-agents.png
versions-diff-restaurer-bloc.png
admin-git-integration.png
```

## Images generees

Utiliser Nano Banana Pro pour les images conceptuelles, les ouvertures de chapitre et les schemas non strictement UI.

Regles :

- ne pas generer de fausses captures de Living Documentation ;
- ne pas demander de texte lisible dans l'image ;
- ne pas inclure de logos tiers ;
- eviter les personnages cartoon, les mascottes et les scenes trop ludiques ;
- eviter les palettes monochromes ;
- garder un style technique, editorial et haut de gamme ;
- preferer le ratio 16:9 pour les visuels de chapitre ;
- produire une seule idee forte par image.

## Diagrammes

Les diagrammes doivent etre crees comme vues derivees des documents quand ils representent une architecture, un workflow ou une relation de concepts.

Regles :

- un diagramme explique une structure, pas une decoration ;
- les libelles doivent etre courts ;
- les relations doivent etre explicites ;
- les diagrammes ne doivent pas inventer d'information absente du document source ;
- les diagrammes complexes doivent etre decoupes en plusieurs vues.

## Placement dans les documents

| Type de visuel | Placement recommande |
| --- | --- |
| Hero conceptuel | Debut de section majeure, apres le premier paragraphe. |
| Capture d'ecran | Juste avant ou apres l'etape qu'elle illustre. |
| Diagramme | Dans la section qui explique le modele ou le workflow. |
| Image generee par agent | Dans le document de run, puis reprise manuelle si elle devient utile dans un guide. |

## Texte alternatif

Chaque image integree dans un document final doit avoir un texte alternatif descriptif.

Bon exemple :

```markdown
![Workspace montrant des providers LLM, des agents et un noeud MCP connectes a Living Documentation](../90_ASSETS/images/workspace-providers-agents.png)
```

Mauvais exemple :

```markdown
![image](../90_ASSETS/images/image1.png)
```

