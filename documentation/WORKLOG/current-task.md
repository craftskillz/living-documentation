---
**date:** 2026-06-18
**status:** Completed
**description:** Le lightbox du viewer Home accepte maintenant Shift+Click ou Command+Click pour les images et diagrammes Mermaid, sans utiliser Option ni Control.
**tags:** worklog, mermaid, image, lightbox, fullscreen, shift-click, command-click, metaKey, macos, playwright
---

# Current task

## Statut courant

Completed

## Tache courante

Ajouter Command+Click sur macOS comme alternative a Shift+Click pour ouvrir les images et SVG Mermaid dans le lightbox, tout en laissant Option et Control disponibles pour d'autres interactions.

## Implementation

- La condition du gestionnaire delegue `onContentClick` accepte maintenant `event.shiftKey || event.metaKey`.
- `altKey` et `ctrlKey` ne sont pas utilises.
- Le comportement reste identique pour images et Mermaid : meme lightbox, fermeture par Escape, fond ou bouton.
- Le test Mermaid exerce successivement Shift+Click puis Meta/Command+Click.

## Documentation

- ADR Mermaid actualise avec le contrat Shift ou Command et l'exclusion explicite d'Option/Control.
- Guide utilisateur plein ecran actualise.
- Metadonnees rafraichies ; accuracy MCP = 1 pour l'ADR et le guide.

## Verifications realisees

- `npm run build` : OK.
- Test E2E cible Shift+Click + Command+Click : 1/1 OK.
- `git diff --check` : OK.

## Note de coexistence

La modification utilisateur deja presente dans `documentation/2026_05_20_13_28_[CONFERENCE]_test.md` reste preservee.
