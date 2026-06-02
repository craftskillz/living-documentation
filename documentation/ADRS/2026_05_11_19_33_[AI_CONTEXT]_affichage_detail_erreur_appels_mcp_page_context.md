---
**date:** 2026-05-11
**status:** Accepted
**description:** La page /context conserve le message d'erreur MCP court mais affiche aussi le détail brut ou JSON de l'erreur sous le bouton d'exécution, sans sauvegarder les appels échoués dans AI/MCP.
**tags:** ai-context, mcp-explorer, runMcpItem, setMcpResultError, stringifyMcpErrorDetail, error-detail, isError, JSON-RPC, playwright
---

# Affichage du détail des erreurs MCP dans /context

## Contexte

L'explorateur MCP de la page `/context` permet de tester un outil ou de générer un prompt. Depuis la sauvegarde des résultats en documents Markdown sous `AI/MCP`, les appels réussis affichent un lien vers le document généré.

En revanche, quand un appel échouait (`envelope.error` JSON-RPC ou `result.isError` côté tool), l'UI affichait seulement le message générique `MCP call returned an error` / `L'appel MCP a retourné une erreur.`. L'utilisateur savait que l'appel avait échoué mais ne voyait pas la cause exacte, par exemple `Document not found: missing-doc` ou le payload JSON-RPC reçu.

## Décision

`src/frontend/context.html` garde la phrase courte dans la zone d'erreur existante, puis rend un panneau de détail sous la ligne du bouton :

- `stringifyMcpErrorDetail(value)` extrait un détail lisible depuis :
  - `envelope.error` pour les erreurs JSON-RPC ;
  - `result.content[*].text` quand `result.isError` vient d'un tool MCP ;
  - le JSON complet en fallback.
- `setMcpResultError(kind, name, message, detail)` accepte maintenant un détail optionnel.
- Si un détail existe, le conteneur `data-mcp-result` est affiché avec un `<pre><code>` rouge, scrollable, en monospace.
- Si aucun détail n'existe, le comportement précédent reste valable : le conteneur de résultat est masqué.
- Les erreurs ne sont pas envoyées à `/api/context/mcp-result` et ne créent donc pas de fichier `AI/MCP/*.md`.

`tests/e2e/context.spec.ts` couvre le cas en appelant `read_document` avec un identifiant inexistant et vérifie que l'UI affiche à la fois le message générique et le détail `Document not found: missing-doc`.

## Conséquences

- L'utilisateur peut diagnostiquer un appel MCP échoué sans ouvrir la console navigateur ni rejouer l'appel avec curl.
- Les résultats sauvegardés sous `AI/MCP` restent réservés aux appels réussis.
- L'affichage du détail ne nécessite pas de nouvelle clé i18n : seul le message court existant reste traduit, le détail est une donnée runtime produite par le serveur MCP.
