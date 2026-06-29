---
**date:** 2026-06-29
**status:** Completed
**description:** Les images produites par generate_image sont separees des pieces jointes et stockees sous images-ai.
**tags:** worklog, workspace, run-agent-document, generate_image, agentRunArtifacts, markdown-image, images-ai, export, mcp
---

# Current task

## Statut courant

Completed

## Tache realisee

Correction du stockage des images generees par IA : `generate_image` n'ecrit plus sous `files/`, qui reste reserve aux pieces jointes utilisateur. Les images IA sont maintenant ecrites sous `images-ai/<dossier du document>/...`.

Le tool retourne maintenant :

```markdown
![image](./images-ai/ADRS/generated-image.png)
```

Le serveur expose `docsPath/images-ai` via `/images-ai`, donc les images restent rendues dans les documents et dans les documents de run agent.

Le comportement precedent reste conserve cote run agent : quand un run persistant appelle `generate_image`, le backend collecte le champ JSON `markdown` retourne par le tool et l'ajoute automatiquement sous `## Response`, apres le texte final du modele, sans doublon si le modele l'a deja cite.

Les exports Markdown et HTML reconnaissent aussi `./images-ai/...` et copient ces assets dans un sous-dossier `images-ai/` du ZIP.

## Contenu modifie

- `src/mcp/tools/images.ts`
- `src/server.ts`
- `src/routes/export.ts`
- `src/mcp/server.ts`
- `src/routes/workspace.ts`
- `tests/api/workspace.spec.ts`
- `tests/api/export.spec.ts`
- `documentation/ADRS/2026_06_29_22_36_[WORKSPACE]_workspace_image_providers_and_generate_image_tool.md`
- `documentation/.metadata.json`
- `documentation/WORKLOG/current-task.md`

## Documentation

ADR mis a jour : `documentation/ADRS/2026_06_29_22_36_[WORKSPACE]_workspace_image_providers_and_generate_image_tool.md`.

Metadonnees ADR rafraichies pour les fichiers source et tests portant la feature. Note : les metadonnees ont ete rafraichies sur un working tree dirty, conformement a l'etat courant deja non commite de la feature Workspace/image.

## Verifications realisees

- `npm run build` : OK.
- `npx playwright test tests/api/workspace.spec.ts` : OK, 2 passed.
- `npx playwright test tests/api/export.spec.ts` : OK, 6 passed.

## Prochaine action recommandee

Tester manuellement un agent reel qui appelle `read_document`, `generate_image`, puis termine par un court message. Le document de run doit afficher le message sous `## Response`, puis le Markdown image `./images-ai/...` juste apres. Verifier aussi que le dossier `files/` ne recoit plus les images generees.
