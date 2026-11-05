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

Les templates sont des fichiers HTML autonomes, sans CDN. Les diagrammes Mermaid restent affichés comme du code, et le code n'est pas coloré. Les liens relatifs vers d'autres fichiers ne sont pas réécrits : seuls les liens internes `?doc=` et les images relatives (`images/`, `./images/`, `images-ai/`) le sont, pour se résoudre depuis la racine comme dans le viewer. Les annotations du viewer portées par des commentaires HTML (`image-width`, `quote-type`, `quote-title`, `quote-icon`) ne sont pas appliquées : les images occupent la largeur du template et ces encadrés restent de simples citations. Un identifiant de template inconnu de la bibliothèque repropose le choix dans le viewer ; la route répond 404.

Les balises isolées écrites pour un LLM (`<reformule cette phrase>`) s'affichent comme dans le viewer, sous la forme d'un `b` avec infobulle. Elles restent hors du titre, du sommaire et des ancres, et sont masquées à l'impression.

Choisir un template modifie le fichier Markdown, comme le choix de la langue de lecture.

## Vérification

`tests/unit/html-document.test.ts` couvre la structuration et le remplissage, `tests/api/html-templates.spec.ts` la route et ses refus, `tests/e2e/html-templates.spec.ts` le parcours complet.
