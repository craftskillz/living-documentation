---
**date:** 2026-06-30
**status:** To be validated
**description:** Ajoute une integration Git configurable dans Admin qui commit automatiquement les changements de docsFolder apres les sauvegardes Living Documentation et expose son etat via /api/git/status.
**tags:** git, admin, autocommit, docsFolder, gitIntegration, gitAutoCommitMiddleware, gitStatus, persistentToast, .living-doc.json, push
---

# Integration Git Admin et autocommit du dossier docs

## Contexte

Living Documentation modifie plusieurs fichiers sous `docsFolder` : documents Markdown, pieces jointes, images, diagrammes, metadata, workspace runs, contexte IA et configuration `.living-doc.json`. Jusqu'ici, l'utilisateur devait versionner ces changements manuellement, sans rappel lorsque le projet n'avait pas encore choisi de strategie Git.

La contrainte principale est de ne jamais prendre possession des fichiers source du projet. Un depot Git peut etre initialise exactement sur `docsFolder` ou plus haut dans l'arborescence, mais l'integration Living Documentation ne doit committer que le pathspec correspondant a `docsFolder`.

## Decision

### Etat de configuration Git

`StoredConfig.gitIntegration` ajoute un etat tri-state dans `.living-doc.json` :

- `unconfigured` : etat par defaut, ni active ni desactive. L'application affiche un toast invitant l'utilisateur a configurer l'integration Git dans Admin.
- `disabled` : choix explicite, aucun commit ni push automatique.
- `enabled` : les sauvegardes Living Documentation declenchent un commit automatique limite a `docsFolder`.

La configuration stocke aussi :

- `commitMessage`, par defaut `docs: update living documentation` ;
- `pushMode`, `never` ou `everyNCommits` ;
- `pushEveryCommits`, borne entre 1 et 1000.

`readConfig()` normalise cette configuration pour tolerer une edition manuelle partielle ou invalide du JSON.

### Autocommit limite a docsFolder

`src/lib/git-integration.ts` resout le depot Git avec `git rev-parse --show-toplevel` depuis `docsFolder`, calcule le chemin relatif de `docsFolder` dans ce depot, puis utilise toujours ce pathspec pour les operations :

```bash
git add -A -- <docsPathspec>
git commit -m "docs: update living documentation" -- <docsPathspec>
```

Ainsi, si le depot Git est situe au-dessus de `docsFolder`, les changements hors documentation restent hors du commit. Ils sont signales par `/api/git/status`, mais ne bloquent pas le commit documentaire.

Le middleware `gitAutoCommitMiddleware()` est monte globalement cote serveur et ne s'active que pour les requetes HTTP qui peuvent ecrire. Pour `/mcp`, il filtre les appels `tools/call` et ne declenche l'autocommit que pour les tools qui ecrivent reellement (`create_document`, `update_document`, `create_diagram`, metadata, `generate_image`, `save_context`). Les appels de lecture MCP ne peuvent donc pas committer d'anciens changements.

### Push optionnel sans compteur applicatif

Lorsque `pushMode` vaut `everyNCommits`, l'application ne persiste pas de compteur. Elle interroge Git apres commit avec `git rev-list --count @{upstream}..HEAD` et lance `git push` lorsque l'avance locale atteint `pushEveryCommits`.

Si aucune branche upstream n'est configuree, le commit local reste valide et l'utilisateur recoit un avertissement via l'etat Git.

### Etat et toasts frontend

`GET /api/git/status` retourne l'etat de configuration, le depot resolu, le pathspec docs, les changements docs/hors docs, l'avance upstream et le dernier resultat d'autocommit.

Le frontend ajoute `gitToast.ts` :

- au chargement, au changement de route et apres les requetes de sauvegarde, il interroge `/api/git/status` ;
- en etat `unconfigured`, il affiche le toast `Veuillez configurer l'integration Git dans la page Admin.` avec un lien vers `/admin` ;
- en etat `enabled`, il affiche les erreurs de configuration Git, de commit, de push, ou les changements hors du chemin absolu de `docsFolder` qui seront ignores ;
- quand Git remonte `cannot lock ref 'HEAD' ... but expected ...`, le toast remplace cette erreur technique de concurrence par `un autre commit a modifié HEAD pendant l'autocommit. Réessayez l'enregistrement.`.

Admin expose une section `Integration Git` avec les radios `Non configure`, `Desactive`, `Active`, puis les options de commit/push lorsque Git est active.

## Consequences

### Avantages

- Le comportement par defaut est explicite : tant que Git n'est pas configure, l'utilisateur est invite a choisir.
- Le depot Git peut etre le dossier docs ou un parent du projet, sans risque de committer les fichiers source hors `docsFolder`.
- Les changements hors `docsFolder` sont visibles mais non bloquants.
- Le push cadence s'appuie sur l'etat Git reel plutot que sur un compteur applicatif fragile.
- Les sauvegardes provenant des routes REST et des tools MCP d'ecriture entrent dans le meme mecanisme.
- Le toast d'erreur evite d'exposer le message Git brut quand deux commits concurrents font avancer `HEAD` pendant l'autocommit.

### Limites

- L'autocommit utilise le binaire `git` local du serveur Node ; si Git ou l'identite utilisateur ne sont pas configures, le commit echoue et l'utilisateur est informe par toast.
- Le push automatique suppose une branche upstream deja configuree.
- Les commits sont generiques et regroupent tous les changements presents sous `docsFolder` au moment de la sauvegarde, y compris des changements documentaires faits hors UI mais non encore committes.
- La normalisation du toast ne serialise pas encore les autocommits concurrents ; elle rend seulement l'erreur comprehensible et actionnable.
