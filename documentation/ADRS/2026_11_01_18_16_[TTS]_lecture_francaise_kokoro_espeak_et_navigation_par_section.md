---
type: ADR
title: Lecture française avec Kokoro et eSpeak NG, navigation par section
description: Le TTS local lit le français avec la voix Kokoro ff_siwis et des phonèmes eSpeak NG, sans cloud ni Python ; le lecteur ignore les appels de notes et permet de sauter à la section suivante ; la page HTML générée est lue de la même façon, limitée à son contenu principal.
tags:
  - tts
  - kokoro
  - espeak
  - i18n
  - viewer
  - html-view
status: To be validated
---

## Contexte

Le bouton « Écouter » refusait les documents `language: fr` avec une erreur HTTP 422 : `KokoroTtsEngine` n'exposait que l'anglais, car le phonémiseur utilisé par `kokoro-js` ne contient que des données anglaises. Le lecteur lisait aussi à voix haute les numéros d'appel de notes et leurs liens de retour, et ne permettait pas de passer à la section suivante.

## Décision

### Français : même modèle, phonèmes fournis par eSpeak NG

`KokoroTtsEngine` expose `en` et `fr`. Le français utilise la voix `ff_siwis`, déjà fournie avec `kokoro-js`. Le nouvel adaptateur `src/lib/tts/adapters/frenchPhonemes.ts` charge `@echogarden/espeak-ng-emscripten` à la demande, produit l'IPA du français et le convertit vers le vocabulaire de Kokoro, en conservant ponctuation, liaisons et voyelles nasales. Le résultat passe par `generate_from_ids` sur le même modèle. Le chemin anglais reste celui de `generate`.

La synthèse reste entièrement locale : ni service cloud, ni installation Python. Les deux dépendances restent optionnelles et leurs versions sont verrouillées (`kokoro-js` 1.2.1, `@echogarden/espeak-ng-emscripten` 0.3.5), car le français dépend de l'API interne de phonémisation et du vocabulaire du modèle.

### Script de lecture : ne pas lire les appels de notes

`readingTextNodes` (`readingScript.ts`) exclut les liens générés pour les appels de notes et leurs retours. Le lecteur réutilise ces mêmes nœuds pour calculer les plages de surlignage, ce qui évite tout décalage après un appel de note. Les nombres ordinaires, les exposants et le texte des définitions de notes restent lus. Le document et ses liens ne sont pas modifiés.

### Navigation : « Section suivante »

Le bouton `tts-next-section` saute au prochain titre `h1` à `h6`. Un titre contenant plusieurs phrases ne compte que pour une étape. La lecture reprend au nouveau titre, ou reste en pause si elle était suspendue, et le bouton est désactivé en fin de document. Les sauts rapides invalident les réponses audio en attente, et l'échec d'une prélecture abandonnée n'interrompt pas la nouvelle section. La position n'est pas mémorisée entre les sessions.

### Départ de la lecture : depuis la sélection

Si une sélection existe dans le document, « Écouter » démarre à son premier mot, puis continue jusqu'à la fin du document. La fin de sélection est ignorée. `readingStartFromSelection` (`readingScript.ts`) renvoie une position logique, segment et décalage dans le texte lu, plutôt qu'un `Range` DOM : elle est capturée au clic et reste valable après la fenêtre de choix de langue et la sauvegarde du frontmatter.

Dans un widget annoncé, la lecture commence par son annonce ; sur un texte non lu, comme un appel de note, au prochain texte lu. Sans sélection dans le document, elle part du début. La sélection n'est pas modifiée, et la position ne peut pas être changée pendant une lecture en cours ou en pause.

### Lecture de la page HTML générée

La page `/html-view` propose les mêmes boutons que le viewer : `TtsControls.svelte` porte les boutons et la fenêtre de choix de langue pour les deux écrans. Seul le contenu de `<main>` est lu : les templates y placent `{{content}}`, et laissent l'en-tête et le sommaire au-dehors. Le surlignage est enregistré dans le document de l'élément lu (`ownerDocument`), donc dans l'iframe, avec sa feuille de style injectée ; le viewer n'est pas affecté. La sélection prise en compte est celle de l'iframe. Un rechargement de l'iframe, après une modification, arrête la lecture.

Un nouveau template doit garder le contenu du document dans `<main>`, et seulement lui, pour que la lecture reste juste.

## Conséquences

- Monter la version de `kokoro-js` ou d'eSpeak NG demande de relancer le test d'inférence réelle : `LD_TEST_TTS=1 npx playwright test tests/api/tts.spec.ts --workers=1`. Sans cette variable, il est ignoré.
- Le premier usage peut télécharger le modèle Kokoro.
- D'autres langues demanderaient une voix Kokoro et une conversion de phonèmes dédiées : elles ne sont pas couvertes par cette décision.

## Tests

- Unitaires : `tests/unit/frenchPhonemes.test.ts`.
- API : `tests/api/tts.spec.ts`.
- E2E : `tests/e2e/tts-reading.spec.ts`, `tests/e2e/viewer.spec.ts`, `tests/e2e/html-view-tts.spec.ts`.
