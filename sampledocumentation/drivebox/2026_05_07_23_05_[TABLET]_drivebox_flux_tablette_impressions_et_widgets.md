---
**date:** 2026-05-07
**status:** To be validated
**description:** Flux tablette DriveBox couvrant l'authentification kiosque, l'association TinyMDM, la diffusion media, les impressions et les widgets contextuels.
**tags:** drivebox, tablet, kiosk, cognito, tinymdm, impressions, localStorage, weather, newsdata, open-meteo, geolocation
---

# DriveBox - Flux tablette, impressions et widgets

## Contexte

La page `/tablet` est l'interface kiosque executee sur les tablettes taxi. Elle affiche les campagnes approuvees, journalise les passages publicitaires et affiche des widgets contextuels comme la meteo, les actualites, les lieux touristiques et la traduction.

Ce document a ete cree dans le workspace MCP living-documentation actuellement connecte, a partir du depot externe confirme par l'utilisateur : `/Users/ymedaghri/Documents/Repositories/Medialaoui/aws_drivebox_version/drivebox`.

## Authentification tablette

Les tablettes utilisent Cognito avec un compte email/mot de passe dedie, assigne au groupe Cognito `tablet`. Le middleware Next.js controle l'acces a `/tablet` via le claim `cognito:groups`.

Si une tablette non authentifiee demande `/tablet`, elle est redirigee vers `/login?mode=tablet`. Apres connexion, la session Amplify est persistee dans le navigateur kiosque.

## Association device TinyMDM

TinyMDM est la source de verite pour les tablettes physiques. Comme TinyMDM ne permet pas facilement de personnaliser l'URL kiosque par device, DriveBox stocke l'identifiant TinyMDM dans `localStorage` sous la cle `tablet_device_id`.

Flux de premiere connexion :

1. La tablette ouvre `/tablet`.
2. DriveBox verifie `localStorage.tablet_device_id`.
3. Si l'identifiant est absent, la tablette va sur `/tablet/select-device`.
4. La page interroge `/api/tablet/device`, qui joint en memoire les devices et utilisateurs TinyMDM.
5. L'utilisateur selectionne le device physique.
6. DriveBox stocke l'id dans `localStorage`, enregistre la session tablette, puis revient a `/tablet`.

## Diffusion media et impressions

Chaque passage publicitaire conserve deux traces complementaires :

- le compteur atomique d'impressions sur la campagne ;
- un enregistrement detaille `Impression` avec campagne, device, horodatage et geolocalisation.

Ces mutations sont lancees en parallele pour ne pas bloquer la diffusion. Les impressions detaillees alimentent le backoffice `/backoffice/impressions` et les vues statistiques.

## Sessions tablette

Le modele `Device` conserve l'expiration de session tablette via `session_expires_at`. Le backoffice `/backoffice/devices` combine les donnees live TinyMDM avec les donnees DynamoDB de session, afin d'afficher les expirations proches et anticiper les reconnexions.

## Widgets contextuels

La tablette utilise un hook de geolocalisation partage qui combine GPS navigateur, reverse geocoding BigDataCloud et fallback local Haversine.

- WeatherWidget appelle `/api/tablet/weather`; la route serveur interroge Open-Meteo et met en cache les resultats DynamoDB par ville pendant 6 heures.
- NewsWidget appelle `/api/tablet/news`; la route serveur interroge newsdata.io et met en cache les articles DynamoDB par pays et langue pendant 6 heures, avec fallback anglais.
- TouristicWidget utilise des donnees locales versionnees dans le projet et des images stockees dans `public/touristic`, avec fallback ville/pays.

Les appels qui necessitent des secrets ou une logique serveur passent par des routes API Next.js, pas directement depuis le navigateur.