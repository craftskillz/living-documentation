---
`🗄️ ADR : 2026_04_08_12_00_[FRONTEND]_new_document_creation_modal_with_folder_browser.md`
**date:** 2026-04-08
**status:** SuperSeeded by 2026_04_12_[SIDEBAR]_creation_dossier_icones_font_awesome_et_dossiers_vides_dans_le_drawer
**description:** Ajout d'un bouton + à côté du compteur de documents dans la barre latérale qui ouvre une modale de création de document, avec des champs titre/catégorie, un explorateur de dossiers intégré limité à docsFolder, la création de nouveaux dossiers, un aperçu en direct du nom de fichier, et un endpoint backend POST /api/documents.
**tags:** frontend, barre-latérale, modale, création-document, explorateur-dossiers, api, documents, nom-fichier, motif, parcourir
---

## Contexte

Il n'existait aucun moyen de créer un nouveau document depuis l'interface de visualisation. Les utilisateurs devaient créer les fichiers manuellement sur le disque, en respectant le motif de nom de fichier configuré, ce qui était source d'erreurs et nécessitait de quitter l'application.

L'en-tête de la barre latérale affichait déjà un compteur de documents (`x documents`), un point d'ancrage naturel pour un point d'entrée de création.

## Décision

Un bouton `+` a été ajouté à droite de la ligne du compteur de documents. Cliquer dessus ouvre une **modale Nouveau document** contenant :

- Un champ **Titre** (obligatoire)
- Un champ **Catégorie** (par défaut `General`)
- **Emplacement**, un affichage en lecture seule du chemin + un bouton **Parcourir** qui déploie un explorateur de dossiers intégré limité à `docsFolder` ; l'explorateur permet de naviguer dans les sous-dossiers et de sélectionner une destination, ou de saisir un nouveau nom de dossier pour le créer à l'enregistrement
- **Aperçu du nom de fichier généré**, mis à jour en direct au fur et à mesure que l'utilisateur saisit du texte, utilisant la même logique de substitution que le serveur (`YYYY`, `MM`, `DD`, `HH`, `mm`, `[Category]`, le slug du titre)
- Un bouton **Créer**, qui appelle `POST /api/documents`, rafraîchit la barre latérale et ouvre immédiatement le nouveau document

Le endpoint `POST /api/documents` a été ajouté à `src/routes/documents.ts`. Il :

- Accepte `{ title, category, folder }` dans le corps de la requête
- Résout le répertoire cible dans `docsPath` (garde-fou contre la traversée de chemin)
- Crée les sous-dossiers manquants avec `fs.mkdirSync({ recursive: true })`
- Génère le nom de fichier via `buildFilename()` en utilisant la date et l'heure actuelles
- Retourne un 409 si un fichier portant le même nom existe déjà
- Écrit le fichier avec un en-tête `# Title` comme contenu initial
- Retourne les métadonnées du nouveau document (id, nom de fichier, dossier, catégorie, date)

Appuyer sur Entrée dans les champs titre/catégorie soumet le formulaire ; Échap ferme la modale.

## Conséquences

### AVANTAGES

- Les documents peuvent être créés depuis l'interface utilisateur sans toucher manuellement au système de fichiers
- Le nom de fichier est toujours correctement formaté selon le motif configuré
- L'explorateur de dossiers réutilise le endpoint existant `/api/browse`, sans nouvelle surface backend
- Les nouveaux dossiers sont créés de manière paresseuse à l'enregistrement du document, pas de manière spéculative

### INCONVÉNIENTS

- L'aperçu en direct du nom de fichier est calculé côté client et doit rester synchronisé avec la logique `buildFilename()` côté serveur — deux implémentations de la même substitution
- L'explorateur n'est pas contraint côté serveur à `docsFolder` ; la contrainte n'est appliquée que sur le garde-fou de traversée de chemin du POST