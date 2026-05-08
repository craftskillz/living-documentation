---
**date:** 2026-05-07
**status:** To be validated
**description:** Vue systeme DriveBox decrivant les acteurs, le frontend Next.js, le backend Amplify Gen 2, les services AWS et les integrations externes.
**tags:** drivebox, nextjs, amplify-gen2, cognito, appsync, dynamodb, s3, stripe, tinymdm, tablet
---

# DriveBox - Vue systeme et frontieres

## Contexte

DriveBox est une application SaaS de gestion de campagnes publicitaires diffusees sur des tablettes taxi. Le projet cible repose sur Next.js 16, AWS Amplify Gen 2, AppSync, DynamoDB, S3, Cognito, Stripe, Tailwind et shadcn/ui.

Ce document a ete cree dans le workspace MCP living-documentation actuellement connecte, a partir du depot externe confirme par l'utilisateur : `/Users/ymedaghri/Documents/Repositories/Medialaoui/aws_drivebox_version/drivebox`.

## Acteurs

- Client annonceur : cree une campagne, charge un media, accepte les conditions, paie ou preautorise le paiement, puis consulte les statistiques.
- Administrateur backoffice : modere les campagnes, supervise les devices, les comptes device, les impressions et les sessions tablette.
- Tablette taxi : affiche l'interface kiosque `/tablet`, diffuse les campagnes approuvees et enregistre les impressions.
- Operateur ou solution MDM : gere les tablettes physiques via TinyMDM.

## Systeme applicatif

DriveBox expose une application Next.js organisee en zones fonctionnelles :

- `/customer` pour le parcours client annonceur.
- `/backoffice` pour l'administration, la moderation, les devices, les campagnes et les impressions.
- `/tablet` pour l'experience kiosque tablette.
- `/api/...` pour les routes serveur qui protegent les secrets et orchestrent les appels externes.

Amplify est configure cote frontend avec `amplify_outputs.json`. Le backend est declare en TypeScript dans Amplify Gen 2, avec `amplify/backend.ts` comme point central des ressources.

## Backend et donnees

Le backend DriveBox utilise :

- Cognito pour l'authentification et les groupes d'acces, notamment le groupe `tablet` pour les tablettes.
- AppSync GraphQL via Amplify Data pour les modeles applicatifs et les mutations.
- DynamoDB comme stockage des modeles, caches et journaux : campagnes, paiements, devices complementaires, impressions, caches meteo/news.
- S3 pour les medias de campagne et autres fichiers volumineux.

## Integrations externes

DriveBox interagit avec plusieurs services externes :

- Stripe pour les paiements, preautorisations et debits apres validation.
- TinyMDM pour la liste et l'etat live des tablettes, consommes via routes API Next.js afin de ne jamais exposer les cles au navigateur.
- Open-Meteo pour la meteo tablette, avec cache DynamoDB par ville.
- newsdata.io pour les actualites tablette, avec cache DynamoDB par pays et langue.
- BigDataCloud pour le reverse geocoding cote navigateur, complete par un fallback local Haversine.

## Frontieres de securite

Les secrets serveur restent cote Next.js API routes ou environnement Amplify. Le navigateur client n'appelle pas directement TinyMDM ni les services qui requierent des secrets. Les tablettes utilisent Cognito avec un compte email/mot de passe dedie au groupe `tablet`, avec session persistante dans le navigateur kiosque.