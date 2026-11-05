---
type: ADR
title: Générer un document en HTML avec un template de présentation
description: Le viewer présente un document Markdown dans un template HTML choisi une fois dans une bibliothèque livrée avec l'application ; le choix vit dans le frontmatter et la page est rendue à la demande.
tags:
  - html
  - templates
  - rendering
  - viewer
  - frontmatter
  - csp
status: To be validated
---

# Générer un document en HTML avec un template de présentation

## Contexte

Certains documents se lisent mieux dans une page HTML soignée que dans le viewer. Le template porte uniquement le style et la présentation ; le contenu reste celui du Markdown. Cette bibliothèque est distincte des [templates Markdown](./2026_09_16_23_36_[FRONTEND]_templates_markdown_classes_par_dossier.md), qui fournissent du contenu à copier.

## Décision

Le bouton **Générer en HTML** du viewer ouvre la bibliothèque au premier clic. Une fois le template choisi, il laisse place à **Voir en HTML**, qui ouvre la page dans une nouvelle fenêtre, et à un bouton pour changer de template.

- **Le choix vit dans le frontmatter** (`html_template: <id>`). Il suit le document lors d'un déplacement ou d'un renommage, sans store indexé par identifiant à migrer.
- **La page est rendue à la demande** par `GET /api/html-templates/render?doc=<id>`. Aucun fichier HTML n'est écrit : la page reflète toujours le Markdown courant et ne peut pas être périmée.
- **La bibliothèque est livrée avec l'application** : fichiers `html-templates/<id>.html`, déclarés par dossier dans `src/lib/htmlTemplates.ts`, copiés dans `dist/html-templates/` au build. Les noms et descriptions sont dans les catalogues i18n. Il n'y a pas d'édition depuis l'interface.
- **Un template reçoit quatre valeurs** : `{{title}}`, `{{language}}`, `{{toc}}`, `{{content}}`, remplacées en une seule passe. Le premier `h1` du document devient le titre, sinon le titre du document est utilisé. Chaque `h2` de premier niveau ouvre une `<section class="ld-section">` ancrée, ce qui permet au CSS de styler les sections sans JavaScript.
- **Aucun script ne s'exécute dans la page.** Elle est servie sur l'origine de l'application et un document peut contenir du HTML brut : une CSP `default-src 'none'` n'autorise que les styles en ligne, les images et les polices.

## Conséquences et limites

Les templates sont des fichiers HTML autonomes, sans CDN. Les diagrammes Mermaid restent affichés comme du code, et le code n'est pas coloré. Les liens relatifs vers d'autres fichiers ne sont pas réécrits : seuls les liens internes `?doc=` et les images relatives (`images/`, `./images/`, `images-ai/`) le sont, pour se résoudre depuis la racine comme dans le viewer. Un identifiant de template inconnu de la bibliothèque repropose le choix dans le viewer ; la route répond 404.

Les balises isolées écrites pour un LLM (`<reformule cette phrase>`) s'affichent comme dans le viewer, sous la forme d'un `b` avec infobulle. Elles restent hors du titre, du sommaire et des ancres, et sont masquées à l'impression.

Choisir un template modifie le fichier Markdown, comme le choix de la langue de lecture.

## Vérification

`tests/unit/html-document.test.ts` couvre la structuration et le remplissage, `tests/api/html-templates.spec.ts` la route et ses refus, `tests/e2e/html-templates.spec.ts` le parcours complet.

## Annotations du viewer

Les commentaires `image-width`, `image-align`, `quote-type`, `quote-title` et `quote-icon` sont appliqués côté serveur, pour tous les templates, car la page générée n'exécute aucun script. `src/lib/htmlAnnotations.ts` les lit dans le HTML rendu, où `marked` les laisse juste avant leur bloc et échappe ceux écrits dans du code. Le viewer, lui, associe la source au DOM par index ; le post-traitement évite d'avoir à le faire.

Les types, les icônes et les largeurs sont partagés avec le viewer dans `src/lib/contentAnnotations.ts`. Les styles sont injectés avant `</head>` : un nouveau template en bénéficie sans rien déclarer. Un encadré sans type garde l'apparence de citation du template, et les encadrés typés reprennent les couleurs du viewer en thème clair.

Écarts avec le viewer : les largeurs d'image s'appliquent aussi dans le rendu d'un bloc `:::compare`, ce que le viewer ne fait pas. Une icône seule se place au début de la citation quand celle-ci ne commence pas par un paragraphe. Un commentaire écrit à l'intérieur d'une citation s'applique à une citation imbriquée qui le suit, ce que le viewer ne fait pas.

## Édition depuis la page HTML

**Voir en HTML** ouvre la page d'application `/html-view?doc=<id>`, qui affiche le rendu dans une iframe `sandbox="allow-same-origin"`. L'absence de `allow-scripts` et la CSP empêchent tout script du document de s'exécuter ; `allow-same-origin` permet seulement à la page parente de lire le contenu de l'iframe et d'écouter ses événements (`src/frontend-svelte/src/lib/html-view/htmlFrame.ts`). La route de rendu reste inchangée dans son rôle : le bouton « Ouvrir seule pour imprimer » l'ouvre directement.

- **Clic droit** : sur un bloc portant `data-source-lines`, il ouvre `SectionEditor` directement. La page rendue porte donc ces attributs, comme le viewer, et les annotations les conservent. Le titre, le sommaire et les notes n'ont pas de bloc source : le menu du navigateur reste affiché, comme sur un fichier réservé.
- **Texte sélectionné** : le menu du navigateur reste affiché. La sélection est relevée au `mousedown`, car sur macOS le clic droit sélectionne lui-même le mot visé avant `contextmenu`.
- **Fermeture** : le HTML est rechargé et le défilement restauré, y compris après une annulation, car l'éditeur a pu enregistrer automatiquement.
- **Liens** : l'iframe ne peut pas sortir d'elle-même. La page parente ouvre les liens `/?doc=` dans l'application et les liens `http`, `https` et `mailto` dans un nouvel onglet. Elle ignore les autres protocoles : exécuter un lien `javascript:` depuis la page parente donnerait au document l'accès à l'application.

Limite : une page laissée ouverte n'est pas rechargée si le document change ailleurs. Le clic droit se fonde alors sur la version chargée ; l'enregistrement est refusé par le contrôle de concurrence (409) plutôt que d'écraser le fichier.

`tests/e2e/html-view.spec.ts` couvre ce parcours.
