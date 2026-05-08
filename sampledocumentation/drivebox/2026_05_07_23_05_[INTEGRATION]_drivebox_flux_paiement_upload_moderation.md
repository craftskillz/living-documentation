---
**date:** 2026-05-07
**status:** To be validated
**description:** Flux DriveBox du parcours client depuis l'upload media jusqu'a la moderation, au paiement Stripe ou facture et au demarrage de campagne.
**tags:** drivebox, stripe, payment-intent, upload, s3, moderation, campaign, customer, preauthorization, dashboard
---

# DriveBox - Flux paiement, upload et moderation

## Contexte

Le parcours client DriveBox permet a un annonceur de charger un media publicitaire, de lancer une campagne et de payer selon un flux controle. Le media reste lie a une campagne et la moderation humaine intervient avant la diffusion effective sur les tablettes taxi.

Ce document a ete cree dans le workspace MCP living-documentation actuellement connecte, a partir du depot externe confirme par l'utilisateur : `/Users/ymedaghri/Documents/Repositories/Medialaoui/aws_drivebox_version/drivebox`.

## Flux principal

1. Le client arrive sur le parcours `/customer` et charge son fichier publicitaire.
2. Si le client n'est pas authentifie, DriveBox le dirige vers un flux de connexion ou creation de compte Cognito.
3. Une fois authentifie, le client lance la campagne depuis l'interface customer.
4. DriveBox presente une validation legale qui responsabilise le client sur le contenu diffuse.
5. Le client choisit une methode de paiement : facture par email ou Stripe avec preautorisation.
6. Une demande de moderation est creee pour validation humaine dans le backoffice.
7. Si la moderation valide la campagne, le paiement est finalise et la campagne demarre dans les taxis.
8. Si la moderation refuse la campagne, le client recoit un rejet motive et doit modifier ou recreer sa campagne.

## Paiement par facture

Dans le mode facture :

- Le client accepte le contrat legal.
- Le backoffice modere la campagne.
- En cas de validation, une facture ou un lien de paiement est envoye par email.
- Apres paiement, la campagne demarre et le client accede au dashboard de statistiques.

## Paiement Stripe

Dans le mode Stripe :

- Le client accepte le contrat legal.
- DriveBox redirige vers ou integre Stripe pour la saisie carte.
- Stripe effectue une preautorisation avant la moderation finale.
- En cas de validation, DriveBox capture ou debite le paiement.
- En cas de refus, la preautorisation est invalidee et le client recoit le motif de rejet.

## Stockage media

Les fichiers volumineux sont stockes dans S3. Le bucket est declare via Amplify Storage et rattache a la stack Amplify Gen 2. Les operations d'upload sont encadrees par le backend et l'authentification, afin d'eviter un upload public non controle.

## Backoffice et statistiques

Le backoffice pilote la moderation des campagnes et donne de la visibilite sur les campagnes, devices et impressions. Apres demarrage de campagne, le client peut consulter un dashboard avec les statistiques de diffusion.