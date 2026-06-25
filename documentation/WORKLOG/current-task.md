---
**date:** 2026-06-25
**status:** Completed
**description:** Ajout d'une timeline live pour les runs agents du Workspace et persistance globale des notifications entre routes/reload.
**tags:** worklog, workspace, agent, streaming, mcp, tool-calls, toast, persistence, svelte, backend
---

# Current task

## Statut courant

Completed

## Tache realisee

Le lancement d'un agent depuis `/workspace` affiche maintenant une timeline live des interactions pendant l'execution, au lieu d'un simple message `Running agent...` jusqu'a la reponse finale.

Les notifications de type sonner/toast sont maintenant gerees comme un element global rattache a `document.body` et persistees dans `localStorage`, afin de rester visibles en naviguant vers Home, Diagram ou Workspace, et de reapparaitre apres un refresh.

La topbar et l'application racine interceptent aussi les liens internes de navigation pour utiliser le routeur client Svelte (`history.pushState`) au lieu de provoquer un rechargement complet de page.

Le lancement effectif depuis `/agents` alimente maintenant le toast global persistant ; l'ancien toast local de `Agents.svelte` a ete retire pour eviter les doublons ou superpositions.

## Contenu modifie

- Ajout d'evenements observables dans la boucle `runAgent()` : chargement des tools MCP, appel modele, fallback sans tools, tool call, resultat tool, reponse finale et erreur.
- Ajout de `POST /api/workspace/run-agent-stream`, qui renvoie les evenements au navigateur en NDJSON sans casser la route JSON existante `POST /api/workspace/run-agent`.
- Ajout de `runAgentPromptStream()` cote frontend pour lire le stream `ReadableStream` et fournir les evenements au moteur UI.
- Remplacement de l'affichage agent par une timeline scrollable conservant l'animation d'attente et affichant la reponse finale dans un bloc separe.
- Ajout du module `persistentToast.ts` pour stocker l'etat du toast courant dans `localStorage`, creer/restaurer son DOM global au montage de l'application, et expirer les etats loading apres 15 minutes.
- Evolution de `persistentToast.ts` vers une pile de toasts persistants : plusieurs notifications peuvent coexister, chaque toast a un bouton de fermeture, et l'ancien format `localStorage` mono-toast reste relu.
- Mise a jour du toast global a chaque evenement de stream agent, notamment appels tools et resultats tools, afin que la notification reste informative meme hors de Workspace.
- Conservation du toast de fin de run agent pendant 10 minutes, avec un message indiquant que le resultat a ete sauvegarde dans `AI/WORKSPACE`, au lieu d'un toast succes standard de 2,6 secondes.
- Branchement de `Agents.svelte` sur `persistentToast.ts` pour que les runs lances depuis `/agents` restent visibles apres navigation hors de la page.
- Suppression du toast local de `Agents.svelte`, remplace par le toast global persistant.
- Reprise de l'apparence du toast `/agents` pour le toast global persistant : carte claire, icone ronde par etat, ombre discrete et bouton fermer.
- Restauration du lien cliquable vers le document Markdown genere depuis le toast persistant de succes `/agents`.
- Enrichissement des erreurs de run agent : les exceptions serveur sont maintenant ecrites dans le Markdown d'execution avec phase, nom, message et stack trace.
- Ajout de `POST /api/workspace/run-agent-document-failure` pour permettre a `/agents` de generer un Markdown d'echec meme lorsqu'une exception client survient pendant l'appel principal, si le serveur reste joignable.
- Lecture robuste des reponses `/agents` : les reponses non JSON ou les exceptions `fetch` produisent un message detaille et, quand possible, un lien vers le Markdown d'echec.
- Ajout d'une interception des liens internes dans `Topbar.svelte` pour eviter les refreshs complets entre Home, Diagram, Workspace et les autres routes Svelte.
- Ajout d'une interception globale en capture dans `App.svelte` pour couvrir tous les liens internes, pas seulement les liens de la topbar.
- Restauration du toast persistant des le bootstrap `main.ts`, avant le montage des routes Svelte, puis a chaque changement de route.
- Rehausse du `z-index` du toast global pour qu'il reste visible au-dessus des surfaces Diagram.
- Ajout des styles CSS de timeline, etats tool/fallback/error/final, et keyframes necessaires dans le CSS global importe par l'application.

## Fichiers concernes

- `src/routes/workspace.ts`
- `src/frontend-svelte/src/lib/workspace/persistence.ts`
- `src/frontend-svelte/src/lib/workspace/app.ts`
- `src/frontend-svelte/src/lib/workspace/styles.css`
- `src/frontend-svelte/src/lib/persistentToast.ts`
- `src/frontend-svelte/src/lib/Topbar.svelte`
- `src/frontend-svelte/src/App.svelte`
- `src/frontend-svelte/src/main.ts`
- `src/frontend-svelte/src/routes/Agents.svelte`
- `src/frontend-svelte/src/routes/Workspace.svelte`
- `src/frontend-svelte/src/styles/app.css`

## Verifications realisees

- `npm run build` : OK.
- `graphify update .` execute apres modification du code.

## Limite connue

Le toast `Running agent...` reapparait apres refresh, mais un refresh navigateur peut couper la requete HTTP de streaming en cours cote navigateur. Cette etape ne transforme pas encore les runs agents en jobs serveur persistants/reprenables.

## Point documentaire

L'ADR Workspace devrait etre completee pour mentionner la route `run-agent-stream`, la timeline live des tool calls, la persistance globale des toasts et l'interception SPA de la topbar. Je ne l'ai pas rebaselinee avec `refresh_metadata`, car le working tree contient deja plusieurs modifications non commitees et des fichiers generes/experimentaux ; le projet demande d'eviter d'enregistrer des metadonnees Living Documentation sur un `HEAD` dirty.

## Prochaine action recommandee

Apres commit ou nettoyage des modifications en cours, mettre a jour l'ADR Workspace et rafraichir ses metadonnees pour integrer cette evolution durable.
