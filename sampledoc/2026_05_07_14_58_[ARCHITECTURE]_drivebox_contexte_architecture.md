---
**date:** 2026-05-07
**status:** To be validated
**description:** Synthese source pour generer un diagramme de contexte DriveBox a partir de la documentation et du code du projet exemple.
**tags:** drivebox, context-diagram, nextjs, amplify, cognito, appsync, dynamodb, s3, stripe, tinymdm
---

# DriveBox - contexte architecture

## Systeme decrit

DriveBox est une application SaaS de gestion de campagnes publicitaires diffusees sur des tablettes installees dans des taxis.

Le systeme central est l'application DriveBox, construite avec Next.js 16 et AWS Amplify Gen 2. Elle couvre trois surfaces principales :

- le tunnel client pour creer une campagne, payer et uploader un media publicitaire ;
- le backoffice administrateur pour moderer les campagnes, consulter les impressions et gerer les tablettes ;
- l'interface kiosque tablette qui affiche les widgets voyageurs et diffuse les publicites validees.

## Utilisateurs et roles

- Client annonceur : cree une campagne, depose un media, paie via Stripe et consulte le statut de sa campagne.
- Administrateur : modere les campagnes, approuve ou refuse les contenus, capture ou annule la preautorisation Stripe, consulte les devices et les impressions.
- Tablette taxi : terminal authentifie dans le groupe Cognito `tablet`, selectionne son identifiant TinyMDM et affiche les campagnes actives.
- Passager taxi : voit les publicites et les widgets d'information sur la tablette, sans interagir avec le backoffice.

## Systemes externes et services cloud

- AWS Cognito gere l'authentification DriveBox, les groupes `admin` et `tablet`, Google SSO pour les humains et email/mot de passe pour les tablettes.
- AWS AppSync expose l'API GraphQL generee par Amplify Gen 2.
- Amazon DynamoDB stocke notamment `PaymentIntent`, `Campaign`, `Device`, `Impression`, `WeatherCache` et `NewsCache`.
- Amazon S3 stocke les medias publicitaires ; les uploads et downloads utilisent des URLs presignees.
- Stripe gere la preautorisation et la capture manuelle du paiement apres moderation.
- TinyMDM est la source de verite des appareils et comptes tablettes ; DriveBox l'appelle via des routes API serveur.
- open-meteo fournit la meteo affichee sur tablette avec cache DynamoDB.
- newsdata.io fournit les actualites affichees sur tablette avec cache DynamoDB.
- BigDataCloud fournit le reverse geocoding GPS vers ville/pays cote navigateur tablette.

## Relations principales

- Le client annonceur utilise DriveBox pour creer une campagne, preautoriser le paiement Stripe et uploader le media vers S3 via une URL presignee.
- L'administrateur utilise DriveBox pour moderer les campagnes, capturer ou annuler le paiement Stripe, consulter TinyMDM et analyser les impressions.
- La tablette taxi utilise DriveBox pour recuperer les campagnes actives, telecharger les medias depuis S3 via URL presignee, afficher les publicites et enregistrer les impressions.
- DriveBox utilise Cognito pour authentifier les clients, administrateurs et tablettes.
- DriveBox lit et ecrit les donnees metier via AppSync, qui persiste dans DynamoDB.
- DriveBox appelle TinyMDM, open-meteo, newsdata.io et BigDataCloud pour enrichir l'experience tablette et backoffice.
