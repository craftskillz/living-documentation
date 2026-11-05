---
type: ADR
title: Limiter l'application à la machine locale
description: Le serveur écoute sur 127.0.0.1 et une garde Host/Origin protège toute l'application, car elle n'a pas d'authentification et lit des fichiers sensibles ; aucune option ne permet de l'exposer.
tags:
  - securite
  - serveur
  - reseau
  - dns-rebinding
  - mcp
status: To be validated
---

## Contexte

Living Documentation n'a pas d'authentification. Le serveur écoutait pourtant sur toutes les interfaces : depuis le réseau local, on pouvait lire les fichiers du dossier source, `.env` compris, modifier la documentation et appeler `/mcp`. Seul `/api/other-files` était limité à la machine locale.

L'outil est destiné à un usage local. Aucun fichier Docker ou devcontainer du dépôt, ni le README, ni la CLI ne prévoyait d'accès par le réseau.

## Décision

**Le serveur écoute uniquement sur `127.0.0.1`** (`src/server.ts`). Aucune option ne permet de l'exposer.

**La garde `localOnly` passe avant tout le reste** (`src/lib/localRequest.ts`), routes d'API, `/mcp` et fichiers statiques compris. Une requête n'est acceptée que si sa connexion est locale, si son `Host` désigne la machine locale et si son `Origin`, lorsqu'il est présent, désigne ce même hôte. Les autres reçoivent un 403 `not_local`.

Les deux mesures sont nécessaires. L'interface d'écoute écarte le réseau. La garde écarte une page ouverte dans le navigateur de la machine, qui atteint le port local par DNS rebinding ou par une requête vers un autre site.

**Le proxy Vite garde le `Host` du navigateur** sur toutes ses entrées (`src/frontend-svelte/vite.config.ts`). Sinon, en mode dev, le `Host` réécrit ne correspond plus à l'`Origin` `http://localhost:5174` et la requête est refusée.

## Alternatives écartées

- **Option `--host` pour exposer le serveur.** Elle aurait maintenu un second mode, sans authentification, pour un besoin que rien n'atteste.
- **Garde seule, sans changer l'interface d'écoute.** Le port serait resté ouvert sur le réseau.

## Conséquences

- Un usage depuis le réseau ou en conteneur avec port mappé ne fonctionne plus. Un paquet déjà publié peut avoir de tels utilisateurs : ce changement est signalé dans les README.
- Une URL en `[::1]` ne répond plus, le serveur n'écoutant qu'en IPv4. Les clients qui utilisent `localhost` et essaient les deux adresses continuent de fonctionner : contrôlé avec le proxy Vite et les tests MCP du dépôt, pas avec les clients MCP du marché.
- Sur macOS, un autre programme à l'écoute sur toutes les interfaces au même port ne provoque plus forcément `EADDRINUSE` : les deux peuvent coexister. Le conflit reste détecté sur `127.0.0.1`.
- Une page d'un autre site peut encore déclencher un `GET` sans `Origin` (image, navigation). Elle ne peut pas en lire la réponse par script, mais une image de `/images` ou `/files` peut s'afficher sur cette page.

## Documents liés

- [Explorateur ordonné par manifeste liv-doc-main.md](./2026_10_14_13_00_[NAVIGATION]_explorateur_ordonne_par_manifeste_liv_doc_main.md) : sécurité de `/api/other-files`, désormais couverte par cette garde pour sa partie réseau.
