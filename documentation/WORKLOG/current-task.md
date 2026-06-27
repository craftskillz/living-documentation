---
**date:** 2026-06-27
**status:** Completed
**description:** Evolution du bouton Ecouter pour persister la langue de lecture du document dans le frontmatter et refuser explicitement les langues TTS non supportees.
**tags:** worklog, tts, kokoro, frontmatter, language, svelte, ports-adapters, playwright
---

# Current task

## Statut courant

Completed

## Tache realisee

Le bouton `Ecouter` du viewer Home a ete etendu pour tenir compte de la langue documentaire.

Le flux retenu est :

- lire la langue dans le frontmatter du document (`language`, `lang`, `locale` ou `langue`, en YAML simple ou format bold Markdown) ;
- si aucune langue n'est presente, afficher une modale de choix Anglais / Francais ;
- apres selection, ajouter `**language:** en` ou `**language:** fr` au frontmatter du document, puis sauvegarder via l'API document existante ;
- transmettre la langue choisie au player TTS puis a la route `/api/tts` ;
- utiliser Kokoro via le port serveur TTS et afficher une erreur explicite quand la langue n'est pas supportee.

## Contenu modifie

- Ajout de `src/lib/documentLanguage.ts` pour parser, normaliser et ecrire la langue de lecture dans le frontmatter.
- Extension du port TTS (`TtsLanguage`, `supportedLanguages`, `language` dans `SynthesizeOptions`, erreur `TtsUnsupportedLanguageError`).
- Extension de l'adapter Kokoro pour declarer uniquement `en` comme langue supportee avec le modele actuellement utilise.
- Extension de `/api/tts/status` et `POST /api/tts` pour valider et transmettre `language`.
- Extension de `DocViewer.svelte` avec modale de choix de langue, sauvegarde du frontmatter, passage de langue au player, et affichage des erreurs TTS.
- Ajout des traductions i18n EN/FR pour la modale de langue.
- Ajout de tests unitaires et E2E ciblés.

## Fichiers concernes

- `src/lib/documentLanguage.ts`
- `src/lib/tts/types.ts`
- `src/lib/tts/index.ts`
- `src/lib/tts/adapters/kokoro.ts`
- `src/routes/tts.ts`
- `src/frontend-svelte/src/lib/home/DocViewer.svelte`
- `src/frontend-svelte/src/lib/home/ttsPlayer.svelte.ts`
- `src/frontend-svelte/public/i18n/en.json`
- `src/frontend-svelte/public/i18n/fr.json`
- `tests/unit/document-language.spec.ts`
- `tests/e2e/viewer.spec.ts`
- `graphify-out/*`

## Verifications realisees

- `npm run build` : OK.
- `git diff --check` : OK.
- `npx playwright test tests/unit/document-language.spec.ts --project=chromium` : OK, 4 tests passes.
- `npx playwright test tests/e2e/viewer.spec.ts --project=chromium` : OK, 4 tests passes.
- `graphify update .` : OK.

## Limites connues

- Le package `kokoro-js` actuellement installe expose uniquement des voix `en-us` / `en-gb`; la lecture anglaise reste donc sur Kokoro.
- La langue `fr` peut etre choisie et persistee dans le frontmatter, mais l'adapter Kokoro renvoie pour l'instant une erreur explicite si on tente de synthetiser un document francais.
- Le build Vite conserve le warning de chunk > 500 kB deja observe.

## Point documentaire

Aucun ADR n'a ete cree pendant cette passe, car l'arbre Git contient deja une feature TTS non commitee. La regle projet demande d'eviter `add_metadata` / `refresh_metadata` ADR sur un `HEAD` sale sans validation explicite.

Un ADR durable sera pertinent apres commit/stabilisation pour documenter : port TTS serveur, Kokoro anglais, langue documentaire dans le frontmatter, et comportement de refus par langue.

## Prochaine action recommandee

Verifier manuellement le flux sur un document `language: fr`, puis committer la feature TTS complete. Ensuite creer l'ADR TTS et attacher les fichiers source concernes via metadata.
