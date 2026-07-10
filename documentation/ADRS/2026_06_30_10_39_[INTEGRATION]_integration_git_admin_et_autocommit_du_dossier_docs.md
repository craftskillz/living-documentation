---
type: ADR
title: Integration Git Admin Et Autocommit Du Dossier Docs
description: Ajoute une integration Git configurable dans Admin qui commit automatiquement les changements de docsFolder apres les sauvegardes Living Documentation et expose son etat via /api/git/status.
tags:
  - git
  - admin
  - autocommit
  - docsFolder
  - gitIntegration
  - gitAutoCommitMiddleware
  - gitStatus
  - persistentToast
  - .living-doc.json
  - push
timestamp: 2026-06-30T10:39:00Z
status: To be validated
sources:
  - path: src/lib/config.ts
    hash: 61eac4ad502a751b72a82bc394603dfee75540e1dbb74fa4037d1186dc41ebe0
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/lib/git-integration.ts
    hash: d22e2f86218e8e4595df13981996a6db7bdbfaa86f9b96bdcc8b992dc3723651
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/routes/git.ts
    hash: bf4be80f5dba6f0919344d501d157bc56ef2a66579590179dbf2f048b6c29012
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/routes/config.ts
    hash: cbe48bdb04a8d8d9a3272fb1379c10c2a208f454e9b1e811e32a5b1a267eb30b
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/server.ts
    hash: 8cd2c28e9c81749a00f070272fbf591e06d2c29a7713c8d9e794e6601b308f47
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/frontend-svelte/src/routes/Admin.svelte
    hash: 3ab0a8ca4166edee93d668781045dd6047247fc400c5f32b5c87d6fadafacf20
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/frontend-svelte/src/App.svelte
    hash: e8ec223aa1da893874ef14b4aa9873b1314269481ac36555606fe9dcd390f7a5
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/frontend-svelte/src/lib/gitToast.ts
    hash: 856dc6285397e140f59adda3fc3e6604ccab384bf1fb9e34e102fded0e58fa23
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/frontend-svelte/src/lib/persistentToast.ts
    hash: 5f43913a980ef8f6ad33f64ac84431b6315c3f9361bf0919c2bd9e85baceb962
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/frontend-svelte/src/styles/app.css
    hash: f0fada89775681970a749e81a961858e91eb938d8d75ca3651d3455d699e4da4
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/frontend-svelte/public/i18n/fr.json
    hash: 77d39d0a9c08582f8ec437c90323acd513a5f618132d0d0950646ee2ed497dee
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
  - path: src/frontend-svelte/public/i18n/en.json
    hash: e1a8700c1fcca4d2750783de3c91bbf58bf8ae2e4cc465b9252f7dc0e8ba42c3
    commit: dfc6f86d33a6cdad76589113262ef2f63369004a
    dirty: true
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
