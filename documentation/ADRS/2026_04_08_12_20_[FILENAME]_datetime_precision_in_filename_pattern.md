---
`🗄️ ADR : 2026_04_08_12_20_[FILENAME]_datetime_precision_in_filename_pattern.md`
**date:** 2026-04-08
**status:** Accepted
**description:** Extension du motif de nom de fichier par défaut de YYYY_MM_DD à YYYY_MM_DD_HH_mm pour permettre à plusieurs documents par jour de coexister sans conflit de nommage, tout en préservant la rétrocompatibilité avec les fichiers YYYY_MM_DD existants.
**tags:** filename, pattern, datetime, parser, config, rétrocompatibilité, HH, mm, date, documents
---

## Contexte

Le motif par défaut précédent `YYYY_MM_DD_[Category]_title` n'offrait qu'une granularité au niveau du jour. Les utilisateurs créant plusieurs documents le même jour avec des titres similaires pouvaient rencontrer des conflits de nom de fichier, et n'avaient aucun moyen de distinguer temporellement les documents au sein d'une même journée.

## Décision

Le `filenamePattern` par défaut a été modifié de `YYYY_MM_DD_[Category]_title` à `YYYY_MM_DD_HH_mm_[Category]_title` dans l'ensemble du code source :

- **`src/lib/config.ts`** — valeur par défaut mise à jour
- **`src/lib/parser.ts`** — deux nouveaux jetons `HH` et `mm` détectés via `/HH.*mm/` ; lorsqu'ils sont présents, le groupe de capture de date devient `(\d{4}_\d{2}_\d{2}(?:_\d{2}_\d{2})?)`, la portion horaire est **optionnelle** afin que les anciens fichiers `YYYY_MM_DD` continuent d'être reconnus ; `dateStrToISO()` convertit `YYYY_MM_DD_HH_mm` → `YYYY-MM-DDTHH:MM` et `YYYY_MM_DD` → `YYYY-MM-DD` ; `formatDate()` ajoute l'heure lorsqu'elle est présente
- **`src/routes/documents.ts`** — `buildFilename()` substitue désormais `HH` et `mm` à partir de `new Date()` au moment de la création
- **`src/frontend/index.html`** — l'aperçu en direct du nom de fichier dans la fenêtre modale Nouveau Document inclut les heures et les minutes
- **`src/frontend/admin.html`** — exemples d'aperçu du motif, `buildPatternsFromFormat`, `parsePreview`, chaînes de substitution et de secours, tous mis à jour
- **`README.md`, `CLAUDE.md`, `memory/project_overview.md`** — documentation mise à jour avec le nouveau format et des exemples
- **Tous les fichiers ADR existants** — renommés pour inclure `HH_mm` et leurs références internes `🗄️ ADR :` dans le frontmatter mises à jour en conséquence

## Conséquences

### AVANTAGES

- Plusieurs documents créés le même jour sont naturellement ordonnés et distinguables
- Rétrocompatibilité totale : les fichiers `YYYY_MM_DD` existants sont analysés correctement sans aucune migration
- L'heure est capturée au moment réel de la création, reflétant le moment où le document a véritablement été rédigé

### INCONVÉNIENTS

- Les noms de fichiers sont plus longs et légèrement moins lisibles au premier coup d'œil
- Le groupe horaire optionnel dans l'expression régulière ajoute une petite complexité à l'analyseur syntaxique
- Les utilisateurs ayant personnalisé leur `filenamePattern` en `YYYY_MM_DD_...` ne sont pas migrés automatiquement — ils doivent mettre à jour leur `.living-doc.json` manuellement