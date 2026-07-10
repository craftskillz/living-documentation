---
type: ADR
title: Revert Vendoring Tailwind And Font Awesome Proxy Access Restored
description: Revert intégral du vendoring local de Tailwind Play CDN et Font Awesome 6.7.2 décidé dans l'ADR 2026_05_12_11_06 , la contrainte proxy bloquant `cdn.tailwindcss.com` et les binaires `.woff2` de `cdnjs.cloudflare.com` ayant été levée côté infrastructure utilisateur, le frontend retourne à charger ces assets depuis leurs CDN d'origine, allège le tarball npm de ~1,5 Mo et supprime la dette de mise à jour manuelle des bundles vendorés.
tags:
  - packaging
  - revert
  - supersede
  - tailwind
  - font-awesome
  - proxy
  - cdn
  - cdnjs
  - play-cdn
  - npx
  - vendor
  - license-mit
  - license-ofl
  - license-cc-by
  - socket-alerts
timestamp: 2026-05-12T19:03:00Z
status: Accepted
sources:
  - path: src/frontend/admin.html
    hash: f86eb9f2f82e3c54185880510323a3c90a43bf4f54f24d83f845417578605dfd
  - path: src/frontend/context.html
    hash: 420e6bfc84ee50c0ab6dc06c344e4e17e359829184e35398be81013330d71e22
  - path: src/frontend/diagram.html
    hash: 4cb4ab14b4760e05812a10838f0083c6a193b50c944011c3b5d8045efdf39b4f
  - path: src/frontend/index.html
    hash: bcd709066a7453e82ae76b1810caac255358089a3e90fe2526daa9f7d9f19332
  - path: src/frontend/shape-editor.html
    hash: 703bffc8000e54af479e91269c18ca4013fa43c669d253ed0b41db15c88475f1
  - path: src/frontend/export.js
    hash: 44b739a3928f87a2406543d361c7e40840ea6faf2122f594717b50eef9099a74
---

# Revert vendoring Tailwind et Font Awesome , accès CDN rétabli

## Contexte

L'ADR [`2026_05_12_11_06_[PACKAGING]_vendor_tailwind_play_cdn_and_font_awesome_locally_for_offline_and_proxy_resilience`](?doc=ADRS%252F2026_05_12_11_06_%255BPACKAGING%255D_vendor_tailwind_play_cdn_and_font_awesome_locally_for_offline_and_proxy_resilience) avait décidé de vendorer localement :

- Le bundle Tailwind Play CDN base (`src/frontend/vendor/tailwindcss.js`) et le bundle avec le plugin Typography (`src/frontend/vendor/tailwindcss-typography.js`), référencés par `admin.html`, `context.html`, `diagram.html`, `index.html`, `shape-editor.html` et par le template HTML d'export PDF généré par `export.js`.
- Le pack complet Font Awesome 6.7.2 (`src/frontend/vendor/font-awesome/css/all.min.css` + 4 webfonts woff2 + 4 fallbacks ttf), référencé par `index.html`.

L'objectif était de contourner un proxy d'entreprise qui bloquait `cdn.tailwindcss.com` en entier et filtrait les binaires `.woff2` de `cdnjs.cloudflare.com` (filtrage par type MIME / extension typique des proxys stricts).

La contrainte proxy a été levée côté infrastructure utilisateur. Le vendoring local n'apporte plus de valeur et accumule plusieurs dettes :

- Tarball npm alourdi d'environ 1,5 Mo (Tailwind ~890 Ko, Font Awesome CSS + webfonts ~1 Mo).
- Dette de maintenance : suivre une nouvelle version Tailwind ou Font Awesome impose de re-télécharger les bundles et remplacer les fichiers `vendor/` à la main.
- Couplage non trivial de `export.js` à `window.location.origin` pour contourner le contexte `about:blank` de la fenêtre d'export PDF , complexité spécifique au mode vendoré.
- Alertes Socket.dev sur "URL strings" déclenchées par les milliers d'URLs internes (documentation, error messages, references) embarquées dans les bundles vendorés Tailwind / PostCSS / picomatch , bruit non négligeable en revue de sécurité.

## Décision

Revert intégral des deux commits de vendoring :

- `6d31bdf refactor(Embedding tailwindcss into vendor folder)` annulé par `e09a53a Revert ...`.
- `efb42a6 refactor(Embedding fontawesome into vendor folder)` annulé par `a8d1114 Revert ...`.

Effets sur le code :

- `admin.html` retourne à `<script src="https://cdn.tailwindcss.com"></script>`.
- `context.html`, `diagram.html`, `index.html`, `shape-editor.html` retournent à `<script src="https://cdn.tailwindcss.com?plugins=typography"></script>`.
- `export.js` (template HTML d'export PDF) retourne à `<script src="https://cdn.tailwindcss.com?plugins=typography"></script>` , plus de couplage à `window.location.origin`.
- `index.html` retourne à `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />`.
- `src/frontend/vendor/tailwindcss.js`, `src/frontend/vendor/tailwindcss-typography.js` et `src/frontend/vendor/font-awesome/` supprimés du repo.
- `src/frontend/vendor/wordcloud2.js` reste en place (vendoring antérieur, non concerné).

L'ADR précédent est marqué `SuperSeeded` avec un pointeur explicite vers le présent ADR. Sa "procédure de revert" déjà documentée (section "Comment revenir en arrière") a été exécutée verbatim , c'est exactement ce pour quoi elle avait été écrite.

La piste alternative de migration vers un build Tailwind statique (Tailwind CLI + `@tailwindcss/typography` en devDeps, output dans `vendor/tailwind.css`) reste valide et n'est pas exécutée ici. Elle nécessiterait son propre ADR si entreprise.

## Conséquences

### PROS

- Tarball npm retrouve sa taille d'origine , environ 1,5 Mo économisés.
- Aucune dette de maintenance : Tailwind Play CDN et Font Awesome sur cdnjs servent toujours la version voulue, aucun re-téléchargement manuel.
- `export.js` retrouve son template simple, sans dépendance à `window.location.origin`.
- Alertes Socket.dev "URL strings" disparaissent (les bundles vendorés contenaient des centaines de littéraux URL dans leurs error messages et leur documentation interne, retirés du repo).
- Frontend retourne au comportement "officiel" recommandé par Tailwind (chargement via CDN).

### CONS

- Frontend redevient sensible aux proxys / réseaux qui bloquent `cdn.tailwindcss.com` ou les binaires `.woff2` de `cdnjs.cloudflare.com`. Si un futur poste de travail rencontre cette contrainte, le pattern de vendoring reste documenté tel quel dans l'ADR superseded (la procédure inverse y est explicite section "Comment revenir en arrière").
- Tailwind Play CDN affiche toujours en console `cdn.tailwindcss.com should not be used in production` , limite cosmétique non résolue par ce revert. La voie propre reste la migration vers le build CLI Tailwind.
- 3 dépendances externes au runtime navigateur réintroduites (Tailwind Play CDN, Font Awesome CSS, webfonts Font Awesome). `npx living-ai-documentation` ne fonctionne plus offline. Acceptable car le projet vise un usage en ligne ou via proxy ouvert.
- Reproductibilité fragilisée : Tailwind Play CDN sert toujours sa dernière version, donc l'UI peut subir des micro-régressions si Tailwind publie un breaking change dans Play. Risque historiquement très faible.
